import { NextResponse } from "next/server";
import {
  FEATURE_KEYS,
  type ChangeDef,
  type FeatureWeights,
  type SceneAnalysis,
  type SceneAnalysisRequest,
} from "@/lib/types";
import { clamp, clamp01, scoreScene } from "@/lib/scoring";
import { requestStructuredJson } from "@/lib/server/openai-json";

export const runtime = "nodejs";

const featureSchema = {
  type: "object",
  additionalProperties: false,
  required: FEATURE_KEYS,
  properties: Object.fromEntries(
    FEATURE_KEYS.map((key) => [key, { type: "number", minimum: 0, maximum: 1 }]),
  ),
};

const sceneAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["changes", "primaryChangeId", "suppressedChangeIds", "reasoningSummary"],
  properties: {
    changes: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "label",
          "description",
          "objectIds",
          "coordinates",
          "features",
          "suggestedAction",
          "noiseCandidate",
        ],
        properties: {
          id: { type: "string", maxLength: 80 },
          label: { type: "string", maxLength: 80 },
          description: { type: "string", maxLength: 180 },
          objectIds: {
            type: "array",
            maxItems: 8,
            items: { type: "string", maxLength: 80 },
          },
          coordinates: {
            type: "object",
            additionalProperties: false,
            required: ["x", "y"],
            properties: {
              x: { type: "number", minimum: 0, maximum: 640 },
              y: { type: "number", minimum: 0, maximum: 420 },
            },
          },
          features: featureSchema,
          suggestedAction: { type: "string", maxLength: 120 },
          noiseCandidate: { type: "boolean" },
        },
      },
    },
    primaryChangeId: { type: "string", maxLength: 80 },
    suppressedChangeIds: {
      type: "array",
      maxItems: 8,
      items: { type: "string", maxLength: 80 },
    },
    reasoningSummary: { type: "string", maxLength: 240 },
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const textOr = (value: unknown, fallback: string, maxLength: number) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback.slice(0, maxLength);

const weightsFrom = (
  value: unknown,
  fallback: FeatureWeights,
): FeatureWeights =>
  FEATURE_KEYS.reduce((weights, key) => {
    const raw = isRecord(value) ? value[key] : undefined;
    weights[key] = typeof raw === "number" && Number.isFinite(raw)
      ? clamp01(raw)
      : fallback[key];
    return weights;
  }, {} as FeatureWeights);

const fallbackAnalysis = (body: SceneAnalysisRequest): SceneAnalysis => {
  const scores = scoreScene(body.scene, body.policy);
  const primary =
    scores.find((score) => score.actionRequired && !score.ignored) ?? scores[0];
  return {
    changes: body.scene.changes,
    primaryChangeId: primary?.id ?? body.scene.changes[0]?.id ?? "",
    suppressedChangeIds: scores
      .filter((score) => score.ignored || score.noiseCandidate)
      .map((score) => score.id),
    reasoningSummary:
      "Local scene analysis used the predefined change library because OpenAI was unavailable or returned invalid output.",
  };
};

const validateAnalysis = (
  value: unknown,
  body: SceneAnalysisRequest,
): SceneAnalysis | null => {
  if (!isRecord(value) || !Array.isArray(value.changes)) {
    return null;
  }

  const candidateById = new Map(body.scene.changes.map((change) => [change.id, change]));
  const validObjectIds = new Set(
    [...body.scene.before.objects, ...body.scene.after.objects].map((object) => object.id),
  );
  const usedIds = new Set<string>();
  const changes: ChangeDef[] = [];

  value.changes.forEach((raw) => {
    if (!isRecord(raw) || typeof raw.id !== "string" || usedIds.has(raw.id)) {
      return;
    }
    const base = candidateById.get(raw.id);
    if (!base) {
      return;
    }
    usedIds.add(base.id);

    const objectIds = Array.isArray(raw.objectIds)
      ? raw.objectIds.filter(
          (id): id is string => typeof id === "string" && validObjectIds.has(id),
        )
      : [];
    const coordinates = isRecord(raw.coordinates)
      ? {
          x:
            typeof raw.coordinates.x === "number"
              ? clamp(raw.coordinates.x, 0, 640)
              : base.coordinates.x,
          y:
            typeof raw.coordinates.y === "number"
              ? clamp(raw.coordinates.y, 0, 420)
              : base.coordinates.y,
        }
      : base.coordinates;
    const suggestedAction = textOr(
      raw.suggestedAction,
      base.suggestedAction ?? "",
      120,
    );

    changes.push({
      ...base,
      label: textOr(raw.label, base.label, 80),
      description: textOr(raw.description, base.description, 180),
      objectIds: objectIds.length ? objectIds : base.objectIds,
      coordinates,
      features: weightsFrom(raw.features, base.features),
      suggestedAction: suggestedAction || undefined,
      noiseCandidate:
        typeof raw.noiseCandidate === "boolean"
          ? raw.noiseCandidate
          : base.noiseCandidate,
    });
  });

  if (!changes.length) {
    return null;
  }

  const ids = new Set(changes.map((change) => change.id));
  const primaryChangeId =
    typeof value.primaryChangeId === "string" && ids.has(value.primaryChangeId)
      ? value.primaryChangeId
      : changes[0].id;
  const suppressedChangeIds = Array.isArray(value.suppressedChangeIds)
    ? value.suppressedChangeIds.filter(
        (id): id is string => typeof id === "string" && ids.has(id),
      )
    : [];

  return {
    changes,
    primaryChangeId,
    suppressedChangeIds,
    reasoningSummary: textOr(value.reasoningSummary, "OpenAI analyzed the scene delta.", 240),
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as SceneAnalysisRequest;
  const fallback = fallbackAnalysis(body);

  const parsed = await requestStructuredJson({
    promptFile: "scene-analysis.md",
    schemaName: "eyevolve_scene_analysis",
    schema: sceneAnalysisSchema,
    input: {
      instruction:
        "Analyze the before/after satellite scene and return the change events EYEVOLVE should display.",
      policy: body.policy,
      scene: {
        id: body.scene.id,
        title: body.scene.title,
        scenarioType: body.scene.scenarioType,
        beforeObjects: body.scene.before.objects,
        afterObjects: body.scene.after.objects,
        projection: body.scene.projection
          ? {
              label: body.scene.projection.label,
              description: body.scene.projection.description,
              objects: body.scene.projection.objects,
            }
          : null,
        candidateChanges: body.scene.changes,
      },
      currentScores: body.candidateScores.map((score) => ({
        id: score.id,
        attentionScore: score.attentionScore,
        actionScore: score.actionScore,
        ignored: score.ignored,
        actionRequired: score.actionRequired,
      })),
      recentHistory: body.recentHistory,
    },
  });

  if (!parsed) {
    return NextResponse.json({ analysis: fallback, engine: "local" });
  }

  const analysis = validateAnalysis(parsed, body);
  if (!analysis) {
    return NextResponse.json({ analysis: fallback, engine: "local" });
  }

  return NextResponse.json({ analysis, engine: "openai" });
}
