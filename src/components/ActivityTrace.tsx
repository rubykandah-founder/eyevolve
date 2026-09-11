import type { AutonomyMode, ScoredChange } from "@/lib/types";

type ActivityTraceProps = {
  mode: AutonomyMode;
  scores: ScoredChange[];
  isEvolving: boolean;
};

export function ActivityTrace({ mode, scores, isEvolving }: ActivityTraceProps) {
  const ignored = scores.filter((score) => score.ignored).length;
  const action = scores.find((score) => score.actionRequired && !score.ignored);
  const steps = [
    {
      label: "Observe",
      copy: `${scores.length} changes detected in the latest mosaic.`,
      active: true,
    },
    {
      label: mode === "human" ? "Measure human judgment" : "Filter",
      copy:
        mode === "human"
          ? "Waiting for ranking and intervention signal."
          : `${ignored} changes suppressed as likely noise.`,
      active: mode !== "autonomous",
    },
    {
      label: "Prioritize",
      copy: scores[0]
        ? `${scores[0].label} -> ${Math.round(scores[0].attentionScore * 100)} priority.`
        : "No changes scored yet.",
      active: mode !== "human",
    },
    {
      label: "Decide",
      copy: action
        ? `${action.label} crosses the action threshold.`
        : "No intervention threshold crossed.",
      active: mode === "exception-management" || mode === "autonomous",
    },
    {
      label: "Act",
      copy:
        mode === "autonomous"
          ? "Preparing simulated service request."
          : isEvolving
            ? "Updating policy from observation."
            : "Action remains gated by current autonomy.",
      active: mode === "autonomous" || isEvolving,
    },
  ];

  return (
    <section className="activity-path" aria-label="EYEVOLVE status path">
      <div className="activity-path-title">
        <span className="eyebrow">Status path</span>
        <strong>EYEVOLVE activity</strong>
      </div>
      <div className="activity-list">
        {steps.map((step) => (
          <div
            key={step.label}
            className={`trace-step ${step.active ? "active" : ""}`}
          >
            <div className="trace-dot">{step.active ? ">" : "-"}</div>
            <div>
              <div className="trace-label">{step.label}</div>
              <div className="trace-copy">{step.copy}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
