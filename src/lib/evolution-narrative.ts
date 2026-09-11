import type {
  AutonomousActionPlan,
  EyevolvePolicy,
  FeatureKey,
  SceneDef,
  ScoredChange,
} from "./types";
import { FEATURE_KEYS } from "./types";
import { featureLabel } from "./scenes";

const containsAny = (text: string, terms: string[]) => {
  const lower = text.toLowerCase();
  return terms.some((term) => lower.includes(term));
};

const asText = (change?: ScoredChange) =>
  `${change?.label ?? ""} ${change?.description ?? ""} ${change?.suggestedAction ?? ""}`;

export const selectAutonomousActionPlan = (
  scene: SceneDef,
  actionable?: ScoredChange,
): AutonomousActionPlan => {
  if (!actionable) {
    return {
      kind: "suppress",
      label: "Suppress",
      headline: "No action opened",
      description:
        "EYEVOLVE found changes worth tracking, but none crossed the current action threshold.",
      receiverLabel: "Policy memory",
      receiverRole: "Suppression log",
      bridgeLabel: "Decision trace",
      stateLabel: "Suppressing",
      completeLabel: "Noise suppressed",
      steps: [
        {
          label: "Confirm low actionability",
          detail: "No detected change is strong enough to become outreach.",
        },
        {
          label: "Store suppression pattern",
          detail: "Background changes are folded into the visual-noise policy.",
        },
        {
          label: "Continue monitoring",
          detail: "The next observation remains open for new evidence.",
        },
      ],
      transcript: [
        {
          speaker: "EYEVOLVE",
          text: "No outreach opened. The event is recorded as suppressible background change.",
        },
      ],
    };
  }

  const text = asText(actionable);
  const isFire = containsAny(text, ["fire", "smoke", "flame"]);
  const isBlockage = containsAny(text, [
    "blocked",
    "blocking",
    "obstruction",
    "disabled",
    "stalled",
  ]);
  const isFloodOrUtility =
    scene.scenarioType === "flood" ||
    scene.scenarioType === "industrial" ||
    containsAny(text, ["seepage", "flood", "utility", "inverter", "warehouse"]);
  const isWildlife =
    scene.scenarioType === "wildlife" ||
    containsAny(text, ["bear", "wildlife", "animal"]);
  const shouldEscalate = isFire || (isBlockage && actionable.actionScore > 0.78);

  if (isWildlife && !containsAny(text, ["attacking", "injured", "blocked"])) {
    return {
      kind: "watch",
      label: "Watch",
      headline: "Monitor without dispatch",
      description:
        "Wildlife proximity deserves attention, but EYEVOLVE is choosing restraint until risk increases.",
      receiverLabel: "Next pass",
      receiverRole: "Monitoring loop",
      bridgeLabel: "Observation plan",
      stateLabel: "Monitoring",
      completeLabel: "Watch state opened",
      steps: [
        {
          label: "Mark watch zone",
          detail: "The wildlife-human distance is kept active for comparison.",
        },
        {
          label: "Avoid unnecessary outreach",
          detail: "No dispatch is opened while movement remains ambiguous.",
        },
        {
          label: "Request next evidence",
          detail: "The next observation will test whether proximity becomes danger.",
        },
      ],
      transcript: [
        {
          speaker: "EYEVOLVE",
          text: "Wildlife proximity is important, but not yet actionable.",
        },
        {
          speaker: "MONITOR",
          text: "Watch state opened for the next satellite pass.",
        },
      ],
    };
  }

  if (isFloodOrUtility && !shouldEscalate) {
    return {
      kind: "ticket",
      label: "Ticket",
      headline: "Create inspection ticket",
      description:
        "The scene suggests infrastructure risk, so EYEVOLVE packages evidence for simulated inspection instead of making a call.",
      receiverLabel: scene.actionService ?? "Operations queue",
      receiverRole: "Inspection queue",
      bridgeLabel: "Evidence to ticket",
      stateLabel: "Ticketing",
      completeLabel: "Inspection ticket created",
      steps: [
        {
          label: "Collect evidence",
          detail: "Relevant water, utility, and infrastructure changes are bundled.",
        },
        {
          label: "Write inspection ticket",
          detail: "The simulated ticket describes what changed and why it matters.",
        },
        {
          label: "Route to operations",
          detail: "The ticket is assigned to the correct simulated service queue.",
        },
      ],
      transcript: [
        {
          speaker: "EYEVOLVE",
          text: `Opening an inspection ticket for ${actionable.label.toLowerCase()}.`,
        },
        {
          speaker: "QUEUE",
          text: "Ticket received with satellite context attached.",
        },
      ],
    };
  }

  if (!shouldEscalate && actionable.actionScore < 0.72) {
    return {
      kind: "verify",
      label: "Verify",
      headline: "Request verification",
      description:
        "The change is meaningful, but EYEVOLVE wants more evidence before outreach.",
      receiverLabel: "Verification queue",
      receiverRole: "Second-look request",
      bridgeLabel: "Evidence request",
      stateLabel: "Verifying",
      completeLabel: "Verification requested",
      steps: [
        {
          label: "Hold dispatch",
          detail: "The event is above attention threshold but below confident action.",
        },
        {
          label: "Ask for another pass",
          detail: "A second observation is requested before intervention.",
        },
        {
          label: "Keep exception active",
          detail: "The change stays visible until the next scene confirms or clears it.",
        },
      ],
      transcript: [
        {
          speaker: "EYEVOLVE",
          text: "Requesting verification before intervention.",
        },
        {
          speaker: "REVIEW",
          text: "Second-look request opened.",
        },
      ],
    };
  }

  return {
    kind: shouldEscalate ? "escalate" : "notify",
    label: shouldEscalate ? "Escalate" : "Notify",
    headline: shouldEscalate ? "Contact response service" : "Notify service desk",
    description:
      actionable.suggestedAction ??
      scene.recommendedAction ??
      "EYEVOLVE is opening simulated outreach for the actionable event.",
    receiverLabel: scene.actionService ?? "Service desk",
    receiverRole: "Human receiver",
    bridgeLabel: "Voice to text",
    stateLabel: "Calling",
    completeLabel: shouldEscalate
      ? "Response service confirmed"
      : "Service notification confirmed",
    steps: [
      {
        label: "Find the right service",
        detail: "Matching the detected incident to the correct non-emergency response desk.",
      },
      {
        label: "Prepare the report",
        detail: "Summarizing location, visible hazard, and supporting satellite changes.",
      },
      {
        label: "Open the simulated line",
        detail: "Connecting the prepared context to a fake dispatch transcript.",
      },
      {
        label: "Report the incident",
        detail: "Sending the concise action request and waiting for confirmation.",
      },
    ],
    transcript: [
      {
        speaker: "EYEVOLVE",
        text: `I'm reporting ${actionable.label.toLowerCase()} near the monitored corridor.`,
      },
      {
        speaker: "DISPATCH",
        text: "What kind of obstruction or hazard is visible?",
      },
      {
        speaker: "EYEVOLVE",
        text: "The satellite delta shows an actionable condition with stopped or exposed traffic nearby.",
      },
      {
        speaker: "DISPATCH",
        text: "Understood. We'll dispatch a crew.",
      },
    ],
  };
};

const capabilityTimeline = [
  {
    generation: 2,
    title: "Suppress visual noise",
    description: "Clouds, shadows, and pass-to-pass lighting can be moved into the background.",
  },
  {
    generation: 4,
    title: "Monitor without dispatch",
    description: "Important changes can stay under watch without becoming outreach.",
  },
  {
    generation: 6,
    title: "Open inspection tickets",
    description: "Infrastructure risks can become simulated tickets instead of calls.",
  },
  {
    generation: 8,
    title: "Request verification",
    description: "Ambiguous events can ask for more evidence before action.",
  },
  {
    generation: 10,
    title: "Replay older judgment",
    description: "EYEVOLVE can compare current behavior against an earlier generation.",
  },
];

export const unlockedCapabilities = (generation: number) =>
  capabilityTimeline.filter((capability) => generation >= capability.generation);

export const latestCapabilityUnlock = (
  beforeGeneration: number,
  afterGeneration: number,
) =>
  capabilityTimeline.find(
    (capability) =>
      capability.generation > beforeGeneration &&
      capability.generation <= afterGeneration,
  );

export const knownAndUnsure = (policy: EyevolvePolicy) => {
  const dimensions = FEATURE_KEYS.filter((key) => key !== "visualNoise").sort(
    (a, b) =>
      policy.uncertaintyByDimension[a] - policy.uncertaintyByDimension[b],
  );

  const known = dimensions
    .filter((key) => policy.uncertaintyByDimension[key] <= 0.52)
    .slice(0, 3)
    .map((key) => featureLabel(key).toLowerCase());
  const unsure = [...dimensions]
    .reverse()
    .slice(0, 3)
    .map((key) => featureLabel(key).toLowerCase());

  return {
    known: known.length ? known : [featureLabel(dimensions[0] as FeatureKey).toLowerCase()],
    unsure,
  };
};

export const beforeNowSentence = (
  beforePrimary: ScoredChange | undefined,
  afterPrimary: ScoredChange | undefined,
) => {
  if (!beforePrimary || !afterPrimary) {
    return {
      before: "Before: no stable priority had emerged.",
      now: "Now: EYEVOLVE is waiting for stronger evidence.",
    };
  }

  if (beforePrimary.id !== afterPrimary.id) {
    return {
      before: `Before: ${beforePrimary.label.toLowerCase()} looked like the lead signal.`,
      now: `Now: ${afterPrimary.label.toLowerCase()} is treated as the more important signal.`,
    };
  }

  if (!beforePrimary.actionRequired && afterPrimary.actionRequired) {
    return {
      before: `Before: ${afterPrimary.label.toLowerCase()} looked worth watching.`,
      now: "Now: it crosses the learned action threshold.",
    };
  }

  if (beforePrimary.actionRequired && !afterPrimary.actionRequired) {
    return {
      before: `Before: ${afterPrimary.label.toLowerCase()} might have triggered action.`,
      now: "Now: EYEVOLVE keeps it under watch instead of outreach.",
    };
  }

  return {
    before: `Before: ${afterPrimary.label.toLowerCase()} was already visible.`,
    now: "Now: EYEVOLVE has more context for how to treat it.",
  };
};
