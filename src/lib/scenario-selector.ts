import { FEATURE_KEYS, type EyevolvePolicy, type SceneDef } from "./types";
import { scenes, trainingSceneIds } from "./scenes";

const sceneUncertaintyScore = (policy: EyevolvePolicy, scene: SceneDef) =>
  FEATURE_KEYS.reduce(
    (sum, key) =>
      sum + policy.uncertaintyByDimension[key] * scene.learningTargets[key],
    0,
  );

export const selectNextScene = (
  policy: EyevolvePolicy,
  seenSceneIds: string[],
  suggestedScenarioType?: string,
) => {
  if (!seenSceneIds.includes(trainingSceneIds[0])) {
    return scenes.find((scene) => scene.id === trainingSceneIds[0]) ?? scenes[0];
  }

  if (!seenSceneIds.includes(trainingSceneIds[1])) {
    return scenes.find((scene) => scene.id === trainingSceneIds[1]) ?? scenes[1];
  }

  const unseen = scenes.filter(
    (scene) =>
      !seenSceneIds.includes(scene.id) &&
      !trainingSceneIds.includes(scene.id) &&
      policy.autonomy >= (scene.minimumAutonomy ?? 0),
  );

  const candidates = unseen.length
    ? unseen
    : scenes.filter((scene) => !trainingSceneIds.includes(scene.id));

  return candidates
    .map((scene) => {
      const suggestionBonus =
        suggestedScenarioType && scene.scenarioType === suggestedScenarioType
          ? 0.35
          : 0;
      return {
        scene,
        score: sceneUncertaintyScore(policy, scene) + suggestionBonus,
      };
    })
    .sort((a, b) => b.score - a.score)[0].scene;
};

export const describeUncertainty = (policy: EyevolvePolicy) => {
  const sorted = [...FEATURE_KEYS].sort(
    (a, b) =>
      policy.uncertaintyByDimension[b] - policy.uncertaintyByDimension[a],
  );
  const uncertain = sorted.slice(0, 2);
  const understood = sorted.slice(-2).reverse();

  return { uncertain, understood };
};
