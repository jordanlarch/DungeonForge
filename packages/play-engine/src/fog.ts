import type { DungeonDocument, Point } from "@dungeonforge/engine";
import type { FogVisibility } from "./types.js";
import { cellKey } from "./passability.js";

const VISION_RADIUS = 6;

export function createInitialFog(dungeon: DungeonDocument): Record<string, FogVisibility> {
  const fog: Record<string, FogVisibility> = {};
  for (let y = 0; y < dungeon.grid.height; y++) {
    for (let x = 0; x < dungeon.grid.width; x++) {
      fog[cellKey(x, y)] = "hidden";
    }
  }
  return fog;
}

export function revealAroundPoint(
  fog: Record<string, FogVisibility>,
  dungeon: DungeonDocument,
  _floor: number,
  center: Point,
  radius = VISION_RADIUS
): Record<string, FogVisibility> {
  const next = { ...fog };
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > radius) continue;
      const x = center.x + dx;
      const y = center.y + dy;
      if (x < 0 || y < 0 || x >= dungeon.grid.width || y >= dungeon.grid.height) continue;
      const key = cellKey(x, y);
      const dist = Math.abs(dx) + Math.abs(dy);
      next[key] = dist <= 2 ? "visible" : "explored";
    }
  }
  return next;
}

export function applyFogForTokens(
  fog: Record<string, FogVisibility>,
  dungeon: DungeonDocument,
  floor: number,
  positions: Point[]
): Record<string, FogVisibility> {
  let next = { ...fog };
  for (const pos of positions) {
    next = revealAroundPoint(next, dungeon, floor, pos);
  }
  return next;
}
