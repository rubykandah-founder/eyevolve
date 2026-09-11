"use client";

import { useEffect, useMemo, useState } from "react";

type TileRevealProps = {
  sceneId: string;
  phase: "before" | "after";
  onComplete?: (phase: "before" | "after") => void;
};

const TOTAL_TILES = 30;

export function TileReveal({ sceneId, phase, onComplete }: TileRevealProps) {
  const [revealed, setRevealed] = useState(0);
  const [status, setStatus] = useState("ACQUIRING SATELLITE TILES");
  const order = useMemo(
    () =>
      Array.from({ length: TOTAL_TILES }, (_, index) => index).sort(
        (a, b) => ((a * 17 + 7) % TOTAL_TILES) - ((b * 17 + 7) % TOTAL_TILES),
      ),
    [],
  );

  useEffect(() => {
    setRevealed(0);
    setStatus("ACQUIRING SATELLITE TILES");
    const timers: number[] = [];

    const tileTimer = window.setInterval(() => {
      setRevealed((current) => {
        const next = Math.min(TOTAL_TILES, current + 1);
        if (next >= TOTAL_TILES) {
          window.clearInterval(tileTimer);
          setStatus("MOSAIC ASSEMBLED");
          timers.push(window.setTimeout(() => setStatus("ANALYZING DELTA"), 650));
          timers.push(
            window.setTimeout(() => {
              setStatus("");
              onComplete?.(phase);
            }, 1450),
          );
        }
        return next;
      });
    }, phase === "after" ? 110 : 95);

    return () => {
      window.clearInterval(tileTimer);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [sceneId, phase, onComplete]);

  if (!status && revealed >= TOTAL_TILES) {
    return null;
  }

  return (
    <>
      <div className="tile-reveal" aria-hidden="true">
        {order.map((tileIndex, displayIndex) => (
          <div
            key={tileIndex}
            className={`tile ${displayIndex < revealed ? "revealed" : ""}`}
          />
        ))}
      </div>
      <div className="tile-status">
        <div>{status || "ANALYZING DELTA"}</div>
        <div className="tile-count">
          {Math.min(revealed, TOTAL_TILES)} / {TOTAL_TILES}
        </div>
      </div>
    </>
  );
}
