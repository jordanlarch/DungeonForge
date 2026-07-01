export type EncounterDifficulty = "low" | "moderate" | "high";

export type RoomRole = "empty" | "encounter" | "trap" | "treasure" | "entrance";

export type LightLevel = "bright" | "dim" | "dark";

export type DoorType = "open" | "closed" | "secret";

export interface GenerationOptions {
  seed: number;
  partyLevel: number;
  partySize: number;
  difficulty: EncounterDifficulty;
  roomCount: number;
  gridWidth: number;
  gridHeight: number;
  motifId: string;
  density: "sparse" | "scattered" | "dense";
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CorridorEdge {
  id: string;
  fromRoomId: string;
  toRoomId: string;
  door: DoorType;
  points: Point[];
}

export interface MonsterRef {
  id: string;
  name: string;
  cr: string;
  xp: number;
  count: number;
}

export interface EncounterContent {
  difficulty: EncounterDifficulty;
  xpBudget: number;
  xpSpent: number;
  monsters: MonsterRef[];
}

export interface TrapContent {
  trapId: string;
  name: string;
  severity: string;
  trigger: string;
  summary: string;
  saveDc: number | null;
  damage: string | null;
  detectDc: number;
  detectSkill: string;
}

export interface TreasureContent {
  coins: { type: string; amount: number }[];
  magicItems: { name: string; rarity: string }[];
  description: string;
}

export interface RoomContent {
  role: RoomRole;
  lightLevel: LightLevel;
  description: string;
  encounter?: EncounterContent;
  trap?: TrapContent;
  treasure?: TreasureContent;
  terrain?: string;
}

export interface RoomNode {
  id: string;
  number: number;
  name: string;
  bounds: Rect;
  tiles: Point[];
  content: RoomContent;
}

export interface DungeonMetadata {
  seed: number;
  name: string;
  partyLevel: number;
  partySize: number;
  difficulty: EncounterDifficulty;
  motifId: string;
  motifName: string;
  generatedAt: string;
  srdVersion: "5.2.1";
  license: string;
}

export interface DungeonDocument {
  schemaVersion: 1;
  metadata: DungeonMetadata;
  grid: {
    width: number;
    height: number;
    cellSizeFeet: number;
  };
  rooms: RoomNode[];
  corridors: CorridorEdge[];
  entranceRoomId: string;
}

export interface SrdMonster {
  id: string;
  name: string;
  cr: string;
  crNumeric: number;
  xp: number;
  type: string;
  size: string;
  armorClass: number;
  hpMax: number;
}

export interface SrdTrap {
  id: string;
  name: string;
  severity: string;
  levelBands: {
    minLevel: number;
    maxLevel: number;
    saveDc: number | null;
    damage: string | null;
    area?: string;
    depth?: string;
    note?: string;
  }[];
  trigger: string;
  detectDc: number;
  detectSkill: string;
  summary: string;
}

export interface SrdMagicItem {
  name: string;
  rarity: string;
  category: string;
}

export interface Motif {
  id: string;
  name: string;
  monsterTypes: string[];
  trapIds: string[];
  lightLevel: LightLevel;
  description: string;
}
