"use client";

import { useEffect, useState } from "react";
import type { SourceEvolutionResponse } from "@/lib/types";

type SourceEvolutionLabProps = {
  latestMutation: SourceEvolutionResponse | null;
};

export function SourceEvolutionLab({
  latestMutation,
}: SourceEvolutionLabProps) {
  const [snapshot, setSnapshot] = useState<SourceEvolutionResponse | null>(null);
  const current = latestMutation ?? snapshot;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/source-evolution")
      .then((response) => response.json() as Promise<SourceEvolutionResponse>)
      .then((response) => {
        if (!cancelled) {
          setSnapshot(response);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSnapshot(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [latestMutation]);

  return (
    <section className="panel source-lab-panel">
      <div className="panel-title">
        <div>
          <span className="eyebrow">Source evolution lab</span>
          <h3>Generated subsystem</h3>
        </div>
        <span className="panel-badge">
          {current ? current.engine.toUpperCase() : "Loading"}
        </span>
      </div>

      <div className="source-lab-intro">
        <strong>EYEVOLVE can rewrite one source file.</strong>
        <p>
          Runtime evolution is confined to a generated rules module. The model
          proposes behavior rules; the server validates them and renders the
          TypeScript source.
        </p>
      </div>

      {current ? (
        <>
          <div className="source-file-row">
            <span className="eyebrow">Whitelisted file</span>
            <code>{current.filePath}</code>
          </div>

          <div className="source-rule-list">
            {current.snapshot.rules
              .slice()
              .reverse()
              .map((rule) => (
                <article className="source-rule" key={rule.id}>
                  <div>
                    <span className="eyebrow">
                      Gen {rule.generation} / {rule.source}
                    </span>
                    <strong>{rule.title}</strong>
                  </div>
                  <p>
                    <span>When:</span> {rule.when}
                  </p>
                  <p>
                    <span>Then:</span> {rule.then}
                  </p>
                </article>
              ))}
          </div>

          <details className="source-diff">
            <summary>View generated source diff</summary>
            <pre>{current.diff}</pre>
          </details>
        </>
      ) : (
        <p className="mode-copy">No generated source snapshot loaded yet.</p>
      )}
    </section>
  );
}
