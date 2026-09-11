import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAutonomy, modeFromAutonomy } from "../../src/lib/autonomy";
import {
  advanceGeneration,
  applyEvolutionProposal,
  learnFromHumanJudgment,
  recordAiFeedback,
  updateUncertainty,
} from "../../src/lib/learning";
import { selectNextScene } from "../../src/lib/scenario-selector";
import { getScene } from "../../src/lib/scenes";
import { scoreScene } from "../../src/lib/scoring";
import { createInitialState } from "../../src/lib/storage";
import type { EvolutionEvent, EvolutionProposal, EyevolveState } from "../../src/lib/types";

class EyevolveLoopE2ETest {
  static runDeterministicEvolutionLoop() {
    let state: EyevolveState = createInitialState();
    assert.equal(state.currentSceneId, "road-obstruction");
    assert.equal(state.currentMode, "human");

    const gen1Scene = getScene(state.currentSceneId);
    const gen1Ranking = [
      "roadkill",
      "swerve-pattern",
      "new-traffic",
      "shadow-change",
      "cloud-shift",
    ];
    let policy = learnFromHumanJudgment(
      state.policy,
      gen1Scene,
      gen1Ranking,
      ["roadkill"],
    );
    policy = updateUncertainty(policy, gen1Scene, "human-training");
    const gen1Proposal: EvolutionProposal = {
      proposedPolicyDeltas: {
        attention: { humanSafety: 0.03, urgency: 0.02, infrastructure: 0.02 },
        action: { urgency: 0.03, infrastructure: 0.02 },
      },
      learnedRule: "Roadway obstructions outrank visual noise.",
      nextLearningObjective: "Test fire and environmental urgency next.",
      nextScenarioType: "fire",
      reasoningSummary: "The human prioritized direct road safety.",
    };
    policy = advanceGeneration(applyEvolutionProposal(policy, gen1Proposal, policy.generation, "local"));
    let seenSceneIds = [gen1Scene.id];
    let nextScene = selectNextScene(policy, seenSceneIds, gen1Proposal.nextScenarioType);

    assert.equal(nextScene.id, "campsite-fire");

    state = {
      ...state,
      policy,
      currentSceneId: nextScene.id,
      seenSceneIds,
      currentMode: seenSceneIds.length < 2 ? "human" : modeFromAutonomy(policy.autonomy),
    };

    const gen2Scene = getScene(state.currentSceneId);
    const gen2Ranking = [
      "unattended-forest-fire",
      "treeline-shadow-potential",
      "ring-fire",
      "new-tents",
      "new-vehicles",
      "bear-moved",
    ];
    policy = learnFromHumanJudgment(
      state.policy,
      gen2Scene,
      gen2Ranking,
      ["unattended-forest-fire"],
    );
    policy = updateUncertainty(policy, gen2Scene, "human-training");
    policy = recordAiFeedback(policy, "accepted");
    policy = {
      ...policy,
      autonomy: calculateAutonomy(policy),
    };
    policy = advanceGeneration(
      applyEvolutionProposal(
        policy,
        {
          proposedPolicyDeltas: {
            attention: { environmental: 0.04, urgency: 0.03 },
            action: { humanSafety: 0.02, urgency: 0.03 },
          },
          learnedRule: "Unattended fire outside a camp zone warrants action.",
          nextLearningObjective: "Test infrastructure and flood readiness next.",
          nextScenarioType: "flood",
          reasoningSummary: "The model reinforced fire urgency.",
        },
        policy.generation,
        "local",
      ),
    );
    seenSceneIds = [...seenSceneIds, gen2Scene.id];
    nextScene = selectNextScene(policy, seenSceneIds, "flood");

    const event: EvolutionEvent = {
      id: "e2e-event",
      generation: 2,
      sceneId: gen2Scene.id,
      sceneTitle: gen2Scene.title,
      summary: "E2E policy evolved from training scenes.",
      learnedRule: "Safety and urgency now drive intervention.",
      reasoningSummary: "Pure e2e test event.",
      engine: "local",
      nextSceneId: nextScene.id,
      nextLearningObjective: `Next, inspect ${nextScene.title}.`,
      before: state.policy,
      after: policy,
      createdAt: new Date(0).toISOString(),
    };

    const scored = scoreScene(nextScene, policy);

    assert.ok(policy.generation >= 3);
    assert.ok(policy.learnedRules.length >= 1);
    assert.ok(["industrial-flood", "levee-seepage", "seasonal-flood-forecast"].includes(nextScene.id));
    assert.ok(scored.length > 0);
    assert.equal(event.nextSceneId, nextScene.id);
    assert.equal(modeFromAutonomy(policy.autonomy), policy.autonomy >= 0.35 ? modeFromAutonomy(policy.autonomy) : "human");
  }
}

describe("EYEVOLVE deterministic e2e loop", () => {
  it("trains, evolves policy, selects the next observation, and records an event", EyevolveLoopE2ETest.runDeterministicEvolutionLoop);
});
