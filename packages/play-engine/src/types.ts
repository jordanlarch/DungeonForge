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
  schemaVersion: 1;
  id: string;
  dungeonId: string;
  activeFloor: number;
  tokens: GridToken[];
  fog: Record<string, FogVisibility>;
  activeTokenId: string | null;
  combat: CombatState | null;
  phase: "exploration" | "combat";
  log: string[];
  createdAt: string;
}

export interface PlaySessionInput {
  dungeon: DungeonDocument;
  character: {
    id: string;
    name: string;
    hp: { max: number; current: number };
    armorClass: number;
    attackBonus: number;
    damage: string;
    damageType: string;
    initiativeBonus: number;
    speed: number;
  };
}

export type PlayAction =
  | { type: "move"; tokenId: string; to: Point }
  | { type: "select_token"; tokenId: string }
  | { type: "start_combat" }
  | { type: "attack"; targetTokenId: string }
  | { type: "use_action"; action: import("@dungeonforge/rules-engine").SrdAction }
  | { type: "end_turn" };

export interface PlayActionResult {
  session: PlaySession;
  messages: string[];
}
