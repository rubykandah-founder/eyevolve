"use client";

import { useEffect, useMemo, useState } from "react";
import { ActivityTrace } from "@/components/ActivityTrace";
import { EvolutionHistory } from "@/components/EvolutionHistory";
import { EvolutionTransition } from "@/components/EvolutionTransition";
import { IntelligencePanel } from "@/components/IntelligencePanel";
import { MissionHeader } from "@/components/MissionHeader";
import { ObservationWorkspace } from "@/components/ObservationWorkspace";
import { PolicyInspector } from "@/components/PolicyInspector";
import { getScene } from "@/lib/scenes";
import { calculateAutonomy, modeFromAutonomy } from "@/lib/autonomy";
import {
  applyEvolutionProposal,
  advanceGeneration,
  learnFromHumanJudgment,
  recordAiFeedback,
  reinforceIgnoredCorrection,
  sanitizeProposal,
  updateUncertainty,
} from "@/lib/learning";
import { selectNextScene } from "@/lib/scenario-selector";
import { scoreScene } from "@/lib/scoring";
import {
  clearState,
  createInitialState,
  loadState,
  saveState,
} from "@/lib/storage";
import type {
  EvolutionEvent,
  EvolutionProposal,
  EvolveResponse,
  EyevolvePolicy,
  EyevolveState,
  InteractionEvent,
} from "@/lib/types";

const nowId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const localProposal = (
  policy: EyevolvePolicy,
  interaction: InteractionEvent,
): EvolutionProposal =>
  sanitizeProposal({
    proposedPolicyDeltas: {
      attention: {
        humanSafety: interaction.actionChangeIds.length ? 0.02 : 0.005,
        urgency: interaction.actionChangeIds.length ? 0.02 : 0.005,
        infrastructure: 0.01,
        environmental: 0,
        behavioral: 0,
        visualNoise:
          interaction.correctionReason === "Should have been ignored"
            ? 0.035
            : 0.01,
        wildlifeProximity:
          policy.uncertaintyByDimension.wildlifeProximity > 0.7 ? 0.01 : 0,
      },
      action: {
        humanSafety: interaction.actionChangeIds.length ? 0.02 : -0.004,
        urgency: interaction.actionChangeIds.length ? 0.02 : -0.004,
        infrastructure: interaction.actionChangeIds.length ? 0.012 : 0,
        environmental: 0,
        behavioral: 0,
        visualNoise: 0,
        wildlifeProximity: 0,
      },
    },
    learnedRule: interaction.actionChangeIds.length
      ? "Action is reinforced when safety, urgency, and infrastructure signals align."
      : "Detected changes can remain visible without becoming interventions.",
    nextLearningObjective:
      "Select the next observation from the highest remaining uncertainty.",
    nextScenarioType:
      policy.uncertaintyByDimension.wildlifeProximity > 0.68
        ? "wildlife"
        : "road",
    reasoningSummary:
      "Local fallback generated conservative policy deltas and preserved the deterministic learning loop.",
  });

async function requestEvolution(
  policy: EyevolvePolicy,
  sceneId: string,
  interaction: InteractionEvent,
  state: EyevolveState,
): Promise<EvolveResponse> {
  const scene = getScene(sceneId);
  const currentScores = scoreScene(scene, policy);
  try {
    const response = await fetch("/api/evolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policy,
        scene,
        currentScores,
        interaction,
        historySummary: state.evolutionHistory.slice(-4).map((event) => event.summary),
      }),
    });

    if (!response.ok) {
      throw new Error("Evolution request failed");
    }

    return (await response.json()) as EvolveResponse;
  } catch {
    return {
      proposal: localProposal(policy, interaction),
      engine: "local",
    };
  }
}

export default function Home() {
  const [state, setState] = useState<EyevolveState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [ranking, setRanking] = useState<string[]>([]);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [hoveredChangeId, setHoveredChangeId] = useState<string | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("Wrong priority");
  const [isEvolving, setIsEvolving] = useState(false);
  const [transitionEvent, setTransitionEvent] = useState<EvolutionEvent | null>(
    null,
  );
  const [engineLabel, setEngineLabel] = useState("LOCAL EVOLUTION ENGINE");

  useEffect(() => {
    const loaded = loadState();
    setState(loaded);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveState(state);
    }
  }, [hydrated, state]);

  const scene = useMemo(() => getScene(state.currentSceneId), [state.currentSceneId]);
  const scores = useMemo(
    () => scoreScene(scene, state.policy),
    [scene, state.policy],
  );

  useEffect(() => {
    setRanking(scene.changes.map((change) => change.id));
    setSelectedActionIds([]);
    setHoveredChangeId(null);
    setIsCorrecting(false);
  }, [scene.id, scene.changes]);

  const highlightedObjectIds = useMemo(() => {
    if (!hoveredChangeId) {
      return [];
    }
    return scene.changes.find((change) => change.id === hoveredChangeId)?.objectIds ?? [];
  }, [hoveredChangeId, scene.changes]);

  const moveRank = (changeId: string, direction: -1 | 1) => {
    setRanking((current) => {
      const index = current.indexOf(changeId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) {
        return current;
      }
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const toggleAction = (changeId: string) => {
    setSelectedActionIds((current) =>
      current.includes(changeId)
        ? current.filter((id) => id !== changeId)
        : [...current, changeId],
    );
  };

  const resetEvolution = () => {
    clearState();
    const fresh = createInitialState();
    setState(fresh);
    setTransitionEvent(null);
    setEngineLabel("LOCAL EVOLUTION ENGINE");
  };

  const summarizeEvent = (
    kind: InteractionEvent["kind"],
    nextSceneTitle: string,
    proposal: EvolutionProposal,
  ) => {
    if (kind === "human-training") {
      return `Human judgment updated attention and action policy. EYEVOLVE selected ${nextSceneTitle} next.`;
    }
    if (kind === "ai-correction") {
      return `Human correction reduced trust and bounded the policy update. EYEVOLVE selected ${nextSceneTitle} next.`;
    }
    if (kind === "autonomous-action") {
      return `Simulated intervention completed autonomously. ${proposal.nextLearningObjective}`;
    }
    return `Human accepted AI judgment. EYEVOLVE selected ${nextSceneTitle} next.`;
  };

  const completeEvolution = async (
    kind: InteractionEvent["kind"],
    finalRanking: string[],
    finalActionIds: string[],
    reason?: string,
  ) => {
    if (isEvolving) {
      return;
    }

    setIsEvolving(true);
    const before = state.policy;
    let localPolicy = before;

    if (kind === "human-training") {
      localPolicy = learnFromHumanJudgment(
        before,
        scene,
        finalRanking,
        finalActionIds,
      );
      localPolicy = updateUncertainty(localPolicy, scene, "human-training");
    } else if (kind === "ai-correction") {
      localPolicy = learnFromHumanJudgment(
        before,
        scene,
        finalRanking,
        finalActionIds,
      );
      localPolicy.aiCorrections = before.aiCorrections + 1;
      localPolicy.aiAgreements = before.aiAgreements;
      localPolicy.confidence = Math.max(0, before.confidence - 0.1);
      if (reason === "Should have been ignored") {
        localPolicy = reinforceIgnoredCorrection(localPolicy, scene, finalRanking.slice(0, 2));
      }
      localPolicy = updateUncertainty(localPolicy, scene, "corrected");
    } else {
      localPolicy = recordAiFeedback(
        before,
        kind === "autonomous-action" ? "autonomous-action" : "accepted",
      );
      localPolicy = updateUncertainty(localPolicy, scene, "accepted");
    }

    localPolicy = {
      ...localPolicy,
      autonomy: calculateAutonomy(localPolicy),
    };

    const interaction: InteractionEvent = {
      id: nowId(),
      generation: before.generation,
      sceneId: scene.id,
      kind,
      ranking: finalRanking,
      actionChangeIds: finalActionIds,
      correctionReason: reason,
      createdAt: new Date().toISOString(),
    };

    const response = await requestEvolution(localPolicy, scene.id, interaction, state);
    const withProposal = applyEvolutionProposal(
      localPolicy,
      response.proposal,
      before.generation,
      response.engine,
    );
    const advancedPolicy = advanceGeneration(withProposal);
    const seenSceneIds = Array.from(new Set([...state.seenSceneIds, scene.id]));
    const nextScene = selectNextScene(
      advancedPolicy,
      seenSceneIds,
      response.proposal.nextScenarioType,
    );
    const nextMode = modeFromAutonomy(advancedPolicy.autonomy);
    const event: EvolutionEvent = {
      id: nowId(),
      generation: before.generation,
      sceneId: scene.id,
      sceneTitle: scene.title,
      summary: summarizeEvent(kind, nextScene.title, response.proposal),
      learnedRule:
        response.proposal.learnedRule ??
        "EYEVOLVE updated its policy from the latest judgment.",
      reasoningSummary: response.proposal.reasoningSummary,
      engine: response.engine,
      nextSceneId: nextScene.id,
      nextLearningObjective: response.proposal.nextLearningObjective,
      before,
      after: advancedPolicy,
      createdAt: new Date().toISOString(),
    };

    setState((current) => ({
      ...current,
      policy: advancedPolicy,
      currentSceneId: nextScene.id,
      seenSceneIds,
      interactionHistory: [...current.interactionHistory, interaction],
      evolutionHistory: [...current.evolutionHistory, event],
      currentMode: nextMode,
    }));
    setTransitionEvent(event);
    setEngineLabel(
      response.engine === "openai"
        ? "AI-ASSISTED EVOLUTION"
        : "LOCAL EVOLUTION ENGINE",
    );
    setIsCorrecting(false);
    setIsEvolving(false);
  };

  const acceptAi = () => {
    const finalRanking = scores.map((score) => score.id);
    const finalActionIds = scores
      .filter((score) => score.actionRequired && !score.ignored)
      .map((score) => score.id);
    void completeEvolution("ai-agreement", finalRanking, finalActionIds);
  };

  const startCorrection = () => {
    setRanking(scores.map((score) => score.id));
    setSelectedActionIds(
      scores
        .filter((score) => score.actionRequired && !score.ignored)
        .map((score) => score.id),
    );
    setCorrectionReason("Wrong priority");
    setIsCorrecting(true);
  };

  return (
    <main className="app-shell">
      <MissionHeader
        policy={state.policy}
        mode={state.currentMode}
        engineLabel={engineLabel}
        onReset={resetEvolution}
      />

      <section className="workspace">
        <ObservationWorkspace
          scene={scene}
          highlightedObjectIds={highlightedObjectIds}
        />
        <aside className="side-stack">
          <IntelligencePanel
            scene={scene}
            mode={state.currentMode}
            scores={scores}
            ranking={ranking}
            selectedActionIds={selectedActionIds}
            isCorrecting={isCorrecting}
            correctionReason={correctionReason}
            isEvolving={isEvolving}
            onHoverChange={setHoveredChangeId}
            onMoveRank={moveRank}
            onToggleAction={toggleAction}
            onSubmitHuman={() =>
              void completeEvolution("human-training", ranking, selectedActionIds)
            }
            onAcceptAi={acceptAi}
            onStartCorrection={startCorrection}
            onCancelCorrection={() => setIsCorrecting(false)}
            onCorrectionReasonChange={setCorrectionReason}
            onSubmitCorrection={() =>
              void completeEvolution(
                "ai-correction",
                ranking,
                selectedActionIds,
                correctionReason,
              )
            }
            onRecordAutonomousAction={() =>
              void completeEvolution(
                "autonomous-action",
                scores.map((score) => score.id),
                scores
                  .filter((score) => score.actionRequired && !score.ignored)
                  .map((score) => score.id),
              )
            }
          />
          <ActivityTrace
            mode={state.currentMode}
            scores={scores}
            isEvolving={isEvolving}
          />
          <PolicyInspector policy={state.policy} />
          <EvolutionHistory events={state.evolutionHistory} />
        </aside>
      </section>

      {transitionEvent ? (
        <EvolutionTransition
          event={transitionEvent}
          onContinue={() => setTransitionEvent(null)}
        />
      ) : null}
    </main>
  );
}
