import {
  FEATURE_KEYS,
  type ChangeDef,
  type EyevolvePolicy,
  type FeatureKey,
  type FeatureWeights,
  type SceneDef,
  type ScoredChange,
} from "./types";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const clamp01 = (value: number) => clamp(value, 0, 1);

export const createWeights = (value: number): FeatureWeights =>
  FEATURE_KEYS.reduce((weights, key) => {
    weights[key] = value;
    return weights;
  }, {} as FeatureWeights);

export const mapWeights = (
  weights: FeatureWeights,
  mapper: (value: number, key: FeatureKey) => number,
): FeatureWeights =>
  FEATURE_KEYS.reduce((next, key) => {
    next[key] = mapper(weights[key], key);
    return next;
  }, {} as FeatureWeights);

export const dot = (a: FeatureWeights, b: FeatureWeights) =>
  FEATURE_KEYS.reduce((sum, key) => sum + a[key] * b[key], 0);

const positiveKeys = FEATURE_KEYS.filter((key) => key !== "visualNoise");

const normalizedDot = (features: FeatureWeights, weights: FeatureWeights) => {
  const denominator = positiveKeys.reduce((sum, key) => sum + weights[key], 0);
  if (denominator <= 0) {
    return 0;
  }

  const numerator = positiveKeys.reduce(
    (sum, key) => sum + features[key] * weights[key],
    0,
  );

  return numerator / denominator;
};

export const attentionScore = (
  change: ChangeDef,
  policy: EyevolvePolicy,
) => {
  const base = normalizedDot(change.features, policy.attentionWeights);
  const noisePenalty =
    change.features.visualNoise * policy.attentionWeights.visualNoise * 0.55;

  return clamp01(base - noisePenalty);
};

export const actionScore = (change: ChangeDef, policy: EyevolvePolicy) => {
  const base = normalizedDot(change.features, policy.actionWeights);
  const noisePenalty =
    change.features.visualNoise * policy.actionWeights.visualNoise * 0.25;

  return clamp01(base - noisePenalty);
};

export const ignoreScore = (
  change: ChangeDef,
  policy: EyevolvePolicy,
  score = attentionScore(change, policy),
) =>
  clamp01(
    policy.attentionWeights.visualNoise * change.features.visualNoise -
      score * 0.5,
  );

export const scoreChange = (
  change: ChangeDef,
  policy: EyevolvePolicy,
): ScoredChange => {
  const attention = attentionScore(change, policy);
  const action = actionScore(change, policy);
  const ignore = ignoreScore(change, policy, attention);

  return {
    ...change,
    attentionScore: attention,
    actionScore: action,
    ignoreScore: ignore,
    ignored: ignore >= policy.ignoreThreshold,
    actionRequired: action >= policy.actionThreshold,
  };
};

export const scoreScene = (scene: SceneDef, policy: EyevolvePolicy) =>
  scene.changes
    .map((change) => scoreChange(change, policy))
    .sort((a, b) => b.attentionScore - a.attentionScore);

export const percent = (value: number) => `${Math.round(value * 100)}%`;

export const formatScore = (value: number) =>
  `${Math.round(clamp01(value) * 100)}`;
