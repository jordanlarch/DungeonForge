import type {
  EncounterContent,
  GenerationOptions,
  MonsterRef,
  Motif,
  RoomContent,
  RoomNode,
  SrdMonster,
  TreasureContent,
  TrapContent,
} from "./types.js";
import type { SrdDatabase } from "./srd-database.js";
import {
  filterMonstersForEncounter,
  getHoardConfig,
  getMagicItemsByRarity,
  getMotif,
  getScaledTrapStats,
  getTrapForLevel,
  getXpBudget,
} from "./srd-database.js";
import { SeededRandom, roomFlavor } from "./utils.js";

const ROLE_WEIGHTS: { role: RoomContent["role"]; weight: number }[] = [
  { role: "empty", weight: 25 },
  { role: "encounter", weight: 35 },
  { role: "trap", weight: 20 },
  { role: "treasure", weight: 20 },
];

function pickRole(rng: SeededRandom, exclude?: RoomContent["role"]): RoomContent["role"] {
  const pool = exclude
    ? ROLE_WEIGHTS.filter((r) => r.role !== exclude)
    : ROLE_WEIGHTS;
  const total = pool.reduce((sum, r) => sum + r.weight, 0);
  let roll = rng.next() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.role;
  }
  return pool[pool.length - 1].role;
}

function pickMonsterQuantity(rng: SeededRandom, monster: SrdMonster, budgetLeft: number): number {
  if (monster.xp <= 0) return 0;
  const maxCount = Math.min(8, Math.floor(budgetLeft / monster.xp));
  if (maxCount <= 0) return 0;
  if (monster.crNumeric >= 1) return 1;
  return rng.int(1, Math.max(1, maxCount));
}

export function buildEncounter(
  rng: SeededRandom,
  db: SrdDatabase,
  options: GenerationOptions,
  motif: Motif
): EncounterContent {
  const xpBudget = getXpBudget(
    db,
    options.partyLevel,
    options.partySize,
    options.difficulty
  );
  let remaining = xpBudget;
  const candidates = filterMonstersForEncounter(db, options.partyLevel, motif);

  if (candidates.length === 0) {
    const fallback = db.monsters.filter((m) => m.xp > 0 && m.crNumeric <= options.partyLevel);
    candidates.push(...fallback);
  }

  const shuffled = rng.shuffle(candidates);
  const monsters: MonsterRef[] = [];
  const usedNames = new Set<string>();
  let statBlocks = 0;

  for (const monster of shuffled) {
    if (remaining <= 0 || statBlocks >= 3) break;
    if (usedNames.has(monster.name) && monster.crNumeric >= 1) continue;

    const count = pickMonsterQuantity(rng, monster, remaining);
    if (count <= 0) continue;

    const spent = monster.xp * count;
    if (spent > remaining && monsters.length > 0) continue;

    remaining -= spent;
    monsters.push({
      id: monster.id,
      name: monster.name,
      cr: monster.cr,
      xp: monster.xp,
      count,
    });
    usedNames.add(monster.name);
    statBlocks++;
  }

  if (monsters.length === 0 && shuffled.length > 0) {
    const m = shuffled[0];
    monsters.push({ id: m.id, name: m.name, cr: m.cr, xp: m.xp, count: 1 });
    remaining -= m.xp;
  }

  return {
    difficulty: options.difficulty,
    xpBudget,
    xpSpent: xpBudget - Math.max(0, remaining),
    monsters,
  };
}

export function buildTrap(
  rng: SeededRandom,
  db: SrdDatabase,
  options: GenerationOptions,
  motif: Motif
): TrapContent | undefined {
  const trapPool = motif.trapIds.length
    ? motif.trapIds
    : db.traps.map((t) => t.id);
  const shuffled = rng.shuffle(trapPool);

  for (const trapId of shuffled) {
    const trap = getTrapForLevel(db, trapId, options.partyLevel);
    if (!trap) continue;
    const stats = getScaledTrapStats(trap, options.partyLevel);
    return {
      trapId: trap.id,
      name: trap.name,
      severity: trap.severity,
      trigger: trap.trigger,
      summary: trap.summary,
      saveDc: stats.saveDc,
      damage: stats.damage,
      detectDc: trap.detectDc,
      detectSkill: trap.detectSkill,
    };
  }
  return undefined;
}

export function buildTreasure(
  rng: SeededRandom,
  db: SrdDatabase,
  options: GenerationOptions
): TreasureContent {
  const hoard = getHoardConfig(db, options.partyLevel);
  const amount = rng.int(hoard.coinsMin, hoard.coinsMax);
  const coinType = rng.pick(["cp", "sp", "ep", "gp", "pp"]);

  const magicItems: { name: string; rarity: string }[] = [];
  if (rng.chance(0.55) && hoard.magicItemRarities.length > 0) {
    const rarity = rng.pick(hoard.magicItemRarities as string[]);
    const items = getMagicItemsByRarity(db, rarity);
    if (items.length > 0) {
      const item = rng.pick(items);
      magicItems.push({ name: item.name, rarity: item.rarity });
    }
  }

  const parts: string[] = [`${amount} ${coinType.toUpperCase()}`];
  if (magicItems.length) {
    parts.push(magicItems.map((i) => `${i.name} (${i.rarity})`).join(", "));
  }

  return {
    coins: [{ type: coinType, amount }],
    magicItems,
    description: parts.join("; "),
  };
}

function encounterDescription(encounter: EncounterContent): string {
  const groups = encounter.monsters
    .map((m) => (m.count > 1 ? `${m.count} ${m.name}s` : `1 ${m.name}`))
    .join(", ");
  return `${groups} (CR mix, ${encounter.xpSpent}/${encounter.xpBudget} XP).`;
}

function trapDescription(trap: TrapContent): string {
  const dc = trap.saveDc ? ` DC ${trap.saveDc}` : "";
  const dmg = trap.damage ? ` for ${trap.damage}` : "";
  return `${trap.name}: ${trap.summary}${dc}${dmg}. Detect (${trap.detectSkill} DC ${trap.detectDc}).`;
}

export function stockRooms(
  rng: SeededRandom,
  db: SrdDatabase,
  options: GenerationOptions,
  rooms: RoomNode[],
  entranceRoomId: string
): RoomNode[] {
  const motif = getMotif(db, options.motifId);

  return rooms.map((room) => {
    let role: RoomContent["role"];
    if (room.id === entranceRoomId) {
      role = "entrance";
    } else {
      role = pickRole(rng);
    }

    const content: RoomContent = {
      role,
      lightLevel: motif.lightLevel,
      description: roomFlavor(rng),
    };

    if (role === "encounter") {
      content.encounter = buildEncounter(rng, db, options, motif);
      content.description = `${content.description} ${encounterDescription(content.encounter)}`;
    } else if (role === "trap") {
      const trap = buildTrap(rng, db, options, motif);
      if (trap) {
        content.trap = trap;
        content.description = `${content.description} ${trapDescription(trap)}`;
      } else {
        content.role = "empty";
      }
    } else if (role === "treasure") {
      content.treasure = buildTreasure(rng, db, options);
      content.description = `${content.description} Treasure: ${content.treasure.description}.`;
    } else if (role === "entrance") {
      content.lightLevel = "bright";
      content.description = "The entrance threshold; stale air pours from within.";
    }

    if (rng.chance(0.15) && role !== "entrance") {
      content.terrain = rng.pick([
        "difficult terrain",
        "dim light",
        "patches of rubble",
        "narrow choke point",
      ]);
    }

    return { ...room, content };
  });
}
