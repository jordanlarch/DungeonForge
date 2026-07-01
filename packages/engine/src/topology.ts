import type { CorridorEdge, DoorType, GenerationOptions, Point, Rect, RoomNode } from "./types.js";
import { SeededRandom } from "./utils.js";

interface RawRoom {
  id: string;
  bounds: Rect;
}

const DENSITY_ROOM_COUNTS: Record<GenerationOptions["density"], [number, number]> = {
  sparse: [0.7, 0.85],
  scattered: [0.85, 1.0],
  dense: [1.0, 1.15],
};

export interface TopologyResult {
  rooms: RoomNode[];
  corridors: CorridorEdge[];
  entranceRoomId: string;
  occupied: Set<string>;
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

function rectOverlaps(a: Rect, b: Rect, padding = 1): boolean {
  return !(
    a.x + a.width + padding <= b.x ||
    b.x + b.width + padding <= a.x ||
    a.y + a.height + padding <= b.y ||
    b.y + b.height + padding <= a.y
  );
}

function carveRoomTiles(bounds: Rect): Point[] {
  const tiles: Point[] = [];
  for (let y = bounds.y; y < bounds.y + bounds.height; y++) {
    for (let x = bounds.x; x < bounds.x + bounds.width; x++) {
      tiles.push({ x, y });
    }
  }
  return tiles;
}

function placeRooms(
  rng: SeededRandom,
  options: GenerationOptions
): RawRoom[] {
  const [minFactor, maxFactor] = DENSITY_ROOM_COUNTS[options.density];
  const targetCount = Math.round(
    options.roomCount * rng.next() * (maxFactor - minFactor) + options.roomCount * minFactor
  );
  const count = Math.max(5, Math.min(40, targetCount));

  const rooms: RawRoom[] = [];
  const maxAttempts = count * 40;

  for (let attempt = 0; attempt < maxAttempts && rooms.length < count; attempt++) {
    const width = rng.int(3, 6);
    const height = rng.int(3, 5);
    const x = rng.int(1, options.gridWidth - width - 2);
    const y = rng.int(1, options.gridHeight - height - 2);
    const bounds: Rect = { x, y, width, height };

    if (rooms.some((r) => rectOverlaps(r.bounds, bounds))) {
      continue;
    }

    rooms.push({ id: `room-${rooms.length + 1}`, bounds });
  }

  return rooms;
}

function roomCenter(room: RawRoom): Point {
  return {
    x: Math.floor(room.bounds.x + room.bounds.width / 2),
    y: Math.floor(room.bounds.y + room.bounds.height / 2),
  };
}

interface WeightedEdge {
  a: number;
  b: number;
  dist: number;
}

function connectRooms(rawRooms: RawRoom[], rng: SeededRandom): WeightedEdge[] {
  if (rawRooms.length <= 1) {
    return [];
  }

  const centers = rawRooms.map(roomCenter);
  const weighted: WeightedEdge[] = [];

  for (let i = 0; i < rawRooms.length; i++) {
    for (let j = i + 1; j < rawRooms.length; j++) {
      const dx = centers[i].x - centers[j].x;
      const dy = centers[i].y - centers[j].y;
      weighted.push({ a: i, b: j, dist: dx * dx + dy * dy });
    }
  }

  weighted.sort((x, y) => x.dist - y.dist);

  const parent = rawRooms.map((_, i) => i);
  function find(i: number): number {
    if (parent[i] !== i) parent[i] = find(parent[i]);
    return parent[i];
  }

  const mst: WeightedEdge[] = [];
  for (const edge of weighted) {
    const pa = find(edge.a);
    const pb = find(edge.b);
    if (pa !== pb) {
      parent[pa] = pb;
      mst.push(edge);
    }
  }

  const extraCount = rng.int(0, Math.max(1, Math.floor(rawRooms.length / 4)));
  const extra: WeightedEdge[] = [];
  for (let i = 0; i < extraCount; i++) {
    const a = rng.int(0, rawRooms.length - 1);
    const b = rng.int(0, rawRooms.length - 1);
    if (a !== b) {
      extra.push({ a, b, dist: 0 });
    }
  }

  return [...mst, ...extra];
}

function carveCorridor(
  from: Point,
  to: Point,
  occupied: Set<string>
): Point[] {
  const points: Point[] = [];
  let x = from.x;
  let y = from.y;

  while (x !== to.x) {
    occupied.add(cellKey(x, y));
    points.push({ x, y });
    x += x < to.x ? 1 : -1;
  }
  while (y !== to.y) {
    occupied.add(cellKey(x, y));
    points.push({ x, y });
    y += y < to.y ? 1 : -1;
  }
  occupied.add(cellKey(x, y));
  points.push({ x, y });
  return points;
}

function pickDoorType(rng: SeededRandom): DoorType {
  const roll = rng.next();
  if (roll < 0.65) return "open";
  if (roll < 0.9) return "closed";
  return "secret";
}

function findEdgePoint(room: RawRoom, toward: Point): Point {
  const cx = room.bounds.x + Math.floor(room.bounds.width / 2);
  const cy = room.bounds.y + Math.floor(room.bounds.height / 2);
  const dx = toward.x - cx;
  const dy = toward.y - cy;

  if (Math.abs(dx) > Math.abs(dy)) {
    const x = dx > 0 ? room.bounds.x + room.bounds.width - 1 : room.bounds.x;
    return { x, y: cy };
  }
  const y = dy > 0 ? room.bounds.y + room.bounds.height - 1 : room.bounds.y;
  return { x: cx, y };
}

export function generateTopology(
  rng: SeededRandom,
  options: GenerationOptions
): TopologyResult {
  const rawRooms = placeRooms(rng, options);
  const edges = connectRooms(rawRooms, rng);
  const occupied = new Set<string>();

  const rooms: RoomNode[] = rawRooms.map((room, index) => {
    const tiles = carveRoomTiles(room.bounds);
    tiles.forEach((t) => occupied.add(cellKey(t.x, t.y)));
    return {
      id: room.id,
      number: index + 1,
      name: `Room ${index + 1}`,
      bounds: room.bounds,
      tiles,
      content: {
        role: "empty",
        lightLevel: "dim",
        description: "",
      },
    };
  });

  const corridors: CorridorEdge[] = [];
  const centers = rawRooms.map(roomCenter);

  edges.forEach(({ a: aIndex, b: bIndex }, idx) => {
    const fromRoom = rawRooms[aIndex];
    const toRoom = rawRooms[bIndex];
    const fromCenter = centers[aIndex];
    const toCenter = centers[bIndex];
    const start = findEdgePoint(fromRoom, toCenter);
    const end = findEdgePoint(toRoom, fromCenter);
    const points = carveCorridor(start, end, occupied);

    corridors.push({
      id: `corridor-${idx + 1}`,
      fromRoomId: fromRoom.id,
      toRoomId: toRoom.id,
      door: pickDoorType(rng),
      points,
    });
  });

  const entranceRoomId = rawRooms.reduce((best, room, index) => {
    const score = room.bounds.x + room.bounds.y;
    const bestScore = rawRooms[best].bounds.x + rawRooms[best].bounds.y;
    return score < bestScore ? index : best;
  }, 0);

  return {
    rooms,
    corridors,
    entranceRoomId: rawRooms[entranceRoomId].id,
    occupied,
  };
}

export function renderAsciiMap(
  options: GenerationOptions,
  topology: TopologyResult
): string {
  const grid: string[][] = Array.from({ length: options.gridHeight }, () =>
    Array.from({ length: options.gridWidth }, () => " ")
  );

  for (const room of topology.rooms) {
    for (const tile of room.tiles) {
      grid[tile.y][tile.x] = ".";
    }
    const label = String(room.number % 10);
    const cx = room.bounds.x + Math.floor(room.bounds.width / 2);
    const cy = room.bounds.y + Math.floor(room.bounds.height / 2);
    grid[cy][cx] = label;
  }

  for (const corridor of topology.corridors) {
    for (const point of corridor.points) {
      if (grid[point.y][point.x] === " ") {
        grid[point.y][point.x] = "#";
      }
    }
  }

  return grid.map((row) => row.join("")).join("\n");
}
