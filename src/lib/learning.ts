import {
  FEATURE_KEYS,
  type EvolutionProposal,
  type FeatureWeights,
  type EyevolvePolicy,
  type SceneDef,
} from "./types";
import {
  actionScore,
  attentionScore,
  clamp,
  clamp01,
  createWeights,
  mapWeights,
} from "./scoring";
import { calculateAutonomy } from "./autonomy";

export const LEARNING_RATE = 0.1;
export const MAX_AI_WEIGHT_DELTA = 0.08;

const copyPolicy = (policy: EyevolvePolicy): EyevolvePolicy => ({
  ...policy,
  attentionWeights: { ...policy.attentionWeights },
  actionWeights: { ...policy.actionWeights },
  uncertaintyByDimension: { ...policy.uncertaintyByDimension },
  learnedRules: [...policy.learnedRules],
});

export const initialPolicy = (): EyevolvePolicy => ({
  generation: 1,
  attentionWeights: {
    humanSafety: 0.72,
    urgency: 0.66,
    infrastructure: 0.52,
    environmental: 0.34,
    behavioral: 0.38,
    visualNoise: 0.48,
    wildlifeProximity: 0.28,
  },
  actionWeights: {
    humanSafety: 0.7,
    urgency: 0.68,
    infrastructure: 0.58,
    environmental: 0.26,
    behavioral: 0.28,
    visualNoise: 0.14,
    wildlifeProximity: 0.2,
  },
  actionThreshold: 0.58,
  ignoreThreshold: 0.34,
  confidence: 0.28,
  autonomy: 0.1,
  observationsSeen: 0,
  judgmentsObserved: 0,
  aiAgreements: 0,
  aiCorrections: 0,
  uncertaintyByDimension: {
    humanSafety: 0.72,
    urgency: 0.74,
    infrastructure: 0.82,
    environmental: 0.76,
    behavioral: 0.78,
    visualNoise: 0.62,
    wildlifeProximity: 0.94,
  },
  learnedRules: [],
});

const targetForRank = (index: number, total: number) => {
  if (total <= 1) {
    return 1;
  }
  return 1 - index / (total - 1);
};

const findChange = (scene: SceneDef, id: string) =>
  scene.changes.find((change) => change.id === id);

export const learnFromRanking = (
  policy: EyevolvePolicy,
  scene: SceneDef,
  ranking: string[],
) => {
  const next = copyPolicy(policy);
  ranking.forEach((changeId, index) => {
    const change = findChange(scene, changeId);
    if (!change) {
      return;
    }

    const targetImportance = targetForRank(index, ranking.length);
    const prediction = attentionScore(change, next);
    const error = targetImportance - prediction;

    FEATURE_KEYS.forEach((key) => {
      if (key === "visualNoise") {
        const directionalError = change.noiseCandidate ? -error : error;
        next.attentionWeights[key] = clamp01(
          next.attentionWeights[key] -
            LEARNING_RATE * directionalError * change.features[key],
        );
        return;
      }

      next.attentionWeights[key] = clamp01(
        next.attentionWeights[key] +
          LEARNING_RATE * error * change.features[key],
      );
    });
  });

  return next;
};

export const learnFromActions = (
  policy: EyevolvePolicy,
  scene: SceneDef,
  actionChangeIds: string[],
) => {
  const next = copyPolicy(policy);
  scene.changes.forEach((change) => {
    const targetActionability = actionChangeIds.includes(change.id) ? 1 : 0;
    const prediction = actionScore(change, next);
    const error = targetActionability - prediction;

    FEATURE_KEYS.forEach((key) => {
      if (key === "visualNoise") {
        next.actionWeights[key] = clamp01(
          next.actionWeights[key] -
            LEARNING_RATE * error * change.features[key] * 0.5,
        );
        return;
      }

      next.actionWeights[key] = clamp01(
        next.actionWeights[key] + LEARNING_RATE * error * change.features[key],
      );
    });
  });

  const anyAction = actionChangeIds.length > 0;
  next.actionThreshold = clamp(next.actionThreshold + (anyAction ? -0.02 : 0.02), 0.42, 0.78);

  return next;
};

export const learnFromHumanJudgment = (
  policy: EyevolvePolicy,
  scene: SceneDef,
  ranking: string[],
  actionChangeIds: string[],
) => {
  const ranked = learnFromRanking(policy, scene, ranking);
  const acted = learnFromActions(ranked, scene, actionChangeIds);

  acted.observationsSeen += 1;
  acted.judgmentsObserved += ranking.length + scene.changes.length;
  acted.confidence = clamp01(acted.confidence + 0.07);

  return acted;
};

export const reinforceIgnoredCorrection = (
  policy: EyevolvePolicy,
  scene: SceneDef,
  correctedIds: string[],
) => {
  const next = copyPolicy(policy);
  scene.changes
    .filter((change) => correctedIds.includes(change.id))
    .forEach((change) => {
      next.attentionWeights.visualNoise = clamp01(
        next.attentionWeights.visualNoise + 0.06 * change.features.visualNoise,
      );
      next.ignoreThreshold = clamp(next.ignoreThreshold - 0.025, 0.22, 0.6);
    });
  return next;
};

export const updateUncertainty = (
  policy: EyevolvePolicy,
  scene: SceneDef,
  outcome: "human-training" | "accepted" | "corrected",
) => {
  const next = copyPolicy(policy);
  const rate =
    outcome === "corrected" ? 0.12 : outcome === "accepted" ? -0.08 : -0.05;

  FEATURE_KEYS.forEach((key) => {
    next.uncertaintyByDimension[key] = clamp01(
      next.uncertaintyByDimension[key] + rate * scene.exposure[key],
    );
  });

  return next;
};

const clampDelta = (value: unknown) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return clamp(value, -MAX_AI_WEIGHT_DELTA, MAX_AI_WEIGHT_DELTA);
};

const applyDeltaSet = (
  weights: FeatureWeights,
  deltas: Partial<FeatureWeights> | undefined,
) =>
  FEATURE_KEYS.reduce((next, key) => {
    next[key] = clamp01(weights[key] + clampDelta(deltas?.[key]));
    return next;
  }, {} as FeatureWeights);

export const applyEvolutionProposal = (
  policy: EyevolvePolicy,
  proposal: EvolutionProposal,
  generation: number,
  source: "local" | "openai",
) => {
  const next = copyPolicy(policy);
  next.attentionWeights = applyDeltaSet(
    next.attentionWeights,
    proposal.proposedPolicyDeltas.attention,
  );
  next.actionWeights = applyDeltaSet(
    next.actionWeights,
    proposal.proposedPolicyDeltas.action,
  );

  if (proposal.learnedRule) {
    next.learnedRules = [
      ...next.learnedRules.slice(-5),
      {
        id: `${Date.now()}-${source}-${generation}`,
        generation,
        text: proposal.learnedRule,
        source,
      },
    ];
  }

  next.autonomy = calculateAutonomy(next);
  return next;
};

export const recordAiFeedback = (
  policy: EyevolvePolicy,
  feedback: "accepted" | "corrected" | "autonomous-action",
) => {
  const next = copyPolicy(policy);

  if (feedback === "accepted" || feedback === "autonomous-action") {
    next.aiAgreements += 1;
    next.confidence = clamp01(next.confidence + 0.12);
  } else {
    next.aiCorrections += 1;
    next.confidence = clamp01(next.confidence - 0.1);
  }

  next.observationsSeen += 1;
  next.judgmentsObserved += 1;
  next.autonomy = calculateAutonomy(next);
  return next;
};

export const advanceGeneration = (policy: EyevolvePolicy) => ({
  ...policy,
  generation: policy.generation + 1,
});

export const emptyWeights = () => createWeights(0);

export const sanitizeProposal = (
  proposal: EvolutionProposal,
): EvolutionProposal => ({
  proposedPolicyDeltas: {
    attention: proposal.proposedPolicyDeltas.attention
      ? mapWeights(emptyWeights(), (_, key) =>
          clampDelta(proposal.proposedPolicyDeltas.attention?.[key]),
        )
      : undefined,
    action: proposal.proposedPolicyDeltas.action
      ? mapWeights(emptyWeights(), (_, key) =>
          clampDelta(proposal.proposedPolicyDeltas.action?.[key]),
        )
      : undefined,
  },
  learnedRule: proposal.learnedRule?.slice(0, 180),
  nextLearningObjective: proposal.nextLearningObjective?.slice(0, 160),
  nextScenarioType: proposal.nextScenarioType?.slice(0, 48),
  reasoningSummary: proposal.reasoningSummary.slice(0, 260),
});
