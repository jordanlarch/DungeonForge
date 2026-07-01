import monstersData from "@dungeonforge/srd-data/monsters" with { type: "json" };
import trapsData from "@dungeonforge/srd-data/traps" with { type: "json" };
import magicItemsData from "@dungeonforge/srd-data/magic-items" with { type: "json" };
import encounterXpData from "@dungeonforge/srd-data/encounter-xp" with { type: "json" };
import treasureTablesData from "@dungeonforge/srd-data/treasure-tables" with { type: "json" };
import motifsData from "@dungeonforge/srd-data/motifs" with { type: "json" };
import hazardsData from "@dungeonforge/srd-data/hazards" with { type: "json" };
import npcTemplatesData from "@dungeonforge/srd-data/npc-templates" with { type: "json" };

import type {
  EncounterDifficulty,
  Motif,
  SrdMagicItem,
  SrdMonster,
  SrdTrap,
} from "./types.js";

export interface SrdDatabase {
  license: string;
  monsters: SrdMonster[];
  traps: SrdTrap[];
  magicItems: SrdMagicItem[];
  motifs: Motif[];
  xpBudgetPerCharacter: Record<
    string,
    { low: number; moderate: number; high: number }
  >;
  treasureTables: typeof treasureTablesData;
  hazards: unknown[];
  npcTemplates: unknown[];
}

export function loadSrdDatabase(): SrdDatabase {
  return {
    license: monstersData._license,
    monsters: monstersData.monsters as SrdMonster[],
    traps: trapsData.traps as SrdTrap[],
    magicItems: magicItemsData.items as SrdMagicItem[],
    motifs: motifsData.motifs as Motif[],
    xpBudgetPerCharacter: encounterXpData.xpBudgetPerCharacter,
    treasureTables: treasureTablesData,
    hazards: hazardsData.hazards,
    npcTemplates: npcTemplatesData.templates,
  };
}

export function getMotif(db: SrdDatabase, motifId: string): Motif {
  return db.motifs.find((m) => m.id === motifId) ?? db.motifs[0];
}

export function getXpBudget(
  db: SrdDatabase,
  partyLevel: number,
  partySize: number,
  difficulty: EncounterDifficulty
): number {
  const levelKey = String(clampLevel(partyLevel));
  const row = db.xpBudgetPerCharacter[levelKey];
  if (!row) {
    throw new Error(`No XP budget for party level ${partyLevel}`);
  }
  return row[difficulty] * partySize;
}

function clampLevel(level: number): number {
  return Math.max(1, Math.min(20, level));
}

export function filterMonstersForEncounter(
  db: SrdDatabase,
  partyLevel: number,
  motif: Motif
): SrdMonster[] {
  const maxCr = partyLevel <= 1 ? 1 : Math.ceil(partyLevel / 2) + 1;
  const minCr = partyLevel <= 2 ? 0 : Math.max(0, Math.floor(partyLevel / 4));

  return db.monsters.filter((m) => {
    if (m.xp <= 0) return false;
    if (m.crNumeric > maxCr) return false;
    if (m.crNumeric < minCr / 4 && m.cr !== "0") return false;
    if (motif.monsterTypes.length === 0) return true;
    return motif.monsterTypes.includes(m.type);
  });
}

export function getTrapForLevel(
  db: SrdDatabase,
  trapId: string,
  partyLevel: number
): SrdTrap | undefined {
  const trap = db.traps.find((t) => t.id === trapId);
  if (!trap) return undefined;
  const band = trap.levelBands.find(
    (b) => partyLevel >= b.minLevel && partyLevel <= b.maxLevel
  );
  if (!band && trap.id === "rolling-stone" && partyLevel < 11) {
    return undefined;
  }
  return trap;
}

export function getScaledTrapStats(
  trap: SrdTrap,
  partyLevel: number
): {
  saveDc: number | null;
  damage: string | null;
  area?: string;
  depth?: string;
} {
  const band =
    trap.levelBands.find(
      (b) => partyLevel >= b.minLevel && partyLevel <= b.maxLevel
    ) ?? trap.levelBands[0];
  return {
    saveDc: band.saveDc,
    damage: band.damage,
    area: band.area,
    depth: band.depth,
  };
}

export function getMagicItemsByRarity(
  db: SrdDatabase,
  rarity: string
): SrdMagicItem[] {
  return db.magicItems.filter((i) => i.rarity === rarity);
}

export function getHoardConfig(db: SrdDatabase, partyLevel: number) {
  const key = String(clampLevel(partyLevel)) as keyof typeof db.treasureTables.hoardsByPartyLevel;
  return db.treasureTables.hoardsByPartyLevel[key] ?? db.treasureTables.hoardsByPartyLevel["1"];
}
