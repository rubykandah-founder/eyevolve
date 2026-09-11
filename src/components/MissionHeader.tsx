import { getAgreementRate, modeLabel } from "@/lib/autonomy";
import { percent } from "@/lib/scoring";
import type { EyevolvePolicy, AutonomyMode } from "@/lib/types";

type MissionHeaderProps = {
  policy: EyevolvePolicy;
  mode: AutonomyMode;
  engineLabel: string;
  onReset: () => void;
};

export function MissionHeader({
  policy,
  mode,
  engineLabel,
  onReset,
}: MissionHeaderProps) {
  return (
    <header className="mission-header">
      <div className="brand">
        <span className="eyebrow">Observe. Judge. Act. Evolve.</span>
        <h1>EYEVOLVE</h1>
        <span className="tagline">The eye that learns what matters.</span>
      </div>

      <div className="header-metrics">
        <div className="metric">
          <div className="metric-label">Generation</div>
          <div className="metric-value">
            {String(policy.generation).padStart(2, "0")}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Model confidence</div>
          <div className="metric-value">{percent(policy.confidence)}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Human agreement</div>
          <div className="metric-value">{percent(getAgreementRate(policy))}</div>
        </div>
        <div className="metric">
          <div className="metric-label">Autonomy</div>
          <div className="metric-value">
            {percent(policy.autonomy)}{" "}
            <span className="mode-pill">{modeLabel(mode)}</span>
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Decision driver</div>
          <div className="metric-value">{engineLabel}</div>
        </div>
        <button className="reset-button danger-button" onClick={onReset}>
          Reset evolution
        </button>
      </div>
    </header>
  );
}
