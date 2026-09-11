import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAutonomy, modeFromAutonomy } from "../../src/lib/autonomy";
import {
  applyEvolutionProposal,
  learnFromHumanJudgment,
  updateUncertainty,
} from "../../src/lib/learning";
import { getScene } from "../../src/lib/scenes";
import { actionScore, attentionScore, scoreScene } from "../../src/lib/scoring";
import { createInitialState } from "../../src/lib/storage";

class ScoringLearningFeatureTests {
  static rankingUpdatesAttentionWeights() {
    const scene = getScene("road-obstruction");
    const state = createInitialState();
    const before = state.policy.attentionWeights.infrastructure;

    const learned = learnFromHumanJudgment(
      state.policy,
      scene,
      ["roadkill", "swerve-pattern", "new-traffic", "shadow-change", "cloud-shift"],
      ["roadkill"],
    );

    assert.notEqual(learned.attentionWeights.infrastructure, before);
    assert.ok(learned.judgmentsObserved > state.policy.judgmentsObserved);
  }

  static actionLearningSeparatesActionability() {
    const scene = getScene("campsite-fire");
    const state = createInitialState();
    const fire = scene.changes.find((change) => change.id === "unattended-forest-fire");
    assert.ok(fire);

    const beforeAction = actionScore(fire, state.policy);
    const learned = learnFromHumanJudgment(
      state.policy,
      scene,
      ["unattended-forest-fire", "ring-fire", "treeline-shadow-potential", "new-tents", "new-vehicles", "bear-moved"],
      ["unattended-forest-fire"],
    );
    const afterAction = actionScore(fire, learned);

    assert.ok(afterAction >= beforeAction);
  }

  static visualNoiseSuppressesAttention() {
    const scene = getScene("road-obstruction");
    const state = createInitialState();
    const cloud = scene.changes.find((change) => change.id === "cloud-shift");
    const roadkill = scene.changes.find((change) => change.id === "roadkill");
    assert.ok(cloud);
    assert.ok(roadkill);

    assert.ok(attentionScore(roadkill, state.policy) > attentionScore(cloud, state.policy));
  }

  static aiDeltasAreClamped() {
    const state = createInitialState();
    const evolved = applyEvolutionProposal(
      state.policy,
      {
        proposedPolicyDeltas: {
          attention: { humanSafety: 1, visualNoise: -1 },
          action: { urgency: 1 },
        },
        learnedRule: "Large model deltas are bounded by the app.",
        reasoningSummary: "test",
      },
      state.policy.generation,
      "openai",
    );

    assert.equal(evolved.attentionWeights.humanSafety, state.policy.attentionWeights.humanSafety + 0.08);
    assert.equal(evolved.actionWeights.urgency, state.policy.actionWeights.urgency + 0.08);
    assert.equal(evolved.attentionWeights.visualNoise, state.policy.attentionWeights.visualNoise - 0.08);
  }

  static correctionsCanLowerAutonomy() {
    const state = createInitialState();
    const confident = {
      ...state.policy,
      confidence: 0.8,
      judgmentsObserved: 12,
      aiAgreements: 4,
      aiCorrections: 0,
    };
    const corrected = {
      ...confident,
      confidence: 0.55,
      aiCorrections: 3,
    };

    assert.ok(calculateAutonomy(corrected) < calculateAutonomy(confident));
    assert.equal(modeFromAutonomy(0.2), "human");
    assert.equal(modeFromAutonomy(0.5), "ai-review");
    assert.equal(modeFromAutonomy(0.75), "exception-management");
    assert.equal(modeFromAutonomy(0.95), "autonomous");
  }

  static uncertaintyMovesWithOutcomes() {
    const scene = getScene("industrial-flood");
    const state = createInitialState();
    const accepted = updateUncertainty(state.policy, scene, "accepted");
    const corrected = updateUncertainty(state.policy, scene, "corrected");

    assert.ok(accepted.uncertaintyByDimension.infrastructure < state.policy.uncertaintyByDimension.infrastructure);
    assert.ok(corrected.uncertaintyByDimension.infrastructure > state.policy.uncertaintyByDimension.infrastructure);
  }

  static scoringSortsByLearnedAttention() {
    const scene = getScene("road-obstruction");
    const state = createInitialState();
    const [top] = scoreScene(scene, state.policy);

    assert.ok(["swerve-pattern", "roadkill"].includes(top.id));
  }
}

describe("Scoring and learning features", () => {
  it("updates attention weights from ranked human judgment", ScoringLearningFeatureTests.rankingUpdatesAttentionWeights);
  it("learns actionability separately from attention", ScoringLearningFeatureTests.actionLearningSeparatesActionability);
  it("penalizes visual noise in attention scoring", ScoringLearningFeatureTests.visualNoiseSuppressesAttention);
  it("clamps OpenAI policy deltas", ScoringLearningFeatureTests.aiDeltasAreClamped);
  it("allows correction to lower autonomy", ScoringLearningFeatureTests.correctionsCanLowerAutonomy);
  it("updates uncertainty from accepted/corrected outcomes", ScoringLearningFeatureTests.uncertaintyMovesWithOutcomes);
  it("sorts change events by learned attention", ScoringLearningFeatureTests.scoringSortsByLearnedAttention);
});
