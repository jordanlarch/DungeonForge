import type { DungeonDocument, Point } from "@dungeonforge/engine";
import type { CombatState } from "@dungeonforge/rules-engine";

export type FogVisibility = "hidden" | "explored" | "visible";

export type TokenKind = "pc" | "monster";

export interface GridToken {
  id: string;
  kind: TokenKind;
  name: string;
  characterId?: string;
  monsterRefId?: string;
  position: Point;
  floor: number;
  color: string;
}

export interface PlaySession {
  schemaVersion: 2;
  id: string;
  dungeonId: string;
  activeFloor: number;
  tokens: GridToken[];
  fog: Record<string, FogVisibility>;
  activeTokenId: string | null;
  partyCharacterIds: string[];
  combat: CombatState | null;
  phase: "exploration" | "combat";
  disarmedTrapRoomIds: string[];
  log: string[];
  createdAt: string;
}

export interface PlayCharacterInput {
  id: string;
  name: string;
  hp: { max: number; current: number };
  armorClass: number;
  attackBonus: number;
  damage: string;
  damageType: string;
  initiativeBonus: number;
  speed: number;
  abilities?: Record<string, number>;
  spellAttackBonus?: number;
}

export interface PlaySessionInput {
  dungeon: DungeonDocument;
  party: PlayCharacterInput[];
}

export type PlayAction =
  | { type: "move"; tokenId: string; to: Point }
  | { type: "select_token"; tokenId: string }
  | { type: "start_combat" }
  | { type: "attack"; targetTokenId: string }
  | { type: "cast_spell"; spellId: string; targetTokenId: string }
  | { type: "use_action"; action: import("@dungeonforge/rules-engine").SrdAction }
  | { type: "end_turn" };

export interface PlayActionResult {
  session: PlaySession;
  messages: string[];
}

export const PC_COLORS = ["#7eb8ff", "#6aab6a", "#c9a227", "#c45c5c", "#a080c0", "#7eb8ff"];
