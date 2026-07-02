import { useEffect, useMemo, useRef } from "react";
import type { DungeonDocument } from "@dungeonforge/engine";
import type { PlaySession } from "@dungeonforge/play-engine";
import { renderDungeonSvg } from "@dungeonforge/renderer";

interface MapViewportProps {
  dungeon: DungeonDocument;
  session: PlaySession;
  onMove: (dx: number, dy: number) => void;
  onSelectToken: (tokenId: string) => void;
}

export default function MapViewport({ dungeon, session, onMove, onSelectToken }: MapViewportProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const cellPx = 50;

  const svg = useMemo(
    () =>
      renderDungeonSvg(dungeon, {
        activeFloor: session.activeFloor,
        theme: dungeon.metadata.mapTheme,
        tokens: session.tokens,
        fog: session.fog,
        showFog: true,
      }),
    [dungeon, session]
  );

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
      };
      const delta = map[e.key];
      if (delta) {
        e.preventDefault();
        onMove(delta[0]!, delta[1]!);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onMove]);

  const mapW = dungeon.grid.width * cellPx;
  const mapH = dungeon.grid.height * cellPx;

  return (
    <div className="play-map-viewport" ref={viewportRef}>
      <div className="map-transform play-map-inner">
        <div
          className="map-hit-layer"
          style={{ width: mapW, height: mapH, position: "relative" }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        {session.tokens
          .filter((t) => t.floor === session.activeFloor)
          .map((token) => (
            <button
              key={token.id}
              type="button"
              className={`token-hit ${session.activeTokenId === token.id ? "selected" : ""}`}
              style={{
                left: token.position.x * cellPx,
                top: token.position.y * cellPx,
                width: cellPx,
                height: cellPx,
              }}
              onClick={() => onSelectToken(token.id)}
              aria-label={token.name}
            />
          ))}
      </div>
      <p className="map-hint">Arrow keys move 5 ft. Click tokens to select.</p>
    </div>
  );
}
