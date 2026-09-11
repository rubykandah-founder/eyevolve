import type { SceneDef } from "@/lib/types";
import { SceneRenderer } from "./SceneRenderer";
import { TileReveal } from "./TileReveal";

type SatellitePanelProps = {
  scene: SceneDef;
  phase: "before" | "after";
  highlightedObjectIds: string[];
  onTilesComplete?: (phase: "before" | "after") => void;
  tileSceneKey?: string;
};

export function SatellitePanel({
  scene,
  phase,
  highlightedObjectIds,
  onTilesComplete,
  tileSceneKey,
}: SatellitePanelProps) {
  const objects = phase === "before" ? scene.before.objects : scene.after.objects;

  return (
    <section className="satellite-panel">
      <div className="panel-header">
        <span className="panel-badge">{phase === "before" ? "T0 / BEFORE" : "T1 / AFTER"}</span>
        <span className="panel-badge">{scene.title}</span>
      </div>
      <SceneRenderer objects={objects} highlightedObjectIds={highlightedObjectIds} />
      <TileReveal sceneId={tileSceneKey ?? scene.id} phase={phase} onComplete={onTilesComplete} />
    </section>
  );
}
