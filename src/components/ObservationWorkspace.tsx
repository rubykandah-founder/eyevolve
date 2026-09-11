import type { SceneDef } from "@/lib/types";
import { SatellitePanel } from "./SatellitePanel";

type ObservationWorkspaceProps = {
  scene: SceneDef;
  highlightedObjectIds: string[];
};

export function ObservationWorkspace({
  scene,
  highlightedObjectIds,
}: ObservationWorkspaceProps) {
  return (
    <div>
      <div className="panel-title">
        <div>
          <span className="eyebrow">Satellite observation</span>
          <h2>{scene.title}</h2>
        </div>
        <span className="panel-badge">{scene.scenarioType.toUpperCase()}</span>
      </div>
      <div className="observation-grid">
        <SatellitePanel
          scene={scene}
          phase="before"
          highlightedObjectIds={highlightedObjectIds}
        />
        <SatellitePanel
          scene={scene}
          phase="after"
          highlightedObjectIds={highlightedObjectIds}
        />
      </div>
    </div>
  );
}
