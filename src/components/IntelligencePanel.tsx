import type { AutonomyMode, SceneDef, ScoredChange } from "@/lib/types";
import { formatScore } from "@/lib/scoring";
import { SimulatedCall } from "./SimulatedCall";

type IntelligencePanelProps = {
  scene: SceneDef;
  mode: AutonomyMode;
  scores: ScoredChange[];
  ranking: string[];
  selectedActionIds: string[];
  isCorrecting: boolean;
  correctionReason: string;
  isEvolving: boolean;
  onHoverChange: (changeId: string | null) => void;
  onMoveRank: (changeId: string, direction: -1 | 1) => void;
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

function ScoreBadges({ change }: { change: ScoredChange }) {
  return (
    <div className="score-badges">
      <span className="score-badge">ATT {formatScore(change.attentionScore)}</span>
      <span className="score-badge">ACT {formatScore(change.actionScore)}</span>
      <span className="score-badge">IGN {formatScore(change.ignoreScore)}</span>
      {change.actionRequired ? <span className="score-badge hazard">ACTION</span> : null}
      {change.ignored ? <span className="score-badge">SUPPRESSED</span> : null}
    </div>
  );
}

function RankingEditor({
  scores,
  ranking,
  selectedActionIds,
  onMoveRank,
  onToggleAction,
  onHoverChange,
}: Pick<
  IntelligencePanelProps,
  | "scores"
  | "ranking"
  | "selectedActionIds"
  | "onMoveRank"
  | "onToggleAction"
  | "onHoverChange"
>) {
  const byId = new Map(scores.map((score) => [score.id, score]));
  const ranked = ranking.map((id) => byId.get(id)).filter(Boolean) as ScoredChange[];

  return (
    <div className="change-list">
      {ranked.map((change, index) => (
        <article
          className="change-card"
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
            <div className="rank-buttons">
              <button
                className="icon-button"
                aria-label={`Move ${change.label} up`}
                disabled={index === 0}
                onClick={() => onMoveRank(change.id, -1)}
              >
                ^
              </button>
              <button
                className="icon-button"
                aria-label={`Move ${change.label} down`}
                disabled={index === ranked.length - 1}
                onClick={() => onMoveRank(change.id, 1)}
              >
                v
              </button>
            </div>
          </div>
          <ScoreBadges change={change} />
          <label className="action-select">
            <input
              type="checkbox"
              checked={selectedActionIds.includes(change.id)}
              onChange={() => onToggleAction(change.id)}
            />
            Requires intervention
          </label>
        </article>
      ))}
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
          <ScoreBadges change={change} />
        </article>
      ))}
    </div>
  );
}

export function IntelligencePanel(props: IntelligencePanelProps) {
  const {
    scene,
    mode,
    scores,
    ranking,
    selectedActionIds,
    isCorrecting,
    correctionReason,
    isEvolving,
    onHoverChange,
    onMoveRank,
    onToggleAction,
    onSubmitHuman,
    onAcceptAi,
    onStartCorrection,
    onCancelCorrection,
    onCorrectionReasonChange,
    onSubmitCorrection,
    onRecordAutonomousAction,
  } = props;
  const actionable = scores.find((score) => score.actionRequired && !score.ignored);
  const ignored = scores.filter((score) => score.ignored);
  const analyzed = scores.filter((score) => !score.ignored);

  if (mode === "human") {
    return (
      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Human training mode</span>
            <h2>Rank what matters</h2>
          </div>
          <span className="panel-badge">{scores.length} changes</span>
        </div>
        <p className="change-description">
          Move changes from most to least important, then mark any change that
          requires intervention.
        </p>
        <RankingEditor
          scores={scores}
          ranking={ranking}
          selectedActionIds={selectedActionIds}
          onMoveRank={onMoveRank}
          onToggleAction={onToggleAction}
          onHoverChange={onHoverChange}
        />
        <div className="button-row">
          <button className="primary-button" disabled={isEvolving} onClick={onSubmitHuman}>
            {isEvolving ? "Updating policy..." : "Submit judgment"}
          </button>
        </div>
      </section>
    );
  }

  if (isCorrecting) {
    return (
      <section className="panel">
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
          onMoveRank={onMoveRank}
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
      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">AI review mode</span>
            <h2>EYEVOLVE judgment</h2>
          </div>
          <span className="panel-badge">Human confirms</span>
        </div>
        <AiPriorityList scores={scores} onHoverChange={onHoverChange} showIgnored />
        <div className="learned-callout">
          <div className="eyebrow">Action recommendation</div>
          <strong>
            {actionable ? actionable.suggestedAction ?? scene.recommendedAction : "No intervention recommended"}
          </strong>
          <p className="change-description">
            {actionable
              ? `${actionable.label} crossed the learned action threshold.`
              : "No change crossed the current learned action threshold."}
          </p>
        </div>
        <div className="button-row">
          <button className="primary-button" disabled={isEvolving} onClick={onAcceptAi}>
            {isEvolving ? "Updating trust..." : "Yes, matches my judgment"}
          </button>
          <button className="secondary-button" disabled={isEvolving} onClick={onStartCorrection}>
            Correct EYEVOLVE
          </button>
        </div>
      </section>
    );
  }

  if (mode === "exception-management") {
    return (
      <section className="panel">
        <div className="panel-title">
          <div>
            <span className="eyebrow">Exception management</span>
            <h2>Only meaningful exceptions</h2>
          </div>
          <span className="panel-badge">{ignored.length} suppressed</span>
        </div>
        <div className="change-card ignored">
          <strong>{scores.length} changes observed</strong>
          <p className="change-description">
            {ignored.length} auto-suppressed:{" "}
            {ignored.length ? ignored.map((change) => change.label).join(", ") : "none"}
          </p>
        </div>
        <AiPriorityList scores={analyzed} onHoverChange={onHoverChange} showIgnored />
        <div className="learned-callout">
          <div className="eyebrow">Proposed action</div>
          <strong>
            {actionable ? actionable.suggestedAction ?? scene.recommendedAction : "Monitor only"}
          </strong>
        </div>
        <div className="button-row">
          <button className="primary-button" disabled={isEvolving} onClick={onAcceptAi}>
            {isEvolving ? "Recording agreement..." : "Confirm judgment"}
          </button>
          <button className="secondary-button" disabled={isEvolving} onClick={onStartCorrection}>
            Override
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">Autonomous mode</span>
          <h2>EYEVOLVE acts</h2>
        </div>
        <span className="panel-badge">Override available</span>
      </div>
      <AiPriorityList scores={scores} onHoverChange={onHoverChange} showIgnored={false} />
      <SimulatedCall
        service={scene.actionService ?? "Service desk"}
        incident={actionable?.label ?? scene.recommendedAction ?? "an actionable satellite event"}
      />
      <div className="button-row">
        <button
          className="primary-button"
          disabled={isEvolving}
          onClick={onRecordAutonomousAction}
        >
          {isEvolving ? "Persisting action..." : "Record action complete"}
        </button>
        <button className="secondary-button" disabled={isEvolving} onClick={onStartCorrection}>
          Override
        </button>
      </div>
    </section>
  );
}
