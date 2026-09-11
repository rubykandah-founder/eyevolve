import { FEATURE_KEYS, type EvolutionEvent } from "@/lib/types";
import { featureLabel, getScene } from "@/lib/scenes";
import {
  beforeNowSentence,
  knownAndUnsure,
  latestCapabilityUnlock,
  selectAutonomousActionPlan,
  unlockedCapabilities,
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
  const beforeScored = scoreScene(scene, event.before);
  const scored = scoreScene(scene, event.after);
  const beforePrimary =
    beforeScored.find((change) => change.actionRequired && !change.ignored) ??
    beforeScored[0];
  const primary =
    scored.find((change) => change.actionRequired && !change.ignored) ?? scored[0];
  const actionPlan = selectAutonomousActionPlan(scene, primary);
  const beforeNow = beforeNowSentence(beforePrimary, primary);
  const knowledge = knownAndUnsure(event.after);
  const unlocked = unlockedCapabilities(event.after.generation);
  const latestUnlock = latestCapabilityUnlock(
    event.before.generation,
    event.after.generation,
  );
  const background = scored
    .filter((change) => change.id !== primary?.id)
    .filter((change) => change.ignored || change.noiseCandidate || change.actionScore < event.after.actionThreshold)
    .slice(0, 3);
  const watchOnly = scored
    .filter((change) => change.id !== primary?.id)
    .filter((change) => !background.some((item) => item.id === change.id))
    .slice(0, 2);
  const uncertainDimensions = FEATURE_KEYS.filter((key) => key !== "visualNoise")
    .sort(
      (a, b) =>
        event.after.uncertaintyByDimension[b] -
        event.after.uncertaintyByDimension[a],
    )
    .slice(0, 2)
    .map((key) => featureLabel(key).toLowerCase());

  return (
    <div className="transition-overlay" role="dialog" aria-modal="true">
      <div className="transition-card simple">
        <span className="eyebrow">Generation complete</span>
        <h2>{narrative?.headline ?? "What EYEVOLVE understood"}</h2>
        <p className="transition-lede">
          {narrative?.lede ??
            `From ${event.sceneTitle}, it learned which changes deserve action and which should stay in the background.`}
        </p>

        <div className="learning-takeaway-grid">
          <section className="learning-takeaway-card primary">
            <span className="eyebrow">Most important signal</span>
            <strong>
              {narrative?.mostImportantSignal.label ??
                primary?.label ??
                "No urgent signal"}
            </strong>
            <p>
              {narrative?.mostImportantSignal.description ??
                primary?.description ??
                "EYEVOLVE did not identify a change that clearly warranted action."}
            </p>
            <div className="takeaway-action">
              {narrative?.mostImportantSignal.action ??
                `${actionPlan.label}: ${plainAction(Boolean(primary?.actionRequired), primary?.suggestedAction ?? scene.recommendedAction)}`}
            </div>
          </section>

          <section className="learning-takeaway-card evolution-shift-card">
            <span className="eyebrow">Used to think / now thinks</span>
            <div className="before-now-row">
            <span>Before</span>
              <strong>
                {narrative?.usedToThink ??
                  beforeNow.before.replace(/^Before:\s*/i, "")}
              </strong>
            </div>
            <div className="before-now-row now">
              <span>Now</span>
              <strong>
                {narrative?.nowThinks ??
                  beforeNow.now.replace(/^Now:\s*/i, "")}
              </strong>
            </div>
          </section>

          <section className="learning-takeaway-card">
            <span className="eyebrow">Capability unlocked</span>
            {narrative ? (
              <>
                <strong>{narrative.capabilityTitle}</strong>
                <p>{narrative.capabilityDescription}</p>
              </>
            ) : latestUnlock ? (
              <>
                <strong>{latestUnlock.title}</strong>
                <p>{latestUnlock.description}</p>
              </>
            ) : (
              <>
                <strong>
                  {unlocked.at(-1)?.title ?? "Human-guided learning"}
                </strong>
                <p>
                  {unlocked.at(-1)?.description ??
                    "EYEVOLVE is still collecting enough examples to unlock autonomous behavior."}
                </p>
              </>
            )}
          </section>

          <section className="learning-takeaway-card">
            <span className="eyebrow">Not critical here</span>
            {narrative?.notCritical.length ? (
              <ul className="takeaway-list">
                {narrative.notCritical.map((item) => (
                  <li key={`${item.label}-${item.reason}`}>
                    <strong>{item.label}</strong>
                    <span>{item.reason}</span>
                  </li>
                ))}
              </ul>
            ) : background.length ? (
              <ul className="takeaway-list">
                {background.map((change) => (
                  <li key={change.id}>
                    <strong>{change.label}</strong>
                    <span>{change.noiseCandidate || change.ignored ? "Background change" : "No dispatch needed"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No detected change was safe to suppress in this observation.</p>
            )}
          </section>

          <section className="learning-takeaway-card">
            <span className="eyebrow">Keep watching</span>
            {narrative?.keepWatching.length ? (
              <ul className="takeaway-list">
                {narrative.keepWatching.map((item) => (
                  <li key={`${item.label}-${item.reason}`}>
                    <strong>{item.label}</strong>
                    <span>{item.reason}</span>
                  </li>
                ))}
              </ul>
            ) : watchOnly.length ? (
              <ul className="takeaway-list">
                {watchOnly.map((change) => (
                  <li key={change.id}>
                    <strong>{change.label}</strong>
                    <span>Relevant, but not enough for action yet</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                EYEVOLVE is still least certain about{" "}
                {sentenceJoin(uncertainDimensions)}.
              </p>
            )}
          </section>

          <section className="learning-takeaway-card">
            <span className="eyebrow">Understands / still learning</span>
            <div className="knowledge-list">
              <div>
                <span>Understands</span>
                <strong>{sentenceJoin(narrative?.understands ?? knowledge.known)}</strong>
              </div>
              <div>
                <span>Still learning</span>
                <strong>{sentenceJoin(narrative?.stillLearning ?? knowledge.unsure)}</strong>
              </div>
            </div>
            <p className="muted-copy">
              {narrative?.nextObservation ??
                `Next it will test ${sentenceJoin(uncertainDimensions)} against a new scene.`}
            </p>
          </section>

          <section className="learning-takeaway-card primary">
            <span className="eyebrow">Rule carried forward</span>
            <strong>{narrative?.ruleCarriedForward ?? event.learnedRule}</strong>
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
