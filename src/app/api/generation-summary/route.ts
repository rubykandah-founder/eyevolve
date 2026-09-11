import { NextResponse } from "next/server";
import {
  knownAndUnsure,
  latestCapabilityUnlock,
  unlockedCapabilities,
} from "@/lib/evolution-narrative";
import { featureLabel } from "@/lib/scenes";
import { requestStructuredJson } from "@/lib/server/openai-json";
import {
  FEATURE_KEYS,
  type GenerationSummary,
  type GenerationSummaryRequest,
} from "@/lib/types";

export const runtime = "nodejs";

const summaryItemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["label", "reason"],
  properties: {
    label: { type: "string", maxLength: 80 },
    reason: { type: "string", maxLength: 120 },
  },
};

const generationSummarySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "headline",
    "lede",
    "mostImportantSignal",
    "usedToThink",
    "nowThinks",
    "capabilityTitle",
    "capabilityDescription",
    "notCritical",
    "keepWatching",
    "understands",
    "stillLearning",
    "ruleCarriedForward",
    "nextObservation",
  ],
  properties: {
    headline: { type: "string", maxLength: 90 },
    lede: { type: "string", maxLength: 180 },
    mostImportantSignal: {
      type: "object",
      additionalProperties: false,
      required: ["label", "description", "action"],
      properties: {
        label: { type: "string", maxLength: 80 },
        description: { type: "string", maxLength: 180 },
        action: { type: "string", maxLength: 120 },
      },
    },
    usedToThink: { type: "string", maxLength: 150 },
    nowThinks: { type: "string", maxLength: 150 },
    capabilityTitle: { type: "string", maxLength: 70 },
    capabilityDescription: { type: "string", maxLength: 150 },
    notCritical: {
      type: "array",
      maxItems: 3,
      items: summaryItemSchema,
    },
    keepWatching: {
      type: "array",
      maxItems: 3,
      items: summaryItemSchema,
    },
    understands: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string", maxLength: 56 },
    },
    stillLearning: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string", maxLength: 56 },
    },
    ruleCarriedForward: { type: "string", maxLength: 170 },
    nextObservation: { type: "string", maxLength: 160 },
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanText = (value: unknown, fallback: string, maxLength: number) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback.slice(0, maxLength);

const cleanItems = (
  value: unknown,
  fallback: { label: string; reason: string }[],
) => {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const items = value
    .filter(isRecord)
    .slice(0, 3)
    .map((item) => ({
      label: cleanText(item.label, "Observed change", 80),
      reason: cleanText(item.reason, "Not enough evidence for action.", 120),
    }));
  return items.length ? items : fallback;
};

const cleanTextArray = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) {
    return fallback;
  }
  const items = value
    .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    .slice(0, 3)
    .map((item) => item.trim().slice(0, 56));
  return items.length ? items : fallback;
};

const fallbackSummary = (body: GenerationSummaryRequest): GenerationSummary => {
  const primary =
    body.scoredAfter.find((change) => change.actionRequired && !change.ignored) ??
    body.scoredAfter[0];
  const background = body.scoredAfter
    .filter((change) => change.id !== primary?.id)
    .filter((change) => change.ignored || change.noiseCandidate || !change.actionRequired)
    .slice(0, 3)
    .map((change) => ({
      label: change.label,
      reason: change.ignored || change.noiseCandidate
        ? "Safe to suppress as background motion or visual noise."
        : "Relevant, but below the current action threshold.",
    }));
  const watching = body.scoredAfter
    .filter((change) => change.id !== primary?.id)
    .filter((change) => !background.some((item) => item.label === change.label))
    .slice(0, 3)
    .map((change) => ({
      label: change.label,
      reason: "Useful signal to keep in view, but not the primary action.",
    }));
  const knowledge = knownAndUnsure(body.event.after);
  const latest = latestCapabilityUnlock(
    body.event.before.generation,
    body.event.after.generation,
  ) ?? unlockedCapabilities(body.event.after.generation).at(-1);
  const uncertain = FEATURE_KEYS.filter((key) => key !== "visualNoise")
    .sort(
      (a, b) =>
        body.event.after.uncertaintyByDimension[b] -
        body.event.after.uncertaintyByDimension[a],
    )
    .slice(0, 2)
    .map((key) => featureLabel(key).toLowerCase());

  return {
    headline: `Learned from ${body.event.sceneTitle}`,
    lede:
      "EYEVOLVE updated what deserves action and what can stay in the background.",
    mostImportantSignal: {
      label: primary?.label ?? "No urgent signal",
      description:
        primary?.description ??
        "No change clearly crossed the current action threshold.",
      action: body.actionPlan.headline,
    },
    usedToThink:
      "Similar visible changes needed more human review before the system acted.",
    nowThinks:
      primary?.actionRequired
        ? `${primary.label} can drive a simulated ${body.actionPlan.label.toLowerCase()} action.`
        : "This scene can be monitored without opening outreach.",
    capabilityTitle: latest?.title ?? "Human-guided learning",
    capabilityDescription:
      latest?.description ??
      "The system is still collecting evidence before unlocking more autonomous behavior.",
    notCritical: background,
    keepWatching: watching.length
      ? watching
      : uncertain.map((label) => ({
          label,
          reason: "This remains an uncertainty target for a future observation.",
        })),
    understands: knowledge.known,
    stillLearning: knowledge.unsure,
    ruleCarriedForward: body.event.learnedRule,
    nextObservation:
      body.event.nextLearningObjective ??
      `Next it will probe ${uncertain.join(" and ")} with another scene.`,
  };
};

const validateSummary = (
  value: unknown,
  fallback: GenerationSummary,
): GenerationSummary | null => {
  if (!isRecord(value) || !isRecord(value.mostImportantSignal)) {
    return null;
  }

  return {
    headline: cleanText(value.headline, fallback.headline, 90),
    lede: cleanText(value.lede, fallback.lede, 180),
    mostImportantSignal: {
      label: cleanText(
        value.mostImportantSignal.label,
        fallback.mostImportantSignal.label,
        80,
      ),
      description: cleanText(
        value.mostImportantSignal.description,
        fallback.mostImportantSignal.description,
        180,
      ),
      action: cleanText(
        value.mostImportantSignal.action,
        fallback.mostImportantSignal.action,
        120,
      ),
    },
    usedToThink: cleanText(value.usedToThink, fallback.usedToThink, 150),
    nowThinks: cleanText(value.nowThinks, fallback.nowThinks, 150),
    capabilityTitle: cleanText(value.capabilityTitle, fallback.capabilityTitle, 70),
    capabilityDescription: cleanText(
      value.capabilityDescription,
      fallback.capabilityDescription,
      150,
    ),
    notCritical: cleanItems(value.notCritical, fallback.notCritical),
    keepWatching: cleanItems(value.keepWatching, fallback.keepWatching),
    understands: cleanTextArray(value.understands, fallback.understands),
    stillLearning: cleanTextArray(value.stillLearning, fallback.stillLearning),
    ruleCarriedForward: cleanText(
      value.ruleCarriedForward,
      fallback.ruleCarriedForward,
      170,
    ),
    nextObservation: cleanText(
      value.nextObservation,
      fallback.nextObservation,
      160,
    ),
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as GenerationSummaryRequest;
  const fallback = fallbackSummary(body);

  const parsed = await requestStructuredJson({
    promptFile: "generation-summary.md",
    schemaName: "eyevolve_generation_summary",
    schema: generationSummarySchema,
    input: {
      instruction:
        "Write the generation-complete summary for this exact event. Explain the practical learning, not raw metrics.",
      event: {
        generation: body.event.generation,
        sceneTitle: body.event.sceneTitle,
        kind: body.event.summary,
        learnedRule: body.event.learnedRule,
        reasoningSummary: body.event.reasoningSummary,
        nextLearningObjective: body.event.nextLearningObjective,
      },
      scene: {
        id: body.scene.id,
        title: body.scene.title,
        scenarioType: body.scene.scenarioType,
      },
      scoredBefore: body.scoredBefore.map((change) => ({
        id: change.id,
        label: change.label,
        attentionScore: change.attentionScore,
        actionScore: change.actionScore,
        ignored: change.ignored,
        actionRequired: change.actionRequired,
      })),
      scoredAfter: body.scoredAfter.map((change) => ({
        id: change.id,
        label: change.label,
        description: change.description,
        attentionScore: change.attentionScore,
        actionScore: change.actionScore,
        ignored: change.ignored,
        actionRequired: change.actionRequired,
      })),
      actionPlan: body.actionPlan,
      policyAfter: body.event.after,
    },
  });

  if (!parsed) {
    return NextResponse.json({ summary: fallback, engine: "local" });
  }

  const summary = validateSummary(parsed, fallback);
  if (!summary) {
    return NextResponse.json({ summary: fallback, engine: "local" });
  }

  return NextResponse.json({ summary, engine: "openai" });
}
