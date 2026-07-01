import type {
  CorridorEdge,
  DoorType,
  FloorInfo,
  GenerationOptions,
  Point,
  Rect,
  RoomNode,
  StairLink,
} from "./types.js";
import { SeededRandom } from "./utils.js";

interface RawRoom {
  id: string;
  bounds: Rect;
  floor: number;
}

const DENSITY_ROOM_COUNTS: Record<GenerationOptions["density"], [number, number]> = {
  sparse: [0.7, 0.85],
  scattered: [0.85, 1.0],
  dense: [1.0, 1.15],
};

export interface TopologyResult {
  rooms: RoomNode[];
  corridors: CorridorEdge[];
  stairs: StairLink[];
  floors: FloorInfo[];
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

function placeRoomsOnFloor(
  rng: SeededRandom,
  options: GenerationOptions,
  floor: number,
  count: number,
  idOffset: number
): RawRoom[] {
  const rooms: RawRoom[] = [];
  const maxAttempts = count * 40;

  for (let attempt = 0; attempt < maxAttempts && rooms.length < count; attempt++) {
    const width = rng.int(3, 6);
    const height = rng.int(3, 5);
    const x = rng.int(1, options.gridWidth - width - 2);
    const y = rng.int(1, options.gridHeight - height - 2);
    const bounds: Rect = { x, y, width, height };

    if (rooms.some((r) => rectOverlaps(r.bounds, bounds))) continue;

    rooms.push({
      id: `f${floor}-room-${idOffset + rooms.length + 1}`,
      bounds,
      floor,
    });
  }

  return rooms;
}

interface WeightedEdge {
  a: number;
  b: number;
  dist: number;
}

function roomCenter(room: RawRoom): Point {
  return {
    x: Math.floor(room.bounds.x + room.bounds.width / 2),
    y: Math.floor(room.bounds.y + room.bounds.height / 2),
  };
}

function connectRooms(rawRooms: RawRoom[], rng: SeededRandom): WeightedEdge[] {
  if (rawRooms.length <= 1) return [];

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
  for (let i = 0; i < extraCount; i++) {
    const a = rng.int(0, rawRooms.length - 1);
    const b = rng.int(0, rawRooms.length - 1);
    if (a !== b) mst.push({ a, b, dist: 0 });
  }

  return mst;
}

function carveCorridor(from: Point, to: Point, occupied: Set<string>): Point[] {
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

function pickDoorType(rng: SeededRandom, secretChance: number): DoorType {
  if (rng.chance(secretChance)) return "secret";
  return rng.chance(0.7) ? "open" : "closed";
}

function findEdgePoint(room: RawRoom, toward: Point): Point {
  const cx = room.bounds.x + Math.floor(room.bounds.width / 2);
  const cy = room.bounds.y + Math.floor(room.bounds.height / 2);
  const dx = toward.x - cx;
  const dy = toward.y - cy;

  if (Math.abs(dx) > Math.abs(dy)) {
    return { x: dx > 0 ? room.bounds.x + room.bounds.width - 1 : room.bounds.x, y: cy };
  }
  return { x: cx, y: dy > 0 ? room.bounds.y + room.bounds.height - 1 : room.bounds.y };
}

function buildFloorTopology(
  rng: SeededRandom,
  options: GenerationOptions,
  floor: number,
  roomCount: number,
  roomNumberOffset: number
): {
  rawRooms: RawRoom[];
  rooms: RoomNode[];
  corridors: CorridorEdge[];
  occupied: Set<string>;
} {
  const rawRooms = placeRoomsOnFloor(rng, options, floor, roomCount, roomNumberOffset);
  const edges = connectRooms(rawRooms, rng);
  const occupied = new Set<string>();
  const centers = rawRooms.map(roomCenter);

  const rooms: RoomNode[] = rawRooms.map((room, index) => {
    const tiles = carveRoomTiles(room.bounds);
    tiles.forEach((t) => occupied.add(cellKey(t.x, t.y)));
    return {
      id: room.id,
      number: roomNumberOffset + index + 1,
      name: `Room ${roomNumberOffset + index + 1}`,
      bounds: room.bounds,
      tiles,
      floor,
      content: { role: "empty", lightLevel: "dim", description: "" },
    };
  });

  const corridors: CorridorEdge[] = edges.map(({ a, b }, idx) => {
    const fromRoom = rawRooms[a];
    const toRoom = rawRooms[b];
    const start = findEdgePoint(fromRoom, centers[b]);
    const end = findEdgePoint(toRoom, centers[a]);
    return {
      id: `f${floor}-corridor-${idx + 1}`,
      fromRoomId: fromRoom.id,
      toRoomId: toRoom.id,
      door: pickDoorType(rng, options.secretDoorChance),
      points: carveCorridor(start, end, occupied),
      floor,
    };
  });

  return { rawRooms, rooms, corridors, occupied };
}

export function generateTopology(
  rng: SeededRandom,
  options: GenerationOptions
): TopologyResult {
  const floorCount = Math.max(1, Math.min(5, options.floorCount));
  const [minFactor, maxFactor] = DENSITY_ROOM_COUNTS[options.density];
  const totalTarget = Math.round(
    options.roomCount * (minFactor + rng.next() * (maxFactor - minFactor))
  );
  const roomsPerFloor = Math.max(3, Math.floor(totalTarget / floorCount));

  const allRooms: RoomNode[] = [];
  const allCorridors: CorridorEdge[] = [];
  const floors: FloorInfo[] = [];
  const stairs: StairLink[] = [];
  const stairRoomIds = new Set<string>();
  let roomOffset = 0;
  let entranceRoomId = "";
  const occupied = new Set<string>();

  const floorRoomLists: RawRoom[][] = [];

  for (let f = 1; f <= floorCount; f++) {
    const result = buildFloorTopology(rng, options, f, roomsPerFloor, roomOffset);
    floorRoomLists.push(result.rawRooms);
    allRooms.push(...result.rooms);
    allCorridors.push(...result.corridors);
    floors.push({
      number: f,
      name: f === 1 ? "Upper Level" : f === floorCount ? "Deep Level" : `Level ${f}`,
      roomIds: result.rooms.map((r) => r.id),
    });
    result.rooms.forEach((t) => t.tiles.forEach((p) => occupied.add(cellKey(p.x, p.y))));
    roomOffset += result.rooms.length;
  }

  entranceRoomId = floorRoomLists[0]?.reduce((bestId, room, idx, arr) => {
    const best = arr.find((r) => r.id === bestId)!;
    const score = room.bounds.x + room.bounds.y;
    const bestScore = best.bounds.x + best.bounds.y;
    return score < bestScore ? room.id : bestId;
  }, floorRoomLists[0][0]?.id ?? "") ?? "";

  for (let f = 1; f < floorCount; f++) {
    const upper = floorRoomLists[f - 1];
    const lower = floorRoomLists[f];
    if (!upper?.length || !lower?.length) continue;

    const upRoom = rng.pick(upper);
    const downRoom = rng.pick(lower);
    stairRoomIds.add(upRoom.id);
    stairRoomIds.add(downRoom.id);
    stairs.push({
      id: `stairs-${f}-${f + 1}`,
      fromRoomId: upRoom.id,
      toRoomId: downRoom.id,
      fromFloor: f,
      toFloor: f + 1,
    });
  }

  return {
    rooms: allRooms,
    corridors: allCorridors,
    stairs,
    floors,
    entranceRoomId,
    occupied,
  };
}

export function getStairRoomIds(topology: TopologyResult): Set<string> {
  const ids = new Set<string>();
  for (const s of topology.stairs) {
    ids.add(s.fromRoomId);
    ids.add(s.toRoomId);
  }
  return ids;
}

export function renderAsciiMap(
  options: GenerationOptions,
  topology: TopologyResult,
  activeFloor = 1
): string {
  const grid: string[][] = Array.from({ length: options.gridHeight }, () =>
    Array.from({ length: options.gridWidth }, () => " ")
  );

  for (const room of topology.rooms.filter((r) => r.floor === activeFloor)) {
    for (const tile of room.tiles) {
      grid[tile.y][tile.x] = ".";
    }
    const cx = room.bounds.x + Math.floor(room.bounds.width / 2);
    const cy = room.bounds.y + Math.floor(room.bounds.height / 2);
    grid[cy][cx] = String(room.number % 10);
  }

  for (const corridor of topology.corridors.filter((c) => c.floor === activeFloor)) {
    for (const point of corridor.points) {
      if (grid[point.y][point.x] === " ") grid[point.y][point.x] = "#";
    }
  }

  return grid.map((row) => row.join("")).join("\n");
}
