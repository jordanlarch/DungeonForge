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
import { buildHazard, buildNpc } from "./npcs.js";
import { generateRoomNarrative } from "./narrative-templates.js";
import { SeededRandom, roomFlavor } from "./utils.js";

function roleWeights(options: GenerationOptions): { role: RoomContent["role"]; weight: number }[] {
  const emptyWeight = Math.max(
    5,
    100 - options.encounterDensity - options.trapDensity - options.treasureDensity - options.npcDensity
  );
  return [
    { role: "empty", weight: emptyWeight },
    { role: "encounter", weight: options.encounterDensity },
    { role: "trap", weight: options.trapDensity },
    { role: "treasure", weight: options.treasureDensity },
    { role: "npc", weight: options.npcDensity },
  ].filter((r) => r.weight > 0) as { role: RoomContent["role"]; weight: number }[];
}

function pickRole(rng: SeededRandom, options: GenerationOptions, exclude?: RoomContent["role"]): RoomContent["role"] {
  const pool = roleWeights(options).filter((r) => r.role !== exclude);
  const total = pool.reduce((sum, r) => sum + r.weight, 0);
  let roll = rng.next() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.role;
  }
  return "empty";
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
  const xpBudget = getXpBudget(db, options.partyLevel, options.partySize, options.difficulty);
  let remaining = xpBudget;
  const candidates = filterMonstersForEncounter(db, options.partyLevel, motif);

  if (candidates.length === 0) {
    candidates.push(...db.monsters.filter((m) => m.xp > 0 && m.crNumeric <= options.partyLevel));
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
  const trapPool = motif.trapIds.length ? motif.trapIds : db.traps.map((t) => t.id);
  for (const trapId of rng.shuffle(trapPool)) {
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
      magicItems.push({ name: rng.pick(items).name, rarity });
    }
  }

  const parts: string[] = [`${amount} ${coinType.toUpperCase()}`];
  if (magicItems.length) parts.push(magicItems.map((i) => `${i.name} (${i.rarity})`).join(", "));

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
  return `${groups} (${encounter.xpSpent}/${encounter.xpBudget} XP).`;
}

function trapDescription(trap: TrapContent): string {
  const dc = trap.saveDc ? ` DC ${trap.saveDc}` : "";
  const dmg = trap.damage ? ` for ${trap.damage}` : "";
  return `${trap.name}: ${trap.summary}${dc}${dmg}. Detect (${trap.detectSkill} DC ${trap.detectDc}).`;
}

export function fillRoomContent(
  rng: SeededRandom,
  db: SrdDatabase,
  options: GenerationOptions,
  motif: Motif,
  role: RoomContent["role"],
  room: RoomNode
): RoomContent {
  const content: RoomContent = {
    role,
    lightLevel: motif.lightLevel,
    description: roomFlavor(rng),
    narrative: generateRoomNarrative(rng, { ...room, content: { ...room.content, role } }, motif),
  };

  if (role === "encounter") {
    content.encounter = buildEncounter(rng, db, options, motif);
    content.description += ` ${encounterDescription(content.encounter)}`;
  } else if (role === "trap") {
    const trap = buildTrap(rng, db, options, motif);
    if (trap) {
      content.trap = trap;
      content.description += ` ${trapDescription(trap)}`;
    } else {
      content.role = "empty";
    }
  } else if (role === "treasure") {
    content.treasure = buildTreasure(rng, db, options);
    content.description += ` Treasure: ${content.treasure.description}.`;
  } else if (role === "npc") {
    const npc = buildNpc(rng, db, motif);
    if (npc) {
      content.npc = npc;
      content.description += ` ${npc.name}: ${npc.personality}`;
    } else {
      content.role = "empty";
    }
  } else if (role === "entrance") {
    content.lightLevel = "bright";
    content.description = "The entrance threshold; stale air pours from within.";
  } else if (role === "stairs") {
    content.description = "A stairwell connects to another level.";
  }

  if (rng.chance(options.hazardChance) && role !== "entrance" && role !== "stairs") {
    const hazard = buildHazard(rng, db, motif);
    if (hazard) content.hazard = hazard;
  }

  return content;
}

export function stockRooms(
  rng: SeededRandom,
  db: SrdDatabase,
  options: GenerationOptions,
  rooms: RoomNode[],
  entranceRoomId: string,
  stairRoomIds: Set<string> = new Set()
): RoomNode[] {
  const motif = getMotif(db, options.motifId);

  return rooms.map((room) => {
    let role: RoomContent["role"];
    if (room.id === entranceRoomId) role = "entrance";
    else if (stairRoomIds.has(room.id)) role = "stairs";
    else role = pickRole(rng, options);

    return {
      ...room,
      content: fillRoomContent(rng, db, options, motif, role, room),
    };
  });
}

export function rerollRoomContent(
  dungeon: { rooms: RoomNode[] },
  roomId: string,
  options: GenerationOptions,
  db: SrdDatabase,
  seedOffset = 0
): RoomNode[] {
  const motif = getMotif(db, options.motifId);
  const rng = new SeededRandom(options.seed + seedOffset + roomId.length);

  return dungeon.rooms.map((room) => {
    if (room.id !== roomId) return room;
    if (room.content.role === "entrance" || room.content.role === "stairs") return room;

    const role = pickRole(rng, options);
    return {
      ...room,
      content: fillRoomContent(rng, db, options, motif, role, room),
    };
  });
}
