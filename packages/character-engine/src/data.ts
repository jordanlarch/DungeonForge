import type { AbilityKey } from "./types.js";

export interface SpeciesOption {
  id: string;
  name: string;
  abilityBonuses: Partial<Record<AbilityKey, number>>;
  speed: number;
}

export interface ClassOption {
  id: string;
  name: string;
  hitDie: number;
  primaryAbility: AbilityKey;
  savingThrows: AbilityKey[];
  armorProficiencies: string[];
  weaponProficiencies: string[];
  defaultWeapon: {
    name: string;
    damage: string;
    damageType: string;
    ability: AbilityKey;
  };
}

export const STANDARD_ARRAY: number[] = [15, 14, 13, 12, 10, 8];

export const SPECIES: SpeciesOption[] = [
  { id: "human", name: "Human", abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 }, speed: 30 },
  { id: "elf", name: "Elf", abilityBonuses: { dex: 2 }, speed: 30 },
  { id: "dwarf", name: "Dwarf", abilityBonuses: { con: 2 }, speed: 25 },
];

export const CLASSES: ClassOption[] = [
  {
    id: "fighter",
    name: "Fighter",
    hitDie: 10,
    primaryAbility: "str",
    savingThrows: ["str", "con"],
    armorProficiencies: ["light", "medium", "heavy", "shields"],
    weaponProficiencies: ["simple", "martial"],
    defaultWeapon: { name: "Longsword", damage: "1d8", damageType: "slashing", ability: "str" },
  },
  {
    id: "wizard",
    name: "Wizard",
    hitDie: 6,
    primaryAbility: "int",
    savingThrows: ["int", "wis"],
    armorProficiencies: [],
    weaponProficiencies: ["simple"],
    defaultWeapon: { name: "Dagger", damage: "1d4", damageType: "piercing", ability: "dex" },
  },
  {
    id: "rogue",
    name: "Rogue",
    hitDie: 8,
    primaryAbility: "dex",
    savingThrows: ["dex", "int"],
    armorProficiencies: ["light"],
    weaponProficiencies: ["simple", "hand crossbow", "longsword", "rapier", "shortsword"],
    defaultWeapon: { name: "Rapier", damage: "1d8", damageType: "piercing", ability: "dex" },
  },
];

export function getSpecies(id: string): SpeciesOption {
  return SPECIES.find((s) => s.id === id) ?? SPECIES[0]!;
}

export function getClass(id: string): ClassOption {
  return CLASSES.find((c) => c.id === id) ?? CLASSES[0]!;
}
