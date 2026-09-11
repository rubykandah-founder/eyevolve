import OpenAI from "openai";
import { NextResponse } from "next/server";
import { FEATURE_KEYS, type EvolutionProposal, type EvolveRequest } from "@/lib/types";
import { MAX_AI_WEIGHT_DELTA, sanitizeProposal } from "@/lib/learning";
import { clamp } from "@/lib/scoring";
import { readPrompt } from "@/lib/server/openai-json";

export const runtime = "nodejs";

const scenarioTypes = [
  "road",
  "fire",
  "flood",
  "wildlife",
  "industrial",
  "none",
] as const;

const proposalSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "proposedPolicyDeltas",
    "learnedRule",
    "nextLearningObjective",
    "nextScenarioType",
    "reasoningSummary",
  ],
  properties: {
    proposedPolicyDeltas: {
      type: "object",
      additionalProperties: false,
      required: ["attention", "action"],
      properties: {
        attention: {
          type: "object",
          additionalProperties: false,
          required: FEATURE_KEYS,
          properties: Object.fromEntries(
            FEATURE_KEYS.map((key) => [
              key,
              { type: "number", minimum: -MAX_AI_WEIGHT_DELTA, maximum: MAX_AI_WEIGHT_DELTA },
            ]),
          ),
        },
        action: {
          type: "object",
          additionalProperties: false,
          required: FEATURE_KEYS,
          properties: Object.fromEntries(
            FEATURE_KEYS.map((key) => [
              key,
              { type: "number", minimum: -MAX_AI_WEIGHT_DELTA, maximum: MAX_AI_WEIGHT_DELTA },
            ]),
          ),
        },
      },
    },
    learnedRule: { type: "string", maxLength: 180 },
    nextLearningObjective: { type: "string", maxLength: 160 },
    nextScenarioType: { type: "string", enum: scenarioTypes },
    reasoningSummary: { type: "string", maxLength: 260 },
  },
};

const fallbackProposal = (request: EvolveRequest): EvolutionProposal => {
  const actionSelected = request.interaction.actionChangeIds.length > 0;
  const correction = request.interaction.kind === "ai-correction";
  const topChangeId = request.interaction.ranking[0];
  const topChange = request.scene.changes.find((change) => change.id === topChangeId);
  const primarySignal = topChange?.features.humanSafety
    ? "public safety"
    : topChange?.features.infrastructure
      ? "infrastructure impact"
      : "attention-worthy changes";

  return {
    proposedPolicyDeltas: {
      attention: {
        humanSafety: actionSelected ? 0.025 : 0.01,
        urgency: actionSelected ? 0.025 : 0.01,
        infrastructure: topChange?.features.infrastructure ? 0.018 : 0,
        environmental: topChange?.features.environmental ? 0.012 : 0,
        behavioral: topChange?.features.behavioral ? 0.012 : 0,
        visualNoise: correction ? 0.018 : 0.01,
        wildlifeProximity: topChange?.features.wildlifeProximity ? 0.02 : 0,
      },
      action: {
        humanSafety: actionSelected ? 0.025 : -0.004,
        urgency: actionSelected ? 0.025 : -0.004,
        infrastructure: actionSelected ? 0.018 : 0,
        environmental: 0,
        behavioral: 0,
        visualNoise: 0,
        wildlifeProximity: topChange?.features.wildlifeProximity && !actionSelected ? -0.01 : 0,
      },
    },
    learnedRule: actionSelected
      ? `Intervention is favored when ${primarySignal} appears with urgency.`
      : `Passive scene changes can be observed without immediate intervention.`,
    nextLearningObjective: "Probe the highest remaining uncertainty with another bounded observation.",
    nextScenarioType:
      request.policy.uncertaintyByDimension.wildlifeProximity > 0.65
        ? "wildlife"
        : "road",
    reasoningSummary:
      "Local evolution engine applied conservative deltas because OpenAI was unavailable or returned invalid output.",
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const validateDeltaSet = (value: unknown) => {
  if (!isRecord(value)) {
    return undefined;
  }

  return Object.fromEntries(
    FEATURE_KEYS.map((key) => {
      const raw = value[key];
      const delta = typeof raw === "number" && Number.isFinite(raw) ? raw : 0;
      return [key, clamp(delta, -MAX_AI_WEIGHT_DELTA, MAX_AI_WEIGHT_DELTA)];
    }),
  );
};

const validateProposal = (value: unknown): EvolutionProposal | null => {
  if (!isRecord(value)) {
    return null;
  }
  const deltas = value.proposedPolicyDeltas;
  if (!isRecord(deltas) || typeof value.reasoningSummary !== "string") {
    return null;
  }

  return sanitizeProposal({
    proposedPolicyDeltas: {
      attention: validateDeltaSet(deltas.attention),
      action: validateDeltaSet(deltas.action),
    },
    learnedRule:
      typeof value.learnedRule === "string" ? value.learnedRule : undefined,
    nextLearningObjective:
      typeof value.nextLearningObjective === "string"
        ? value.nextLearningObjective
        : undefined,
    nextScenarioType:
      typeof value.nextScenarioType === "string" ? value.nextScenarioType : undefined,
    reasoningSummary: value.reasoningSummary,
  });
};

export async function POST(request: Request) {
  const body = (await request.json()) as EvolveRequest;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      proposal: sanitizeProposal(fallbackProposal(body)),
      engine: "local",
    });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const systemPrompt = await readPrompt("policy-evolution.md");
    const response = await client.responses.create(
      {
        model: process.env.OPENAI_MODEL ?? "gpt-5.6-terra",
        input: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: JSON.stringify({
              instruction:
                "Interpret what the user interaction teaches EYEVOLVE. Propose tiny deltas only. Use 0 for dimensions that should not move. Suggest the next learning objective and scenario type from road, fire, flood, wildlife, industrial, or none.",
              policy: body.policy,
              scene: {
                id: body.scene.id,
                title: body.scene.title,
                scenarioType: body.scene.scenarioType,
                changes: body.scene.changes.map((change) => ({
                  id: change.id,
                  label: change.label,
                  features: change.features,
                })),
              },
              currentScores: body.currentScores.map((score) => ({
                id: score.id,
                attentionScore: score.attentionScore,
                actionScore: score.actionScore,
                ignored: score.ignored,
                actionRequired: score.actionRequired,
              })),
              interaction: body.interaction,
              recentHistory: body.historySummary,
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "eyevolve_evolution_proposal",
            strict: true,
            schema: proposalSchema,
          },
        },
      },
      { timeout: 8000 },
    );

    const parsed = JSON.parse(response.output_text);
    const proposal = validateProposal(parsed);
    if (!proposal) {
      throw new Error("Invalid proposal");
    }

    return NextResponse.json({ proposal, engine: "openai" });
  } catch {
    return NextResponse.json({
      proposal: sanitizeProposal(fallbackProposal(body)),
      engine: "local",
    });
  }
}
