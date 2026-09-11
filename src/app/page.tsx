"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EvolutionHistory } from "@/components/EvolutionHistory";
import { EvolutionTransition } from "@/components/EvolutionTransition";
import { IntelligencePanel } from "@/components/IntelligencePanel";
import { MissionHeader } from "@/components/MissionHeader";
import { ObservationWorkspace } from "@/components/ObservationWorkspace";
import { getScene } from "@/lib/scenes";
import { selectAutonomousActionPlan } from "@/lib/evolution-narrative";
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
  AiEngine,
  AutonomousActionPlan,
  EvolutionEvent,
  EvolutionProposal,
  EvolveResponse,
  EyevolvePolicy,
  EyevolveState,
  GenerationSummaryResponse,
  InteractionEvent,
  SceneAnalysis,
  SceneAnalysisResponse,
  SceneDef,
  ScoredChange,
} from "@/lib/types";
import { FEATURE_KEYS } from "@/lib/types";

const nowId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

type SceneAnalysisCache = SceneAnalysis & {
  engine: AiEngine;
};

type TileReadyState = {
  sceneId: string;
  before: boolean;
  after: boolean;
};

const localProposal = (
  policy: EyevolvePolicy,
  interaction: InteractionEvent,
): EvolutionProposal =>
  sanitizeProposal({
    proposedPolicyDeltas: {
      attention: {
        humanSafety: interaction.actionChangeIds.length
          ? 0.02
          : interaction.potentialChangeIds?.length
            ? 0.012
            : 0.005,
        urgency: interaction.actionChangeIds.length
          ? 0.02
          : interaction.potentialChangeIds?.length
            ? 0.008
            : 0.005,
        infrastructure: interaction.potentialChangeIds?.length ? 0.014 : 0.01,
        environmental: interaction.potentialChangeIds?.length ? 0.014 : 0,
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
      : interaction.potentialChangeIds?.length
        ? "Benign-looking patterns can become watchlisted future risk without immediate intervention."
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

const featurePhrase = (key: string) =>
  key.replace(/([A-Z])/g, " $1").toLowerCase();

const nextObservationFor = (
  nextScene: SceneDef,
  proposal: EvolutionProposal,
) => {
  const proposed = proposal.nextLearningObjective?.trim();
  if (
    proposed &&
    !proposed.toLowerCase().includes("select the next observation")
  ) {
    return proposed;
  }

  const targets = FEATURE_KEYS.filter(
    (key) => key !== "visualNoise" && nextScene.learningTargets[key] > 0.35,
  )
    .sort((a, b) => nextScene.learningTargets[b] - nextScene.learningTargets[a])
    .slice(0, 2)
    .map(featurePhrase);
  const targetText = targets.length ? targets.join(" and ") : nextScene.scenarioType;

  return `Next, EYEVOLVE will inspect ${nextScene.title} to test ${targetText}.`;
};

async function requestEvolution(
  policy: EyevolvePolicy,
  scene: SceneDef,
  interaction: InteractionEvent,
  state: EyevolveState,
): Promise<EvolveResponse> {
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

const localSceneAnalysis = (
  scene: SceneDef,
  policy: EyevolvePolicy,
): SceneAnalysis => {
  const scored = scoreScene(scene, policy);
  const primary = scored.find((score) => score.actionRequired && !score.ignored) ?? scored[0];
  return {
    changes: scene.changes,
    primaryChangeId: primary?.id ?? scene.changes[0]?.id ?? "",
    suppressedChangeIds: scored
      .filter((score) => score.ignored || score.noiseCandidate)
      .map((score) => score.id),
    reasoningSummary:
      "Local scene analysis used predefined change events because OpenAI was unavailable.",
  };
};

async function requestSceneAnalysis(
  policy: EyevolvePolicy,
  scene: SceneDef,
  candidateScores: ScoredChange[],
  state: EyevolveState,
): Promise<SceneAnalysisResponse> {
  try {
    const response = await fetch("/api/analyze-scene", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        policy,
        scene,
        candidateScores,
        recentHistory: state.evolutionHistory.slice(-4).map((event) => event.summary),
      }),
    });

    if (!response.ok) {
      throw new Error("Scene analysis failed");
    }

    return (await response.json()) as SceneAnalysisResponse;
  } catch {
    return {
      analysis: localSceneAnalysis(scene, policy),
      engine: "local",
    };
  }
}

async function requestGenerationSummary(
  event: EvolutionEvent,
  scene: SceneDef,
  nextScene: SceneDef,
  scoredBefore: ScoredChange[],
  scoredAfter: ScoredChange[],
  actionPlan: AutonomousActionPlan,
): Promise<GenerationSummaryResponse | null> {
  try {
    const response = await fetch("/api/generation-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        scene,
        nextScene: {
          id: nextScene.id,
          title: nextScene.title,
          scenarioType: nextScene.scenarioType,
          learningTargets: nextScene.learningTargets,
        },
        scoredBefore,
        scoredAfter,
        actionPlan,
      }),
    });

    if (!response.ok) {
      throw new Error("Generation summary failed");
    }

    return (await response.json()) as GenerationSummaryResponse;
  } catch {
    return null;
  }
}

export default function Home() {
  const [state, setState] = useState<EyevolveState>(() => createInitialState());
  const [hydrated, setHydrated] = useState(false);
  const [ranking, setRanking] = useState<string[]>([]);
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([]);
  const [prioritizedChangeIds, setPrioritizedChangeIds] = useState<string[]>([]);
  const [potentialChangeIds, setPotentialChangeIds] = useState<string[]>([]);
  const [ignoredChangeIds, setIgnoredChangeIds] = useState<string[]>([]);
  const [hoveredChangeId, setHoveredChangeId] = useState<string | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("Wrong priority");
  const [isEvolving, setIsEvolving] = useState(false);
  const [transitionEvent, setTransitionEvent] = useState<EvolutionEvent | null>(
    null,
  );
  const [pendingState, setPendingState] = useState<EyevolveState | null>(null);
  const [activeTab, setActiveTab] = useState<"action" | "log">("action");
  const [engineLabel, setEngineLabel] = useState("LOCAL POLICY ENGINE");
  const [analysisByScene, setAnalysisByScene] = useState<
    Record<string, SceneAnalysisCache>
  >({});
  const [tileReady, setTileReady] = useState<TileReadyState>({
    sceneId: "",
    before: false,
    after: false,
  });
  const [tileCycle, setTileCycle] = useState(0);
  const [isAnalyzingScene, setIsAnalyzingScene] = useState(false);
  const [revealedChangeIds, setRevealedChangeIds] = useState<string[]>([]);
  const [isPopulatingEvents, setIsPopulatingEvents] = useState(false);
  const analysisRequestRef = useRef<string | null>(null);

  useEffect(() => {
    const loaded = loadState();
    const normalized =
      loaded.seenSceneIds.length < 2
        ? { ...loaded, currentMode: "human" as const }
        : loaded;
    const latestEngine = normalized.evolutionHistory.at(-1)?.engine;
    setState(normalized);
    setEngineLabel(
      latestEngine === "openai" ? "AI-DRIVEN POLICY" : "LOCAL POLICY ENGINE",
    );
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveState(state);
    }
  }, [hydrated, state]);

  const baseScene = useMemo(
    () => getScene(state.currentSceneId),
    [state.currentSceneId],
  );
  const sceneAnalysis = analysisByScene[baseScene.id];
  const scene = useMemo(
    () =>
      sceneAnalysis
        ? {
            ...baseScene,
            changes: sceneAnalysis.changes,
          }
        : baseScene,
    [baseScene, sceneAnalysis],
  );
  const scores = useMemo(
    () => scoreScene(scene, state.policy),
    [scene, state.policy],
  );
  const visibleScores = useMemo(() => {
    const visibleIds = new Set(revealedChangeIds);
    return scores.filter((score) => visibleIds.has(score.id));
  }, [revealedChangeIds, scores]);

  useEffect(() => {
    setTileReady({ sceneId: baseScene.id, before: false, after: false });
    setIsAnalyzingScene(false);
    setRevealedChangeIds([]);
    setIsPopulatingEvents(false);
    analysisRequestRef.current = null;
  }, [baseScene.id]);

  const handleTilesComplete = useCallback(
    (phase: "before" | "after") => {
      setTileReady((current) => {
        if (current.sceneId !== baseScene.id) {
          return current;
        }
        return {
          ...current,
          [phase]: true,
        };
      });
    },
    [baseScene.id],
  );

  useEffect(() => {
    if (
      !hydrated ||
      tileReady.sceneId !== baseScene.id ||
      !tileReady.before ||
      !tileReady.after ||
      sceneAnalysis ||
      analysisRequestRef.current === baseScene.id
    ) {
      return;
    }

    let cancelled = false;
    analysisRequestRef.current = baseScene.id;
    setIsAnalyzingScene(true);
    void requestSceneAnalysis(
      state.policy,
      baseScene,
      scoreScene(baseScene, state.policy),
      state,
    )
      .then((response) => {
        if (cancelled) {
          return;
        }
        setAnalysisByScene((current) => ({
          ...current,
          [baseScene.id]: {
            ...response.analysis,
            engine: response.engine,
          },
        }));
        setEngineLabel(
          response.engine === "openai"
            ? "AI-DRIVEN ANALYSIS"
            : "LOCAL ANALYSIS ENGINE",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsAnalyzingScene(false);
        }
      });

    return () => {
      cancelled = true;
      if (analysisRequestRef.current === baseScene.id) {
        analysisRequestRef.current = null;
      }
    };
  }, [baseScene, hydrated, sceneAnalysis, state, tileReady]);

  useEffect(() => {
    if (!sceneAnalysis) {
      setRevealedChangeIds([]);
      setIsPopulatingEvents(false);
      return;
    }

    const changes = sceneAnalysis.changes;
    const timers: number[] = [];
    setRevealedChangeIds([]);
    setIsPopulatingEvents(true);

    changes.forEach((change, index) => {
      timers.push(
        window.setTimeout(() => {
          setRevealedChangeIds((current) =>
            current.includes(change.id) ? current : [...current, change.id],
          );
          setHoveredChangeId(change.id);
        }, 500 + index * 900),
      );
    });

    timers.push(
      window.setTimeout(() => {
        setIsPopulatingEvents(false);
        setHoveredChangeId(sceneAnalysis.primaryChangeId || null);
      }, 500 + changes.length * 900 + 700),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [sceneAnalysis]);

  useEffect(() => {
    setRanking(scene.changes.map((change) => change.id));
    setSelectedActionIds([]);
    setPrioritizedChangeIds([]);
    setPotentialChangeIds([]);
    setIgnoredChangeIds([]);
    setHoveredChangeId(null);
    setIsCorrecting(false);
  }, [scene.id, scene.changes]);

  const highlightedObjectIds = useMemo(() => {
    if (!hoveredChangeId) {
      return [];
    }
    return scene.changes.find((change) => change.id === hoveredChangeId)?.objectIds ?? [];
  }, [hoveredChangeId, scene.changes]);

  const rankWithJudgments = (
    current: string[],
    prioritized: string[],
    potential: string[],
    ignored: string[],
  ) => {
    const sceneIds = scene.changes.map((change) => change.id);
    const sceneIdSet = new Set(sceneIds);
    const prioritySet = new Set(prioritized);
    const potentialSet = new Set(potential);
    const ignoredSet = new Set(ignored);
    const validPrioritized = prioritized.filter((id) => sceneIdSet.has(id));
    const validPotential = potential.filter((id) => sceneIdSet.has(id));
    const validIgnored = ignored.filter((id) => sceneIdSet.has(id));
    const neutral = current.filter(
      (id) =>
        sceneIdSet.has(id) &&
        !prioritySet.has(id) &&
        !potentialSet.has(id) &&
        !ignoredSet.has(id),
    );
    const missingNeutral = sceneIds.filter(
      (id) =>
        !current.includes(id) &&
        !prioritySet.has(id) &&
        !potentialSet.has(id) &&
        !ignoredSet.has(id),
    );

    return [
      ...validPrioritized,
      ...validPotential,
      ...neutral,
      ...missingNeutral,
      ...validIgnored,
    ];
  };

  const prioritizeChange = (changeId: string) => {
    const nextPrioritized = prioritizedChangeIds.includes(changeId)
      ? prioritizedChangeIds.filter((id) => id !== changeId)
      : [changeId, ...prioritizedChangeIds.filter((id) => id !== changeId)];
    const nextPotential = potentialChangeIds.filter((id) => id !== changeId);
    const nextIgnored = ignoredChangeIds.filter((id) => id !== changeId);

    setPrioritizedChangeIds(nextPrioritized);
    setPotentialChangeIds(nextPotential);
    setIgnoredChangeIds(nextIgnored);
    setRanking((current) =>
      rankWithJudgments(current, nextPrioritized, nextPotential, nextIgnored),
    );
  };

  const markPotentialChange = (changeId: string) => {
    const nextPotential = potentialChangeIds.includes(changeId)
      ? potentialChangeIds.filter((id) => id !== changeId)
      : [changeId, ...potentialChangeIds.filter((id) => id !== changeId)];
    const nextPrioritized = prioritizedChangeIds.filter((id) => id !== changeId);
    const nextIgnored = ignoredChangeIds.filter((id) => id !== changeId);

    setPotentialChangeIds(nextPotential);
    setPrioritizedChangeIds(nextPrioritized);
    setIgnoredChangeIds(nextIgnored);
    setSelectedActionIds((current) => current.filter((id) => id !== changeId));
    setRanking((current) =>
      rankWithJudgments(current, nextPrioritized, nextPotential, nextIgnored),
    );
  };

  const ignoreChange = (changeId: string) => {
    const nextIgnored = ignoredChangeIds.includes(changeId)
      ? ignoredChangeIds.filter((id) => id !== changeId)
      : [...ignoredChangeIds.filter((id) => id !== changeId), changeId];
    const nextPrioritized = prioritizedChangeIds.filter((id) => id !== changeId);
    const nextPotential = potentialChangeIds.filter((id) => id !== changeId);

    setPrioritizedChangeIds(nextPrioritized);
    setPotentialChangeIds(nextPotential);
    setIgnoredChangeIds(nextIgnored);
    setSelectedActionIds((current) => current.filter((id) => id !== changeId));
    setRanking((current) =>
      rankWithJudgments(current, nextPrioritized, nextPotential, nextIgnored),
    );
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
    setPendingState(null);
    setTransitionEvent(null);
    setActiveTab("action");
    setEngineLabel("LOCAL POLICY ENGINE");
    setAnalysisByScene({});
    analysisRequestRef.current = null;
    setTileReady({ sceneId: fresh.currentSceneId, before: false, after: false });
    setRevealedChangeIds([]);
    setIsPopulatingEvents(false);
    setPrioritizedChangeIds([]);
    setPotentialChangeIds([]);
    setIgnoredChangeIds([]);
    setTileCycle((current) => current + 1);
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
    finalPotentialIds: string[] = [],
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
      potentialChangeIds: finalPotentialIds,
      correctionReason: reason,
      createdAt: new Date().toISOString(),
    };

    const response = await requestEvolution(localPolicy, scene, interaction, state);
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
    const nextMode =
      seenSceneIds.length < 2 ? "human" : modeFromAutonomy(advancedPolicy.autonomy);
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
      nextLearningObjective: nextObservationFor(nextScene, response.proposal),
      before,
      after: advancedPolicy,
      createdAt: new Date().toISOString(),
    };

    const nextState: EyevolveState = {
      ...state,
      policy: advancedPolicy,
      currentSceneId: nextScene.id,
      seenSceneIds,
      interactionHistory: [...state.interactionHistory, interaction],
      evolutionHistory: [...state.evolutionHistory, event],
      currentMode: nextMode,
    };

    setPendingState(nextState);
    setTransitionEvent(event);
    setEngineLabel(
      response.engine === "openai"
        ? "AI-DRIVEN POLICY"
        : "LOCAL POLICY ENGINE",
    );
    setIsCorrecting(false);
    setIsEvolving(false);

    const scoredBefore = scoreScene(scene, before);
    const scoredAfter = scoreScene(scene, advancedPolicy);
    const primaryAfter =
      scoredAfter.find((score) => score.actionRequired && !score.ignored) ??
      scoredAfter[0];
    const summaryActionPlan = selectAutonomousActionPlan(scene, primaryAfter);

    void requestGenerationSummary(
      event,
      scene,
      nextScene,
      scoredBefore,
      scoredAfter,
      summaryActionPlan,
    ).then((summaryResponse) => {
      if (!summaryResponse) {
        return;
      }

      const summarizedEvent: EvolutionEvent = {
        ...event,
        summary: summaryResponse.summary.headline,
        summaryNarrative: summaryResponse.summary,
        summaryEngine: summaryResponse.engine,
      };

      setTransitionEvent((current) =>
        current?.id === event.id ? summarizedEvent : current,
      );
      setPendingState((current) =>
        current
          ? {
              ...current,
              evolutionHistory: current.evolutionHistory.map((historyEvent) =>
                historyEvent.id === event.id ? summarizedEvent : historyEvent,
              ),
            }
          : current,
      );
      setState((current) =>
        current.evolutionHistory.some((historyEvent) => historyEvent.id === event.id)
          ? {
              ...current,
              evolutionHistory: current.evolutionHistory.map((historyEvent) =>
                historyEvent.id === event.id ? summarizedEvent : historyEvent,
              ),
            }
          : current,
      );
    });
  };

  const continueToNextObservation = () => {
    if (pendingState) {
      setState(pendingState);
      setPendingState(null);
    }
    setTransitionEvent(null);
    setActiveTab("action");
  };

  const acceptAi = () => {
    const finalRanking = scores.map((score) => score.id);
    const finalActionIds = scores
      .filter(
        (score) =>
          (score.actionRequired || Boolean(score.suggestedAction)) &&
          !score.ignored,
      )
      .map((score) => score.id);
    void completeEvolution("ai-agreement", finalRanking, finalActionIds);
  };

  const startCorrection = () => {
    setRanking(scores.map((score) => score.id));
    setPrioritizedChangeIds([]);
    setPotentialChangeIds([]);
    setIgnoredChangeIds([]);
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
        <div className="observation-pane">
          <ObservationWorkspace
            scene={scene}
            highlightedObjectIds={highlightedObjectIds}
            onTilesComplete={handleTilesComplete}
            tileSceneKey={`${baseScene.id}-${tileCycle}`}
          />
        </div>

        <aside className="decision-pane">
          <div className="workspace-tabs" role="tablist" aria-label="Workspace views">
            <button
              className={activeTab === "action" ? "active" : ""}
              onClick={() => setActiveTab("action")}
              role="tab"
              aria-selected={activeTab === "action"}
            >
              Judgment
            </button>
            <button
              className={activeTab === "log" ? "active" : ""}
              onClick={() => setActiveTab("log")}
              role="tab"
              aria-selected={activeTab === "log"}
            >
              Evolution log
            </button>
          </div>

          {activeTab === "action" ? (
            <IntelligencePanel
              scene={scene}
              policy={state.policy}
              mode={state.currentMode}
              scores={visibleScores}
              ranking={ranking}
              selectedActionIds={selectedActionIds}
              prioritizedChangeIds={prioritizedChangeIds}
              potentialChangeIds={potentialChangeIds}
              ignoredChangeIds={ignoredChangeIds}
              aiPrimaryChangeId={sceneAnalysis?.primaryChangeId}
              aiSuppressedChangeIds={sceneAnalysis?.suppressedChangeIds ?? []}
              analysisEngine={sceneAnalysis?.engine}
              isAnalyzingScene={isAnalyzingScene}
              isPopulatingEvents={isPopulatingEvents}
              totalChangeCount={scene.changes.length}
              isCorrecting={isCorrecting}
              correctionReason={correctionReason}
              isEvolving={isEvolving}
              actionsPaused={Boolean(transitionEvent)}
              onHoverChange={setHoveredChangeId}
              onPrioritizeChange={prioritizeChange}
              onPotentialChange={markPotentialChange}
              onIgnoreChange={ignoreChange}
              onToggleAction={toggleAction}
              onSubmitHuman={() =>
                void completeEvolution(
                  "human-training",
                  ranking,
                  selectedActionIds,
                  potentialChangeIds,
                )
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
                  potentialChangeIds,
                  correctionReason,
                )
              }
              onRecordAutonomousAction={() =>
                void completeEvolution(
                  "autonomous-action",
                  scores.map((score) => score.id),
                  scores
                    .filter(
                      (score) =>
                        (score.actionRequired || Boolean(score.suggestedAction)) &&
                        !score.ignored,
                    )
                    .map((score) => score.id),
                  [],
                )
              }
            />
          ) : (
            <EvolutionHistory events={state.evolutionHistory} />
          )}
        </aside>
      </section>

      {transitionEvent ? (
        <EvolutionTransition
          event={transitionEvent}
          onContinue={continueToNextObservation}
        />
      ) : null}
    </main>
  );
}
