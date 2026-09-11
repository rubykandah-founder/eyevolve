import { FEATURE_KEYS, type EvolutionEvent } from "@/lib/types";
import { featureLabel, getScene } from "@/lib/scenes";
import {
  beforeNowSentence,
  selectAutonomousActionPlan,
} from "@/lib/evolution-narrative";
import { scoreScene } from "@/lib/scoring";

type EvolutionTransitionProps = {
  event: EvolutionEvent;
  onContinue: () => void;
};

const sentenceJoin = (items: string[]) => {
  if (items.length <= 1) {
    return items[0] ?? "the next signal";
  }
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
};

const plainAction = (required: boolean, suggestedAction?: string) => {
  if (required && suggestedAction) {
    return suggestedAction;
  }
  if (required) {
    return "Escalate for human response";
  }
  return "Watch without dispatch";
};

export function EvolutionTransition({
  event,
  onContinue,
}: EvolutionTransitionProps) {
  const scene = getScene(event.sceneId);
  const narrative = event.summaryNarrative;
  const overlay = narrative?.compactOverlay;
  const beforeScored = scoreScene(scene, event.before);
  const scored = scoreScene(scene, event.after);
  const beforePrimary =
    beforeScored.find((change) => change.actionRequired && !change.ignored) ??
    beforeScored[0];
  const primary =
    scored.find((change) => change.actionRequired && !change.ignored) ?? scored[0];
  const actionPlan = selectAutonomousActionPlan(scene, primary);
  const beforeNow = beforeNowSentence(beforePrimary, primary);
  const background = scored
    .filter((change) => change.id !== primary?.id)
    .filter((change) => change.ignored || change.noiseCandidate || change.actionScore < event.after.actionThreshold)
    .slice(0, 3);
  const uncertainDimensions = FEATURE_KEYS.filter((key) => key !== "visualNoise")
    .sort(
      (a, b) =>
        event.after.uncertaintyByDimension[b] -
        event.after.uncertaintyByDimension[a],
    )
    .slice(0, 2)
    .map((key) => featureLabel(key).toLowerCase());
  const primaryLabel = overlay?.prioritize.label ?? primary?.label ?? "No urgent signal";
  const primaryDescription =
    overlay?.prioritize.reason ??
    primary?.description ??
    "No change clearly warranted action.";
  const actionText =
    overlay?.behaviorChange ??
    `${actionPlan.label}: ${plainAction(Boolean(primary?.actionRequired), primary?.suggestedAction ?? scene.recommendedAction)}`;
  const backgroundItem =
    overlay?.quietDown ??
    (background[0]
      ? {
          label: background[0].label,
          reason: background[0].noiseCandidate || background[0].ignored
            ? "Background change"
            : "No action needed",
        }
      : undefined);
  const nextObservation =
    overlay?.nextObservation ??
    `Next it will test ${sentenceJoin(uncertainDimensions)} against another scene.`;
  const nowThinks =
    overlay?.behaviorChange ??
    narrative?.nowThinks ??
    beforeNow.now.replace(/^Now:\s*/i, "");

  return (
    <div className="transition-overlay" role="dialog" aria-modal="true">
      <div className="transition-card compact">
        <span className="eyebrow">Generation complete</span>
        <h2>{overlay?.headline ?? narrative?.headline ?? "EYEVOLVE learned from this pass"}</h2>
        <p className="transition-lede">
          {overlay?.takeaway ??
            narrative?.lede ??
            `From ${event.sceneTitle}, it updated what deserves attention and what can stay quiet.`}
        </p>

        <div className="compact-learning">
          <section className="compact-learning-row important">
            <span>Prioritize</span>
            <div>
              <strong>{primaryLabel}</strong>
              <p>{primaryDescription}</p>
            </div>
          </section>

          {backgroundItem ? (
            <section className="compact-learning-row quiet">
              <span>Quiet down</span>
              <div>
                <strong>{backgroundItem.label}</strong>
                <p>{backgroundItem.reason}</p>
              </div>
            </section>
          ) : null}

          <section className="compact-learning-row">
            <span>Now</span>
            <div>
              <strong>{nowThinks}</strong>
              <p>{actionText}</p>
            </div>
          </section>

          <section className="compact-next">
            <span className="eyebrow">Next observation</span>
            <strong>{nextObservation}</strong>
          </section>
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
