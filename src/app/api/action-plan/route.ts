import { NextResponse } from "next/server";
import { selectAutonomousActionPlan } from "@/lib/evolution-narrative";
import { requestStructuredJson } from "@/lib/server/openai-json";
import type {
  ActionPlanRequest,
  AutonomousActionKind,
  AutonomousActionPlan,
  ScoredChange,
} from "@/lib/types";

export const runtime = "nodejs";

const actionKinds: AutonomousActionKind[] = [
  "suppress",
  "watch",
  "verify",
  "ticket",
  "notify",
  "escalate",
];

const actionPlanSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "kind",
    "label",
    "headline",
    "description",
    "receiverLabel",
    "receiverRole",
    "bridgeLabel",
    "artifactLabel",
    "artifactValue",
    "artifactNote",
    "stateLabel",
    "completeLabel",
    "steps",
    "transcript",
  ],
  properties: {
    kind: { type: "string", enum: actionKinds },
    label: { type: "string", maxLength: 32 },
    headline: { type: "string", maxLength: 80 },
    description: { type: "string", maxLength: 220 },
    receiverLabel: { type: "string", maxLength: 80 },
    receiverRole: { type: "string", maxLength: 80 },
    bridgeLabel: { type: "string", maxLength: 44 },
    artifactLabel: { type: "string", maxLength: 44 },
    artifactValue: { type: "string", maxLength: 44 },
    artifactNote: { type: "string", maxLength: 140 },
    stateLabel: { type: "string", maxLength: 32 },
    completeLabel: { type: "string", maxLength: 80 },
    steps: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "detail"],
        properties: {
          label: { type: "string", maxLength: 56 },
          detail: { type: "string", maxLength: 150 },
        },
      },
    },
    transcript: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["speaker", "text"],
        properties: {
          speaker: { type: "string", maxLength: 24 },
          text: { type: "string", maxLength: 170 },
        },
      },
    },
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanText = (value: unknown, fallback: string, maxLength: number) =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, maxLength)
    : fallback.slice(0, maxLength);

const actionVerbs = [
  "alert",
  "call",
  "contact",
  "create",
  "dispatch",
  "escalate",
  "file",
  "inspect",
  "isolate",
  "monitor",
  "notify",
  "open",
  "prepare",
  "request",
  "route",
  "schedule",
  "send",
  "stage",
  "suppress",
  "verify",
  "watch",
];

const normalizeText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const startsWithActionVerb = (value: string) => {
  const normalized = normalizeText(value);
  return actionVerbs.some((verb) => normalized === verb || normalized.startsWith(`${verb} `));
};

const actionHeadlineFallback = (
  kind: AutonomousActionKind,
  body: ActionPlanRequest,
  primary: ScoredChange | undefined,
  fallback: AutonomousActionPlan,
) => {
  const candidates = [
    primary?.suggestedAction,
    body.scene.recommendedAction,
    fallback.headline,
  ].filter((candidate): candidate is string => Boolean(candidate?.trim()));

  const command = candidates.find(startsWithActionVerb);
  if (command) {
    return command;
  }

  const service = body.scene.actionService ?? fallback.receiverLabel ?? "service desk";
  switch (kind) {
    case "ticket":
      return `File ${service} ticket`;
    case "notify":
      return `Notify ${service}`;
    case "escalate":
      return `Escalate to ${service}`;
    case "verify":
      return "Request second-pass verification";
    case "watch":
      return "Monitor for the next pass";
    case "suppress":
      return "Suppress as background change";
  }
};

const repairActionHeadline = (
  headline: string,
  kind: AutonomousActionKind,
  body: ActionPlanRequest,
  primary: ScoredChange | undefined,
  fallback: AutonomousActionPlan,
) => {
  const normalizedHeadline = normalizeText(headline);
  const eventTexts = [primary?.label, primary?.description]
    .filter((text): text is string => Boolean(text?.trim()))
    .map(normalizeText);
  const repeatsEvent = eventTexts.some(
    (eventText) =>
      normalizedHeadline === eventText ||
      eventText.startsWith(normalizedHeadline) ||
      normalizedHeadline.startsWith(eventText),
  );

  if (startsWithActionVerb(headline) && !repeatsEvent) {
    return headline;
  }

  return actionHeadlineFallback(kind, body, primary, fallback).slice(0, 80);
};

const repairActionLabel = (label: string, fallback: AutonomousActionPlan) =>
  startsWithActionVerb(label) ? label : fallback.label;

const fallbackPlan = (body: ActionPlanRequest) => {
  const primary = choosePrimary(body);
  return selectAutonomousActionPlan(body.scene, primary);
};

const choosePrimary = (body: ActionPlanRequest): ScoredChange | undefined =>
  body.scores.find((score) => score.id === body.primaryChangeId) ??
  body.scores.find((score) => score.actionRequired && !score.ignored) ??
  body.scores[0];

const validatePlan = (
  value: unknown,
  fallback: AutonomousActionPlan,
  body: ActionPlanRequest,
  primary: ScoredChange | undefined,
): AutonomousActionPlan | null => {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }
  const kind = actionKinds.includes(value.kind as AutonomousActionKind)
    ? (value.kind as AutonomousActionKind)
    : fallback.kind;

  const steps = Array.isArray(value.steps)
    ? value.steps
        .filter(isRecord)
        .slice(0, 5)
        .map((step) => ({
          label: cleanText(step.label, "Prepare action", 56),
          detail: cleanText(step.detail, "Prepare the simulated response.", 150),
        }))
    : [];
  const transcript = Array.isArray(value.transcript)
    ? value.transcript
        .filter(isRecord)
        .slice(0, 6)
        .map((line) => ({
          speaker: cleanText(line.speaker, "EYEVOLVE", 24),
          text: cleanText(line.text, "Simulated action logged.", 170),
        }))
    : [];

  if (steps.length < 2 || transcript.length < 1) {
    return null;
  }

  const rawHeadline = cleanText(value.headline, fallback.headline, 80);

  return {
    kind,
    label: repairActionLabel(cleanText(value.label, fallback.label, 32), fallback),
    headline: repairActionHeadline(rawHeadline, kind, body, primary, fallback),
    description: cleanText(value.description, fallback.description, 220),
    receiverLabel: cleanText(value.receiverLabel, fallback.receiverLabel, 80),
    receiverRole: cleanText(value.receiverRole, fallback.receiverRole, 80),
    bridgeLabel: cleanText(value.bridgeLabel, fallback.bridgeLabel, 44),
    artifactLabel: cleanText(value.artifactLabel, fallback.artifactLabel ?? "Simulated route", 44),
    artifactValue: cleanText(value.artifactValue, fallback.artifactValue ?? "SIM-0000", 44),
    artifactNote: cleanText(
      value.artifactNote,
      fallback.artifactNote ?? "Matched through a safe simulated directory.",
      140,
    ),
    stateLabel: cleanText(value.stateLabel, fallback.stateLabel, 32),
    completeLabel: cleanText(value.completeLabel, fallback.completeLabel, 80),
    steps,
    transcript,
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as ActionPlanRequest;
  const fallback = fallbackPlan(body);
  const primary = choosePrimary(body);

  const parsed = await requestStructuredJson({
    promptFile: "action-plan.md",
    schemaName: "eyevolve_action_plan",
    schema: actionPlanSchema,
    input: {
      instruction:
        "Choose the next simulated action and write the steps/transcript or ticket log for the UI.",
      mode: body.mode,
      policy: body.policy,
      scene: {
        id: body.scene.id,
        title: body.scene.title,
        scenarioType: body.scene.scenarioType,
        recommendedAction: body.scene.recommendedAction,
        actionService: body.scene.actionService,
        projection: body.scene.projection
          ? {
              label: body.scene.projection.label,
              description: body.scene.projection.description,
            }
          : null,
      },
      primaryChange: primary
        ? {
            id: primary.id,
            label: primary.label,
            description: primary.description,
            suggestedAction: primary.suggestedAction,
            attentionScore: primary.attentionScore,
            actionScore: primary.actionScore,
            actionRequired: primary.actionRequired,
            ignored: primary.ignored,
            features: primary.features,
          }
        : null,
      scoredChanges: body.scores.map((score) => ({
        id: score.id,
        label: score.label,
        attentionScore: score.attentionScore,
        actionScore: score.actionScore,
        ignored: score.ignored,
        actionRequired: score.actionRequired,
      })),
    },
  });

  if (!parsed) {
    return NextResponse.json({ plan: fallback, engine: "local" });
  }

  const plan = validatePlan(parsed, fallback, body, primary);
  if (!plan) {
    return NextResponse.json({ plan: fallback, engine: "local" });
  }

  return NextResponse.json({ plan, engine: "openai" });
}
