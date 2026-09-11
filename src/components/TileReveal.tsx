"use client";

import { useEffect, useMemo, useState } from "react";

type TileRevealProps = {
  sceneId: string;
  phase: "before" | "after";
};

const TOTAL_TILES = 30;

export function TileReveal({ sceneId, phase }: TileRevealProps) {
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

    const tileTimer = window.setInterval(() => {
      setRevealed((current) => {
        const next = Math.min(TOTAL_TILES, current + 2);
        if (next >= TOTAL_TILES) {
          window.clearInterval(tileTimer);
          setStatus("MOSAIC ASSEMBLED");
          window.setTimeout(() => setStatus("ANALYZING DELTA"), 340);
          window.setTimeout(() => setStatus(""), 900);
        }
        return next;
      });
    }, phase === "after" ? 58 : 42);

    return () => window.clearInterval(tileTimer);
  }, [sceneId, phase]);

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
