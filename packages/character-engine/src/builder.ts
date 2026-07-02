import { getClass, getSpecies } from "./data.js";
import type { AbilityKey, AbilityScores, CharacterDocument } from "./types.js";

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function proficiencyBonus(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}

export interface CreateCharacterInput {
  name: string;
  speciesId: string;
  classId: string;
  level: number;
  abilities: AbilityScores;
}

export function createCharacter(input: CreateCharacterInput): CharacterDocument {
  const species = getSpecies(input.speciesId);
  const cls = getClass(input.classId);
  const level = Math.max(1, Math.min(5, input.level));
  const prof = proficiencyBonus(level);

  const abilities: AbilityScores = { ...input.abilities };
  for (const [key, bonus] of Object.entries(species.abilityBonuses) as [AbilityKey, number][]) {
    abilities[key] += bonus;
  }

  const conMod = abilityModifier(abilities.con);
  const hitDieAvg = Math.floor(cls.hitDie / 2) + 1;
  const maxHp = cls.hitDie + conMod + (level - 1) * (hitDieAvg + conMod);

  const primaryMod = abilityModifier(abilities[cls.defaultWeapon.ability]);
  const attackBonus = prof + primaryMod;
  const dexMod = abilityModifier(abilities.dex);
  const ac = cls.id === "wizard" ? 10 + dexMod : 10 + Math.max(primaryMod, dexMod) + (cls.id === "fighter" ? 2 : 1);

  const damageMod = primaryMod !== 0 ? (primaryMod > 0 ? `+${primaryMod}` : `${primaryMod}`) : "";

  return {
    schemaVersion: 1,
    id: `char-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim() || "Adventurer",
    speciesId: species.id,
    classId: cls.id,
    level,
    abilities,
    hp: { max: Math.max(1, maxHp), current: Math.max(1, maxHp) },
    armorClass: ac,
    proficiencyBonus: prof,
    speed: species.speed,
    initiativeBonus: dexMod,
    weapons: [
      {
        name: cls.defaultWeapon.name,
        attackBonus,
        damage: `${cls.defaultWeapon.damage}${damageMod}`,
        damageType: cls.defaultWeapon.damageType,
      },
    ],
  };
}

export function defaultAbilitiesFromArray(order: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"]): AbilityScores {
  const values = [15, 14, 13, 12, 10, 8];
  const scores = {} as AbilityScores;
  order.forEach((key, i) => {
    scores[key] = values[i] ?? 10;
  });
  return scores;
}
