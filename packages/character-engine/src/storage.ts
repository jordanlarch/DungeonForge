import type { CharacterDocument, PartyRoster } from "./types.js";

const PARTY_KEY = "df_party";
const MAX_PARTY = 6;

function migrateRoster(raw: unknown): PartyRoster {
  const base = raw as PartyRoster & { schemaVersion?: number; partyMemberIds?: string[] };
  if (base.schemaVersion === 2 && base.partyMemberIds) return base;
  const characters = base.characters ?? [];
  const activeId = base.activeCharacterId ?? characters[0]?.id ?? null;
  return {
    schemaVersion: 2,
    activeCharacterId: activeId,
    partyMemberIds: activeId ? [activeId] : characters.slice(0, MAX_PARTY).map((c) => c.id),
    characters,
  };
}

export function loadParty(): PartyRoster {
  if (typeof localStorage === "undefined") {
    return { schemaVersion: 2, activeCharacterId: null, partyMemberIds: [], characters: [] };
  }
  const raw = localStorage.getItem(PARTY_KEY);
  if (!raw) return { schemaVersion: 2, activeCharacterId: null, partyMemberIds: [], characters: [] };
  try {
    return migrateRoster(JSON.parse(raw));
  } catch {
    return { schemaVersion: 2, activeCharacterId: null, partyMemberIds: [], characters: [] };
  }
}

export function saveParty(roster: PartyRoster): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(PARTY_KEY, JSON.stringify({ ...roster, schemaVersion: 2 }));
  }
}

export function upsertCharacter(character: CharacterDocument): PartyRoster {
  const roster = loadParty();
  const idx = roster.characters.findIndex((c) => c.id === character.id);
  if (idx >= 0) roster.characters[idx] = character;
  else roster.characters.push(character);
  if (!roster.activeCharacterId) roster.activeCharacterId = character.id;
  if (!roster.partyMemberIds.includes(character.id) && roster.partyMemberIds.length < MAX_PARTY) {
    roster.partyMemberIds.push(character.id);
  }
  saveParty(roster);
  return roster;
}

export function deleteCharacter(id: string): PartyRoster {
  const roster = loadParty();
  roster.characters = roster.characters.filter((c) => c.id !== id);
  roster.partyMemberIds = roster.partyMemberIds.filter((pid) => pid !== id);
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

export function togglePartyMember(id: string): PartyRoster {
  const roster = loadParty();
  if (!roster.characters.some((c) => c.id === id)) return roster;
  if (roster.partyMemberIds.includes(id)) {
    roster.partyMemberIds = roster.partyMemberIds.filter((pid) => pid !== id);
  } else if (roster.partyMemberIds.length < MAX_PARTY) {
    roster.partyMemberIds.push(id);
  }
  saveParty(roster);
  return roster;
}

export function getActiveCharacter(): CharacterDocument | null {
  const roster = loadParty();
  if (!roster.activeCharacterId) return roster.characters[0] ?? null;
  return roster.characters.find((c) => c.id === roster.activeCharacterId) ?? null;
}

export function getPartyMembers(): CharacterDocument[] {
  const roster = loadParty();
  return roster.partyMemberIds
    .map((id) => roster.characters.find((c) => c.id === id))
    .filter((c): c is CharacterDocument => !!c);
}

export { MAX_PARTY };
