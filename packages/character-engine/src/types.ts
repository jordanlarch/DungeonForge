export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface WeaponAttack {
  name: string;
  attackBonus: number;
  damage: string;
  damageType: string;
}

export interface CharacterDocument {
  schemaVersion: 1;
  id: string;
  name: string;
  speciesId: string;
  classId: string;
  level: number;
  abilities: AbilityScores;
  hp: { max: number; current: number };
  armorClass: number;
  proficiencyBonus: number;
  speed: number;
  initiativeBonus: number;
  weapons: WeaponAttack[];
  notes?: string;
}

export interface PartyRoster {
  schemaVersion: 1;
  activeCharacterId: string | null;
  characters: CharacterDocument[];
}
