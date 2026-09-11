import { FEATURE_KEYS, type EvolutionEvent } from "@/lib/types";
import { featureLabel } from "@/lib/scenes";
import { percent } from "@/lib/scoring";

type EvolutionTransitionProps = {
  event: EvolutionEvent;
  onContinue: () => void;
};

function DeltaRow({
  label,
  before,
  after,
}: {
  label: string;
  before: number;
  after: number;
}) {
  const moved = Math.abs(after - before) >= 0.005;
  return (
    <div className="diff-row">
      <span>{label}</span>
      <strong>
        {percent(before)} -&gt; {percent(after)}
        {moved ? ` (${after > before ? "+" : ""}${Math.round((after - before) * 100)} pts)` : ""}
      </strong>
    </div>
  );
}

export function EvolutionTransition({
  event,
  onContinue,
}: EvolutionTransitionProps) {
  const changedAttention = FEATURE_KEYS.filter(
    (key) =>
      Math.abs(
        event.after.attentionWeights[key] - event.before.attentionWeights[key],
      ) >= 0.005,
  ).slice(0, 5);
  const changedAction = FEATURE_KEYS.filter(
    (key) =>
      Math.abs(event.after.actionWeights[key] - event.before.actionWeights[key]) >=
      0.005,
  ).slice(0, 5);

  return (
    <div className="transition-overlay" role="dialog" aria-modal="true">
      <div className="transition-card">
        <span className="eyebrow">Generation complete</span>
        <h2>Policy evolved after {event.sceneTitle}</h2>
        <p className="mode-copy">
          {event.after.judgmentsObserved} human/AI judgments observed. Evolution
          engine: {event.engine === "openai" ? "OpenAI-assisted" : "Local fallback"}.
        </p>

        <div className="transition-grid">
          <section className="panel">
            <div className="panel-title">
              <h3>Attention</h3>
            </div>
            {(changedAttention.length ? changedAttention : FEATURE_KEYS.slice(0, 3)).map((key) => (
              <DeltaRow
                key={key}
                label={featureLabel(key)}
                before={event.before.attentionWeights[key]}
                after={event.after.attentionWeights[key]}
              />
            ))}
          </section>

          <section className="panel">
            <div className="panel-title">
              <h3>Action</h3>
            </div>
            {(changedAction.length ? changedAction : FEATURE_KEYS.slice(0, 3)).map((key) => (
              <DeltaRow
                key={key}
                label={featureLabel(key)}
                before={event.before.actionWeights[key]}
                after={event.after.actionWeights[key]}
              />
            ))}
          </section>

          <section className="panel">
            <div className="panel-title">
              <h3>Model</h3>
            </div>
            <DeltaRow
              label="Confidence"
              before={event.before.confidence}
              after={event.after.confidence}
            />
            <DeltaRow
              label="Autonomy"
              before={event.before.autonomy}
              after={event.after.autonomy}
            />
            <DeltaRow
              label="Action threshold"
              before={event.before.actionThreshold}
              after={event.after.actionThreshold}
            />
          </section>

          <section className="panel">
            <div className="panel-title">
              <h3>Next observation</h3>
            </div>
            <p className="change-description">{event.reasoningSummary}</p>
            {event.nextLearningObjective ? (
              <p className="change-description">
                Learning objective: {event.nextLearningObjective}
              </p>
            ) : null}
          </section>
        </div>

        <div className="learned-callout">
          <div className="eyebrow">Learned</div>
          <strong>{event.learnedRule}</strong>
        </div>

        <div className="button-row">
          <button className="primary-button" onClick={onContinue}>
            Continue to next observation
          </button>
        </div>
      </div>
    </div>
  );
}
