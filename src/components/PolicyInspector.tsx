import { FEATURE_KEYS, type EyevolvePolicy } from "@/lib/types";
import { featureLabel } from "@/lib/scenes";
import { percent } from "@/lib/scoring";

type PolicyInspectorProps = {
  policy: EyevolvePolicy;
};

function WeightRows({
  title,
  weights,
}: {
  title: string;
  weights: EyevolvePolicy["attentionWeights"];
}) {
  return (
    <div>
      <div className="eyebrow">{title}</div>
      <div className="policy-grid">
        {FEATURE_KEYS.map((key) => (
          <div className="policy-row" key={key}>
            <span>{featureLabel(key)}</span>
            <div className="bar">
              <span style={{ width: percent(weights[key]) }} />
            </div>
            <span className="tiny">{percent(weights[key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PolicyInspector({ policy }: PolicyInspectorProps) {
  return (
    <section className="panel">
      <div className="panel-title">
        <h3>Policy inspector</h3>
        <span className="panel-badge">Persisted</span>
      </div>
      <div className="policy-grid">
        <WeightRows title="Attention" weights={policy.attentionWeights} />
        <WeightRows title="Action" weights={policy.actionWeights} />
        <div>
          <div className="eyebrow">Uncertainty</div>
          <div className="policy-grid">
            {FEATURE_KEYS.map((key) => (
              <div className="policy-row" key={key}>
                <span>{featureLabel(key)}</span>
                <div className="bar">
                  <span style={{ width: percent(policy.uncertaintyByDimension[key]) }} />
                </div>
                <span className="tiny">
                  {percent(policy.uncertaintyByDimension[key])}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
