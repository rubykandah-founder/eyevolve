"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ActionPlanResponse,
  AiEngine,
  AutonomyMode,
  AutonomousActionPlan,
  EyevolvePolicy,
  SceneDef,
  ScoredChange,
} from "@/lib/types";
import { selectAutonomousActionPlan } from "@/lib/evolution-narrative";
import { formatScore } from "@/lib/scoring";
import { SceneRenderer } from "./SceneRenderer";
import { SimulatedCall } from "./SimulatedCall";

type IntelligencePanelProps = {
  scene: SceneDef;
  policy: EyevolvePolicy;
  mode: AutonomyMode;
  scores: ScoredChange[];
  ranking: string[];
  selectedActionIds: string[];
  prioritizedChangeIds: string[];
  potentialChangeIds: string[];
  ignoredChangeIds: string[];
  aiPrimaryChangeId?: string;
  aiSuppressedChangeIds: string[];
  analysisEngine?: AiEngine;
  isAnalyzingScene: boolean;
  isPopulatingEvents: boolean;
  totalChangeCount: number;
  isCorrecting: boolean;
  correctionReason: string;
  isEvolving: boolean;
  actionsPaused: boolean;
  onHoverChange: (changeId: string | null) => void;
  onPrioritizeChange: (changeId: string) => void;
  onPotentialChange: (changeId: string) => void;
  onIgnoreChange: (changeId: string) => void;
  onToggleAction: (changeId: string) => void;
  onSubmitHuman: () => void;
  onAcceptAi: () => void;
  onStartCorrection: () => void;
  onCancelCorrection: () => void;
  onCorrectionReasonChange: (reason: string) => void;
  onSubmitCorrection: () => void;
  onRecordAutonomousAction: () => void;
};

const correctionReasons = [
  "Wrong priority",
  "Too severe",
  "Not severe enough",
  "Wrong action",
  "Should have been ignored",
  "Other",
];

const IMAGE_READY_DELAY_MS = 5400;
const CHANGE_SCAN_STEP_MS = 950;
const ACTION_OVERLAY_DELAY_MS = 1800;

function EventProgressStrip({
  isAnalyzingScene,
  isPopulatingEvents,
  foundCount,
  totalCount,
  label,
}: {
  isAnalyzingScene: boolean;
  isPopulatingEvents: boolean;
  foundCount: number;
  totalCount: number;
  label?: string;
}) {
  const total = Math.max(1, totalCount);
  const found = Math.min(total, foundCount);
  const waitingForImagery = !isAnalyzingScene && !isPopulatingEvents && found === 0;
  const progress = waitingForImagery
    ? 12
    : isAnalyzingScene
    ? 58
    : isPopulatingEvents
      ? 58 + Math.round((found / total) * 36)
      : found >= total
        ? 100
        : Math.round((found / total) * 58);
  const status =
    label ??
    (waitingForImagery
      ? "Waiting for satellite imagery"
      : isAnalyzingScene
        ? "Reading satellite changes"
        : "Publishing events");
  const detail = waitingForImagery
    ? "Change reading starts after both images finish loading."
    : isAnalyzingScene
    ? "Comparing the before and after imagery."
    : `${found}/${totalCount} detected events ready.`;

  return (
    <div className="event-progress-strip" aria-live="polite">
      <div className="event-progress-copy">
        <strong>{status}</strong>
        <span>{detail}</span>
      </div>
      <div className="event-progress-meter">
        <div className="event-progress-track">
          <div
            className={`event-progress-fill ${isAnalyzingScene ? "active" : ""}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span>{progress}%</span>
      </div>
    </div>
  );
}

function ProjectionCard({ scene }: { scene: SceneDef }) {
  if (!scene.projection) {
    return null;
  }

  const highlightedObjectIds = scene.projection.objects
    .filter((object) => object.status === "hazard" || object.status === "action")
    .map((object) => object.id);

  return (
    <section className="projection-card" aria-label="AI projected future state">
      <div className="projection-copy">
        <span className="eyebrow">{scene.projection.label}</span>
        <strong>Projected later-state image</strong>
        <p>{scene.projection.description}</p>
      </div>
      <div className="projection-image">
        <SceneRenderer
          objects={scene.projection.objects}
          highlightedObjectIds={highlightedObjectIds}
        />
      </div>
    </section>
  );
}

function RankingEditor({
  scores,
  ranking,
  selectedActionIds,
  prioritizedChangeIds,
  potentialChangeIds,
  ignoredChangeIds,
  onPrioritizeChange,
  onPotentialChange,
  onIgnoreChange,
  onToggleAction,
  onHoverChange,
}: Pick<
  IntelligencePanelProps,
  | "scores"
  | "ranking"
  | "selectedActionIds"
  | "prioritizedChangeIds"
  | "potentialChangeIds"
  | "ignoredChangeIds"
  | "onPrioritizeChange"
  | "onPotentialChange"
  | "onIgnoreChange"
  | "onToggleAction"
  | "onHoverChange"
>) {
  const byId = new Map(scores.map((score) => [score.id, score]));
  const ranked = ranking.map((id) => byId.get(id)).filter(Boolean) as ScoredChange[];
  const prioritized = new Set(prioritizedChangeIds);
  const potential = new Set(potentialChangeIds);
  const ignored = new Set(ignoredChangeIds);

  return (
    <div className="change-list">
      {ranked.map((change, index) => {
        const isPrioritized = prioritized.has(change.id);
        const isPotential = potential.has(change.id);
        const isIgnored = ignored.has(change.id);

        return (
        <article
          className={[
            "change-card",
            isPrioritized ? "user-prioritized" : "",
            isPotential ? "user-potential" : "",
            isIgnored ? "user-ignored" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          key={change.id}
          onMouseEnter={() => onHoverChange(change.id)}
          onMouseLeave={() => onHoverChange(null)}
        >
          <div className="change-row">
            <span className="panel-badge">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <div className="change-name">{change.label}</div>
              <p className="change-description">{change.description}</p>
            </div>
            <div className="judgment-buttons" aria-label={`Judge ${change.label}`}>
              <button
                className={`judgment-button prioritize-button ${
                  isPrioritized ? "active" : ""
                }`}
                aria-pressed={isPrioritized}
                onClick={() => onPrioritizeChange(change.id)}
              >
                Prioritize
              </button>
              <button
                className={`judgment-button potential-button ${
                  isPotential ? "active" : ""
                }`}
                aria-pressed={isPotential}
                onClick={() => onPotentialChange(change.id)}
              >
                Potential
              </button>
              <button
                className={`judgment-button ignore-button ${
                  isIgnored ? "active" : ""
                }`}
                aria-pressed={isIgnored}
                onClick={() => onIgnoreChange(change.id)}
              >
                Ignore
              </button>
            </div>
          </div>
          <label className="action-select">
            <input
              type="checkbox"
              checked={selectedActionIds.includes(change.id) && !isIgnored && !isPotential}
              disabled={isIgnored || isPotential}
              onChange={() => onToggleAction(change.id)}
            />
            Requires intervention
          </label>
        </article>
        );
      })}
    </div>
  );
}

function AutonomousScanList({
  scores,
  primaryId,
  imagesReady,
  scanIndex,
  suppressedIds,
  primaryStatusLabel,
  onHoverChange,
}: {
  scores: ScoredChange[];
  primaryId: string | undefined;
  imagesReady: boolean;
  scanIndex: number;
  suppressedIds: string[];
  primaryStatusLabel: string;
  onHoverChange: (changeId: string | null) => void;
}) {
  if (!imagesReady) {
    return (
      <div className="autonomous-scan-wait">
        <span className="eyebrow">Waiting for imagery</span>
        <strong>Satellite mosaic is still rendering.</strong>
        <p>The autonomous review begins after the before/after tiles are fully visible.</p>
      </div>
    );
  }

  return (
    <div className="autonomous-scan-list">
      {scores.map((change, index) => {
        const processed = index < scanIndex;
        const isPrimary = change.id === primaryId;
        const aiSuppressed = suppressedIds.includes(change.id);
        const suppressed =
          processed &&
          !isPrimary &&
          (aiSuppressed || change.ignored || !change.actionRequired);
        const status = !processed
          ? "Scanning"
          : isPrimary
            ? primaryStatusLabel
            : aiSuppressed || change.ignored
              ? "AI suppressed"
              : "No action";

        return (
          <article
            className={[
              "autonomous-scan-card",
              processed ? "processed" : "",
              suppressed ? "suppressed" : "",
              processed && isPrimary ? "critical" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            key={change.id}
            onMouseEnter={() => onHoverChange(change.id)}
            onMouseLeave={() => onHoverChange(null)}
          >
            <div className="scan-card-topline">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{status}</strong>
            </div>
            <div className="change-name">{change.label}</div>
            <p className="change-description">{change.description}</p>
          </article>
        );
      })}
    </div>
  );
}

function AiPriorityList({
  scores,
  onHoverChange,
  showIgnored,
}: {
  scores: ScoredChange[];
  onHoverChange: (changeId: string | null) => void;
  showIgnored: boolean;
}) {
  const visible = showIgnored ? scores : scores.filter((score) => !score.ignored);
  return (
    <div className="change-list">
      {visible.map((change, index) => (
        <article
          className={`change-card ${change.ignored ? "ignored" : ""}`}
          key={change.id}
          onMouseEnter={() => onHoverChange(change.id)}
          onMouseLeave={() => onHoverChange(null)}
        >
          <div className="change-row">
            <span className="panel-badge">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <div className="change-name">{change.label}</div>
              <p className="change-description">{change.description}</p>
            </div>
            <strong>{formatScore(change.attentionScore)}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

export function IntelligencePanel(props: IntelligencePanelProps) {
  const {
    scene,
    policy,
    mode,
    scores,
    ranking,
    selectedActionIds,
    prioritizedChangeIds,
    potentialChangeIds,
    ignoredChangeIds,
    aiPrimaryChangeId,
    aiSuppressedChangeIds,
    analysisEngine,
    isAnalyzingScene,
    isPopulatingEvents,
    totalChangeCount,
    isCorrecting,
    correctionReason,
    isEvolving,
    actionsPaused,
    onHoverChange,
    onPrioritizeChange,
    onPotentialChange,
    onIgnoreChange,
    onToggleAction,
    onSubmitHuman,
    onAcceptAi,
    onStartCorrection,
    onCancelCorrection,
    onCorrectionReasonChange,
    onSubmitCorrection,
    onRecordAutonomousAction,
  } = props;
  const aiPrimary = aiPrimaryChangeId
    ? scores.find((score) => score.id === aiPrimaryChangeId)
    : undefined;
  const actionable =
    aiPrimary?.actionRequired || aiPrimary?.suggestedAction
      ? aiPrimary
      : scores.find((score) => score.actionRequired && !score.ignored);
  const ignored = scores.filter((score) => score.ignored);
  const analyzed = scores.filter((score) => !score.ignored);
  const [autonomousScanIndex, setAutonomousScanIndex] = useState(0);
  const [autonomousImagesReady, setAutonomousImagesReady] = useState(false);
  const [showActionOverlay, setShowActionOverlay] = useState(false);
  const [aiActionPlan, setAiActionPlan] = useState<AutonomousActionPlan | null>(
    null,
  );
  const autonomousPrimary = aiPrimary ?? actionable ?? analyzed[0];
  const autonomousPrimaryId = autonomousPrimary?.id;
  const fallbackActionPlan = useMemo(
    () => selectAutonomousActionPlan(scene, autonomousPrimary),
    [autonomousPrimary, scene],
  );
  const actionPlan = aiActionPlan ?? fallbackActionPlan;
  const scanComplete =
    autonomousImagesReady && autonomousScanIndex >= scores.length;
  const eventsReady =
    !isAnalyzingScene && !isPopulatingEvents && scores.length === totalChangeCount;
  const eventProgressLabel = isAnalyzingScene
    ? "AI analyzing"
    : isPopulatingEvents
      ? `${scores.length}/${totalChangeCount} found`
      : `${scores.length} changes`;
  const isControlledTraining = mode === "human" && policy.generation <= 2;
  const detectionEngineLabel =
    analysisEngine === "openai" ? "OpenAI detected changes" : "Local detector ready";

  useEffect(() => {
    if (mode === "human" || isCorrecting || !eventsReady) {
      setAiActionPlan(null);
      return;
    }

    let cancelled = false;
    setAiActionPlan(null);
    void fetch("/api/action-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scene,
        policy,
        scores,
        primaryChangeId: autonomousPrimaryId,
        mode,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Action planning failed");
        }
        return response.json() as Promise<ActionPlanResponse>;
      })
      .then((response) => {
        if (!cancelled) {
          setAiActionPlan(response.plan);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAiActionPlan(fallbackActionPlan);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    autonomousPrimaryId,
    fallbackActionPlan,
    eventsReady,
    isCorrecting,
    mode,
    policy,
    scene,
    scores,
  ]);

  useEffect(() => {
    if (
      !eventsReady ||
      (mode !== "autonomous" && mode !== "exception-management")
    ) {
      setAutonomousScanIndex(0);
      setAutonomousImagesReady(false);
      setShowActionOverlay(false);
      return;
    }

    const timers: number[] = [];
    setAutonomousScanIndex(0);
    setAutonomousImagesReady(false);
    setShowActionOverlay(false);

    timers.push(
      window.setTimeout(() => {
        setAutonomousImagesReady(true);
      }, IMAGE_READY_DELAY_MS),
    );

    scores.forEach((_, index) => {
      timers.push(
        window.setTimeout(
          () => {
            setAutonomousScanIndex(index + 1);
            if (scores[index]?.id === autonomousPrimaryId) {
              onHoverChange(scores[index].id);
            }
          },
          IMAGE_READY_DELAY_MS + CHANGE_SCAN_STEP_MS * (index + 1),
        ),
      );
    });

    if (mode === "autonomous") {
      timers.push(
        window.setTimeout(
          () => setShowActionOverlay(true),
          IMAGE_READY_DELAY_MS +
            CHANGE_SCAN_STEP_MS * scores.length +
            ACTION_OVERLAY_DELAY_MS,
        ),
      );
    }

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      onHoverChange(null);
    };
  }, [autonomousPrimaryId, eventsReady, mode, onHoverChange, scene.id, scores]);

  if (mode === "human") {
    return (
      <section className="panel intelligence-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Human training mode</span>
            <h2>Rank what matters</h2>
          </div>
          <span className="panel-badge">{eventProgressLabel}</span>
        </div>
        <p className="change-description">
          Prioritize what matters now, mark benign precursor patterns as
          potential, or ignore background events.
        </p>
        {isControlledTraining ? (
          <div className="ai-detection-note">
            <span className="eyebrow">AI change detection</span>
            <strong>{detectionEngineLabel}</strong>
            <p>
              In this training scene, AI identifies the satellite changes. Your
              ranking and action choices teach EYEVOLVE what those changes mean.
            </p>
          </div>
        ) : null}
        {!eventsReady ? (
          <EventProgressStrip
            isAnalyzingScene={isAnalyzingScene}
            isPopulatingEvents={isPopulatingEvents}
            foundCount={scores.length}
            totalCount={totalChangeCount}
          />
        ) : null}
        <RankingEditor
          scores={scores}
          ranking={ranking}
          selectedActionIds={selectedActionIds}
          prioritizedChangeIds={prioritizedChangeIds}
          potentialChangeIds={potentialChangeIds}
          ignoredChangeIds={ignoredChangeIds}
          onPrioritizeChange={onPrioritizeChange}
          onPotentialChange={onPotentialChange}
          onIgnoreChange={onIgnoreChange}
          onToggleAction={onToggleAction}
          onHoverChange={onHoverChange}
        />
        <div className="button-row">
          <button className="primary-button" disabled={isEvolving || !eventsReady} onClick={onSubmitHuman}>
            {isEvolving ? "Updating policy..." : "Submit judgment"}
          </button>
        </div>
      </section>
    );
  }

  if (isCorrecting) {
    return (
      <section className="panel intelligence-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Correction mode</span>
            <h2>Correct EYEVOLVE</h2>
          </div>
        </div>
        <RankingEditor
          scores={scores}
          ranking={ranking}
          selectedActionIds={selectedActionIds}
          prioritizedChangeIds={prioritizedChangeIds}
          potentialChangeIds={potentialChangeIds}
          ignoredChangeIds={ignoredChangeIds}
          onPrioritizeChange={onPrioritizeChange}
          onPotentialChange={onPotentialChange}
          onIgnoreChange={onIgnoreChange}
          onToggleAction={onToggleAction}
          onHoverChange={onHoverChange}
        />
        <div className="correction-box">
          <label>
            <span className="eyebrow">Reason</span>
            <select
              className="select-field"
              value={correctionReason}
              onChange={(event) => onCorrectionReasonChange(event.target.value)}
            >
              {correctionReasons.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </label>
          <div className="button-row">
            <button className="primary-button" disabled={isEvolving} onClick={onSubmitCorrection}>
              {isEvolving ? "Applying correction..." : "Apply correction"}
            </button>
            <button className="secondary-button" disabled={isEvolving} onClick={onCancelCorrection}>
              Cancel
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (mode === "ai-review") {
    return (
      <section className="panel intelligence-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">AI review mode</span>
            <h2>EYEVOLVE judgment</h2>
          </div>
          <span className="panel-badge">{eventsReady ? "Human confirms" : eventProgressLabel}</span>
        </div>
        {!eventsReady ? (
          <EventProgressStrip
            isAnalyzingScene={isAnalyzingScene}
            isPopulatingEvents={isPopulatingEvents}
            foundCount={scores.length}
            totalCount={totalChangeCount}
            label="Building AI priority list"
          />
        ) : null}
        {eventsReady ? (
          <>
            <AiPriorityList scores={scores} onHoverChange={onHoverChange} showIgnored />
            <ProjectionCard scene={scene} />
            <div className="learned-callout">
              <div className="eyebrow">Action recommendation</div>
              <strong>
                {actionable ? actionPlan.headline : "No intervention recommended"}
              </strong>
              <p className="change-description">
                {actionable
                  ? actionPlan.description
                  : "No change crossed the current learned action threshold."}
              </p>
            </div>
          </>
        ) : null}
        <div className="button-row">
          <button className="primary-button" disabled={isEvolving || !eventsReady} onClick={onAcceptAi}>
            {isEvolving ? "Updating trust..." : "Yes, matches my judgment"}
          </button>
          <button className="secondary-button" disabled={isEvolving || !eventsReady} onClick={onStartCorrection}>
            Correct EYEVOLVE
          </button>
        </div>
      </section>
    );
  }

  if (mode === "exception-management") {
    return (
      <section className="panel intelligence-panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Exception management</span>
            <h2>Only meaningful exceptions</h2>
          </div>
          <span className="panel-badge">
            {eventsReady ? `${ignored.length} suppressed` : eventProgressLabel}
          </span>
        </div>
        {!eventsReady ? (
          <EventProgressStrip
            isAnalyzingScene={isAnalyzingScene}
            isPopulatingEvents={isPopulatingEvents}
            foundCount={scores.length}
            totalCount={totalChangeCount}
            label="Building exception review"
          />
        ) : (
          <>
            <ProjectionCard scene={scene} />
            <AutonomousScanList
              scores={scores}
              primaryId={autonomousPrimaryId}
              imagesReady={autonomousImagesReady}
              scanIndex={autonomousScanIndex}
              suppressedIds={aiSuppressedChangeIds}
              primaryStatusLabel={actionPlan.label}
              onHoverChange={onHoverChange}
            />
            <div className={`learned-callout ${scanComplete ? "" : "pending-scan"}`}>
              <div className="eyebrow">Proposed action</div>
              <strong>
                {scanComplete
                  ? actionPlan.headline
                  : "Scanning observed changes..."}
              </strong>
            </div>
          </>
        )}
        <div className="button-row">
          <button
            className="primary-button"
            disabled={isEvolving || !scanComplete}
            onClick={onAcceptAi}
          >
            {isEvolving ? "Recording agreement..." : "Confirm judgment"}
          </button>
          <button
            className="secondary-button"
            disabled={isEvolving || !scanComplete}
            onClick={onStartCorrection}
          >
            Override
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`panel intelligence-panel autonomous-panel ${
        showActionOverlay ? "action-overlay-open" : ""
      }`}
    >
      <div className="panel-underlay">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Autonomous mode</span>
            <h2>Autonomous dispatch</h2>
          </div>
          <span className="panel-badge">
            {eventsReady ? "Override available" : eventProgressLabel}
          </span>
        </div>
        {!eventsReady ? (
          <EventProgressStrip
            isAnalyzingScene={isAnalyzingScene}
            isPopulatingEvents={isPopulatingEvents}
            foundCount={scores.length}
            totalCount={totalChangeCount}
            label="Preparing autonomous review"
          />
        ) : (
          <>
            <ProjectionCard scene={scene} />
            <AutonomousScanList
              scores={scores}
              primaryId={autonomousPrimaryId}
              imagesReady={autonomousImagesReady}
              scanIndex={autonomousScanIndex}
              suppressedIds={aiSuppressedChangeIds}
              primaryStatusLabel={actionPlan.label}
              onHoverChange={onHoverChange}
            />
            <div className="button-row">
              <button className="secondary-button" disabled={isEvolving} onClick={onStartCorrection}>
                Override
              </button>
            </div>
          </>
        )}
      </div>

      {showActionOverlay ? (
        <div className="judgment-action-popup">
          <SimulatedCall
            service={scene.actionService ?? "Service desk"}
            incident={actionable?.label ?? scene.recommendedAction ?? "an actionable satellite event"}
            plan={actionPlan}
            paused={actionsPaused}
            isEvolving={isEvolving}
            onCompleteAction={onRecordAutonomousAction}
          />
        </div>
      ) : null}
    </section>
  );
}
