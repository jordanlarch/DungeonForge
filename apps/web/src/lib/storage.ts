import type { DungeonDocument } from "@dungeonforge/engine";
import type { PlaySession } from "@dungeonforge/play-engine";

const DUNGEON_KEY = "df_dungeon";
const SESSION_KEY = "df_play_session";

export function saveDungeon(dungeon: DungeonDocument): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(DUNGEON_KEY, JSON.stringify(dungeon));
  }
}

export function loadDungeon(): DungeonDocument | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(DUNGEON_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DungeonDocument;
  } catch {
    return null;
  }
}

export function savePlaySession(session: PlaySession): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}

export function loadPlaySession(): PlaySession | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlaySession;
  } catch {
    return null;
  }
}

export function clearPlaySession(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}
