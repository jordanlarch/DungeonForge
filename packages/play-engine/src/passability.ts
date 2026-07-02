import type { DungeonDocument, Point } from "@dungeonforge/engine";

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function buildPassableSet(dungeon: DungeonDocument, floor: number): Set<string> {
  const passable = new Set<string>();
  for (const room of dungeon.rooms.filter((r) => r.floor === floor)) {
    for (const t of room.tiles) passable.add(cellKey(t.x, t.y));
  }
  for (const corridor of dungeon.corridors.filter((c) => c.floor === floor)) {
    for (const p of corridor.points) passable.add(cellKey(p.x, p.y));
  }
  return passable;
}

export function isPassable(dungeon: DungeonDocument, floor: number, point: Point): boolean {
  return buildPassableSet(dungeon, floor).has(cellKey(point.x, point.y));
}

export function isAdjacent(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

export function roomAtPoint(dungeon: DungeonDocument, floor: number, point: Point) {
  return dungeon.rooms.find(
    (r) =>
      r.floor === floor &&
      point.x >= r.bounds.x &&
      point.x < r.bounds.x + r.bounds.width &&
      point.y >= r.bounds.y &&
      point.y < r.bounds.y + r.bounds.height
  );
}

export function entrancePosition(dungeon: DungeonDocument): Point {
  const entrance = dungeon.rooms.find((r) => r.id === dungeon.entranceRoomId);
  if (!entrance) return { x: 1, y: 1 };
  return {
    x: Math.floor(entrance.bounds.x + entrance.bounds.width / 2),
    y: Math.floor(entrance.bounds.y + entrance.bounds.height / 2),
  };
}
