import type { CharacterDocument, PartyRoster } from "./types.js";

const PARTY_KEY = "df_party";

export function loadParty(): PartyRoster {
  if (typeof localStorage === "undefined") {
    return { schemaVersion: 1, activeCharacterId: null, characters: [] };
  }
  const raw = localStorage.getItem(PARTY_KEY);
  if (!raw) return { schemaVersion: 1, activeCharacterId: null, characters: [] };
  try {
    return JSON.parse(raw) as PartyRoster;
  } catch {
    return { schemaVersion: 1, activeCharacterId: null, characters: [] };
  }
}

export function saveParty(roster: PartyRoster): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(PARTY_KEY, JSON.stringify(roster));
  }
}

export function upsertCharacter(character: CharacterDocument): PartyRoster {
  const roster = loadParty();
  const idx = roster.characters.findIndex((c) => c.id === character.id);
  if (idx >= 0) roster.characters[idx] = character;
  else roster.characters.push(character);
  if (!roster.activeCharacterId) roster.activeCharacterId = character.id;
  saveParty(roster);
  return roster;
}

export function deleteCharacter(id: string): PartyRoster {
  const roster = loadParty();
  roster.characters = roster.characters.filter((c) => c.id !== id);
  if (roster.activeCharacterId === id) {
    roster.activeCharacterId = roster.characters[0]?.id ?? null;
  }
  saveParty(roster);
  return roster;
}

export function setActiveCharacter(id: string): PartyRoster {
  const roster = loadParty();
  if (roster.characters.some((c) => c.id === id)) {
    roster.activeCharacterId = id;
    saveParty(roster);
  }
  return roster;
}

export function getActiveCharacter(): CharacterDocument | null {
  const roster = loadParty();
  if (!roster.activeCharacterId) return roster.characters[0] ?? null;
  return roster.characters.find((c) => c.id === roster.activeCharacterId) ?? null;
}
