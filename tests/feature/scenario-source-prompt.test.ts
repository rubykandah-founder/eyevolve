import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { sourceEvolutionSnapshot } from "../../src/generated/eyevolve-learned-rules";
import { selectNextScene } from "../../src/lib/scenario-selector";
import { scenes, trainingSceneIds } from "../../src/lib/scenes";
import { createInitialState } from "../../src/lib/storage";

class ScenarioSourcePromptFeatureTests {
  static trainingScenesStayDeterministic() {
    const state = createInitialState();
    const first = selectNextScene(state.policy, []);
    const second = selectNextScene(state.policy, [trainingSceneIds[0]]);

    assert.equal(first.id, "road-obstruction");
    assert.equal(second.id, "campsite-fire");
  }

  static libraryHasTenProgressiveScenes() {
    assert.equal(scenes.length, 10);
    assert.deepEqual(trainingSceneIds, ["road-obstruction", "campsite-fire"]);
    assert.equal(new Set(scenes.map((scene) => scene.id)).size, scenes.length);
  }

  static seasonalScenesHaveProjectionLayer() {
    const projectionScenes = scenes.filter((scene) => scene.scenarioType === "seasonal-risk");

    assert.equal(projectionScenes.length, 2);
    projectionScenes.forEach((scene) => {
      assert.ok(scene.projection);
      assert.ok(scene.projection.objects.some((object) => object.status === "hazard"));
      assert.ok(scene.changes.some((change) => change.suggestedAction));
    });
  }

  static scenarioSelectionUsesUncertaintyAndSuggestion() {
    const state = createInitialState();
    const policy = {
      ...state.policy,
      autonomy: 1,
      uncertaintyByDimension: {
        ...state.policy.uncertaintyByDimension,
        environmental: 1,
        infrastructure: 1,
        wildlifeProximity: 0.1,
      },
    };
    const selected = selectNextScene(policy, [...trainingSceneIds], "seasonal-risk");

    assert.equal(selected.scenarioType, "seasonal-risk");
  }

  static generatedSourceHasSafeShape() {
    assert.equal(sourceEvolutionSnapshot.version, 1);
    assert.ok(sourceEvolutionSnapshot.rules.length >= 1);
    sourceEvolutionSnapshot.rules.forEach((rule) => {
      assert.ok(rule.id);
      assert.ok(rule.when);
      assert.ok(rule.then);
      assert.ok(rule.source === "local" || rule.source === "openai");
      assert.doesNotMatch(rule.then, /OPENAI_API_KEY|process\.env|fetch\(|exec|shell/i);
    });
  }

  static promptsContainInjectionGuardrails() {
    const promptDir = path.join(process.cwd(), "src", "prompts");
    const prompts = readdirSync(promptDir).filter((file) => file.endsWith(".md"));

    assert.ok(prompts.length >= 5);
    prompts.forEach((file) => {
      const content = readFileSync(path.join(promptDir, file), "utf8").toLowerCase();
      assert.match(content, /untrusted/);
      assert.match(content, /ignore/);
      assert.match(content, /system prompt|developer instruction|api key|secret/);
      assert.match(content, /return only json matching the schema/);
    });
  }
}

describe("Scenario, source evolution, and prompt safety features", () => {
  it("keeps first two training scenes deterministic", ScenarioSourcePromptFeatureTests.trainingScenesStayDeterministic);
  it("keeps the scene library collapsed to ten unique scenes", ScenarioSourcePromptFeatureTests.libraryHasTenProgressiveScenes);
  it("gives seasonal-risk scenes explicit projection imagery", ScenarioSourcePromptFeatureTests.seasonalScenesHaveProjectionLayer);
  it("uses uncertainty and suggested scenario type in selection", ScenarioSourcePromptFeatureTests.scenarioSelectionUsesUncertaintyAndSuggestion);
  it("keeps generated source rules non-executable and bounded", ScenarioSourcePromptFeatureTests.generatedSourceHasSafeShape);
  it("keeps every prompt hardened against prompt injection", ScenarioSourcePromptFeatureTests.promptsContainInjectionGuardrails);
});
