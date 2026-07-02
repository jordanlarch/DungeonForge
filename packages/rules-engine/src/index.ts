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
  type StartCombatInput,
} from "./combat.js";
