import { rollD20, rollDamage } from "./dice.js";
import type { CombatParticipant } from "./types.js";
import type { ConditionId } from "./conditions.js";

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export interface SpellDefinition {
  id: string;
  name: string;
  level: number;
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
  attackType?: string;
}

export interface CastSpellInput {
  caster: CombatParticipant;
  target: CombatParticipant;
  spell: SpellDefinition;
  casterAbilities: Record<string, number>;
  spellAttackBonus?: number;
}

export interface SpellResult {
  message: string;
  damage: number;
  healing: number;
  saved: boolean;
  saveTotal?: number;
  saveDc?: number;
}

export function computeSpellSaveDc(casterAbilities: Record<string, number>, abilityKey: string, profBonus = 2): number {
  return 8 + profBonus + abilityMod(casterAbilities[abilityKey] ?? 10);
}

export function resolveSavingThrow(
  targetAbilities: Record<string, number>,
  saveAbility: string,
  dc: number,
  profBonus = 2
): { saved: boolean; total: number; roll: number } {
  const mod = abilityMod(targetAbilities[saveAbility] ?? 10);
  const roll = rollD20();
  const total = roll + mod + profBonus;
  return { saved: total >= dc, total, roll };
}

export function resolveSpell(input: CastSpellInput): SpellResult {
  const { caster, target, spell, casterAbilities } = input;

  if (spell.autoHit && spell.missiles && spell.damage) {
    let total = 0;
    for (let i = 0; i < spell.missiles; i++) {
      total += rollDamage(spell.damage).total;
    }
    return {
      message: `${caster.name} casts ${spell.name} at ${target.name} for ${total} ${spell.damageType ?? "force"} damage (auto-hit).`,
      damage: total,
      healing: 0,
      saved: false,
    };
  }

  if (spell.healing && spell.healingAbility) {
    const mod = abilityMod(casterAbilities[spell.healingAbility] ?? 10);
    const dmg = rollDamage(`${spell.healing}${mod > 0 ? `+${mod}` : mod !== 0 ? mod : ""}`);
    return {
      message: `${caster.name} casts ${spell.name}, healing ${target.name} for ${dmg.total} HP.`,
      damage: 0,
      healing: dmg.total,
      saved: false,
    };
  }

  if (spell.saveAbility && spell.damage && spell.saveDcAbility) {
    const dc = computeSpellSaveDc(casterAbilities, spell.saveDcAbility);
    const save = resolveSavingThrow(
      { dex: 10, con: 10, wis: 10, str: 10, int: 10, cha: 10 },
      spell.saveAbility,
      dc
    );
    const dmg = rollDamage(spell.damage);
    const damage = save.saved && spell.halfOnSave ? Math.floor(dmg.total / 2) : save.saved ? 0 : dmg.total;
    return {
      message: `${caster.name} casts ${spell.name}. ${target.name} ${save.saved ? "succeeds" : "fails"} Dex save (${save.total} vs DC ${dc}) for ${damage} ${spell.damageType ?? ""} damage.`,
      damage,
      healing: 0,
      saved: save.saved,
      saveTotal: save.total,
      saveDc: dc,
    };
  }

  if (spell.attackType === "spell" && spell.damage) {
    const bonus = input.spellAttackBonus ?? 0;
    const roll = rollD20();
    const total = roll + bonus;
    const hit = roll === 20 || (roll !== 1 && total >= target.armorClass);
    if (!hit) {
      return { message: `${caster.name} casts ${spell.name} and misses.`, damage: 0, healing: 0, saved: false };
    }
    const dmg = rollDamage(spell.damage);
    const damage = roll === 20 ? dmg.total * 2 : dmg.total;
    return {
      message: `${caster.name} casts ${spell.name} and hits for ${damage} ${spell.damageType ?? "fire"} damage.`,
      damage,
      healing: 0,
      saved: false,
    };
  }

  return {
    message: `${caster.name} casts ${spell.name}. ${spell.effect ?? "The spell takes effect."}`,
    damage: 0,
    healing: 0,
    saved: false,
  };
}

export function applyCondition(participant: CombatParticipant, conditionId: ConditionId): CombatParticipant {
  const existing = participant.conditions ?? [];
  if (existing.some((c) => c.id === conditionId)) return participant;
  const names: Record<string, string> = {
    prone: "Prone",
    poisoned: "Poisoned",
    frightened: "Frightened",
    restrained: "Restrained",
  };
  return {
    ...participant,
    conditions: [...existing, { id: conditionId, name: names[conditionId] ?? conditionId }],
  };
}

export function hasCondition(participant: CombatParticipant, id: ConditionId): boolean {
  return (participant.conditions ?? []).some((c) => c.id === id);
}

export function attackModifierForConditions(participant: CombatParticipant): number {
  if (hasCondition(participant, "poisoned")) return -0; // disadvantage modeled in resolveAttack v3; flag for now
  return 0;
}
