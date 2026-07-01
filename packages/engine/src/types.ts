export type EncounterDifficulty = "low" | "moderate" | "high";
export type MapTheme = "parchment" | "darkStone";

export type RoomRole =
  | "empty"
  | "encounter"
  | "trap"
  | "treasure"
  | "entrance"
  | "stairs"
  | "npc";

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
  floorCount: number;
  encounterDensity: number;
  trapDensity: number;
  treasureDensity: number;
  secretDoorChance: number;
  hazardChance: number;
  npcDensity: number;
  mapTheme: MapTheme;
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
  floor: number;
}

export interface StairLink {
  id: string;
  fromRoomId: string;
  toRoomId: string;
  fromFloor: number;
  toFloor: number;
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

export interface HazardContent {
  hazardId: string;
  name: string;
  summary: string;
}

export interface NpcContent {
  templateId: string;
  name: string;
  personality: string;
  dialogue: string[];
  secret: string;
}

export interface RoomNarrative {
  template: string;
  hook?: string;
  aiEnhanced?: string;
}

export interface RoomContent {
  role: RoomRole;
  lightLevel: LightLevel;
  description: string;
  encounter?: EncounterContent;
  trap?: TrapContent;
  treasure?: TreasureContent;
  hazard?: HazardContent;
  npc?: NpcContent;
  narrative?: RoomNarrative;
  terrain?: string;
}

export interface RoomNode {
  id: string;
  number: number;
  name: string;
  bounds: Rect;
  tiles: Point[];
  floor: number;
  content: RoomContent;
}

export interface FloorInfo {
  number: number;
  name: string;
  roomIds: string[];
}

export interface DungeonMetadata {
  seed: number;
  name: string;
  partyLevel: number;
  partySize: number;
  difficulty: EncounterDifficulty;
  motifId: string;
  motifName: string;
  mapTheme: MapTheme;
  generatedAt: string;
  srdVersion: "5.2.1";
  license: string;
  hook?: string;
  rumor?: string;
}

export interface DungeonDocument {
  schemaVersion: 2;
  metadata: DungeonMetadata;
  grid: {
    width: number;
    height: number;
    cellSizeFeet: number;
  };
  floors: FloorInfo[];
  rooms: RoomNode[];
  corridors: CorridorEdge[];
  stairs: StairLink[];
  entranceRoomId: string;
}

export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  seed: 42,
  partyLevel: 3,
  partySize: 4,
  difficulty: "moderate",
  roomCount: 12,
  gridWidth: 60,
  gridHeight: 40,
  motifId: "abandoned",
  density: "scattered",
  floorCount: 1,
  encounterDensity: 35,
  trapDensity: 20,
  treasureDensity: 20,
  secretDoorChance: 0.15,
  hazardChance: 0.15,
  npcDensity: 10,
  mapTheme: "parchment",
};

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
