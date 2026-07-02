import spellsData from "@dungeonforge/srd-data/spells-conditions" with { type: "json" };

export interface SrdCondition {
  id: string;
  name: string;
  effect: string;
}

export interface SrdSpell {
  id: string;
  name: string;
  level: number;
  school: string;
  classes: string[];
  castingTime: string;
  range: string;
  attackType?: string;
  damage?: string;
  damageType?: string;
  saveAbility?: string;
  saveDcAbility?: string;
  halfOnSave?: boolean;
  autoHit?: boolean;
  missiles?: number;
  healing?: string;
  healingAbility?: string;
  effect?: string;
  concentration?: boolean;
}

export interface SpellSlots {
  level1: { max: number; current: number };
}

export interface KnownSpell {
  spellId: string;
  name: string;
  level: number;
}

export const CONDITIONS: SrdCondition[] = spellsData.conditions as SrdCondition[];
export const SPELLS: SrdSpell[] = spellsData.spells as SrdSpell[];

export function getSpell(id: string): SrdSpell | undefined {
  return SPELLS.find((s) => s.id === id);
}

export function spellsForClass(classId: string, level: number): SrdSpell[] {
  return SPELLS.filter((s) => s.classes.includes(classId) && s.level <= Math.min(1, level > 0 ? 1 : 0));
}

export function defaultKnownSpells(classId: string, level: number): KnownSpell[] {
  const available = spellsForClass(classId, level);
  const cantrips = available.filter((s) => s.level === 0).slice(0, classId === "wizard" ? 3 : 2);
  const level1 = available.filter((s) => s.level === 1).slice(0, classId === "wizard" ? 2 : 1);
  return [...cantrips, ...level1].map((s) => ({ spellId: s.id, name: s.name, level: s.level }));
}

export function spellSlotsForClass(classId: string, level: number): SpellSlots | null {
  if (!["wizard", "rogue"].includes(classId) || level < 1) return null;
  const slots = classId === "wizard" ? (level >= 2 ? 3 : 2) : 1;
  return { level1: { max: slots, current: slots } };
}

export function getCondition(id: string): SrdCondition | undefined {
  return CONDITIONS.find((c) => c.id === id);
}
