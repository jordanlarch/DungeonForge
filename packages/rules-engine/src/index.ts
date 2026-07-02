export type {
  CombatPhase,
  ParticipantKind,
  CombatParticipant,
  ActionEconomy,
  AttackResult,
  CombatState,
  SrdAction,
} from "./types.js";
export { CORE_ACTIONS } from "./types.js";
export { rollDie, rollD20, rollDamage, rollInitiative, parseDamage } from "./dice.js";
export {
  freshEconomy,
  startCombat,
  currentParticipant,
  spendAction,
  resolveAttack,
  endTurn,
  isCombatOver,
  applyAction,
  runMonsterTurn,
  castSpellInCombat,
  type StartCombatInput,
} from "./combat.js";
export {
  resolveSpell,
  computeSpellSaveDc,
  resolveSavingThrow,
  applyCondition,
  hasCondition,
  type SpellDefinition,
  type SpellResult,
  type CastSpellInput,
} from "./spells.js";
export type { ConditionId, ActiveCondition, ConcentrationState } from "./conditions.js";
