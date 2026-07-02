import { rollD20, rollDamage, rollInitiative } from "./dice.js";
import type {
  ActionEconomy,
  AttackResult,
  CombatParticipant,
  CombatState,
  SrdAction,
} from "./types.js";
import { CORE_ACTIONS } from "./types.js";

export function freshEconomy(speedFeet: number): ActionEconomy {
  return {
    action: true,
    bonusAction: true,
    reaction: true,
    movementRemaining: speedFeet,
  };
}

export interface StartCombatInput {
  pc: {
    tokenId: string;
    name: string;
    hp: { max: number; current: number };
    armorClass: number;
    attackBonus: number;
    damage: string;
    damageType: string;
    initiativeBonus: number;
    speed: number;
  };
  monsters: {
    tokenId: string;
    name: string;
    hpMax: number;
    armorClass: number;
    crNumeric: number;
  }[];
}

function monsterCombatStats(crNumeric: number, partyLevel: number) {
  const attackBonus = 2 + Math.floor(partyLevel / 4) + (crNumeric >= 1 ? 2 : 0);
  const damage = crNumeric < 0.5 ? "1d4" : crNumeric < 2 ? "1d6+2" : "1d8+3";
  return { attackBonus, damage, damageType: "slashing" };
}

export function startCombat(input: StartCombatInput, partyLevel = 3): CombatState {
  const participants: CombatParticipant[] = [];

  const pcInit = rollInitiative(input.pc.initiativeBonus);
  participants.push({
    id: `pc-${input.pc.tokenId}`,
    tokenId: input.pc.tokenId,
    name: input.pc.name,
    kind: "pc",
    initiative: pcInit,
    hp: { ...input.pc.hp },
    armorClass: input.pc.armorClass,
    attackBonus: input.pc.attackBonus,
    damage: input.pc.damage,
    damageType: input.pc.damageType,
  });

  for (const m of input.monsters) {
    const stats = monsterCombatStats(m.crNumeric, partyLevel);
    participants.push({
      id: `mon-${m.tokenId}`,
      tokenId: m.tokenId,
      name: m.name,
      kind: "monster",
      initiative: rollInitiative(Math.max(0, Math.floor(m.crNumeric))),
      hp: { max: m.hpMax, current: m.hpMax },
      armorClass: m.armorClass,
      attackBonus: stats.attackBonus,
      damage: stats.damage,
      damageType: stats.damageType,
    });
  }

  participants.sort((a, b) => b.initiative - a.initiative);

  const economy: Record<string, ActionEconomy> = {};
  for (const p of participants) {
    economy[p.id] = freshEconomy(p.kind === "pc" ? input.pc.speed : 30);
  }

  const first = participants[0]?.name ?? "Unknown";
  return {
    active: true,
    round: 1,
    turnIndex: 0,
    order: participants,
    economy,
    log: [`Combat begins! Initiative order: ${participants.map((p) => `${p.name} (${p.initiative})`).join(", ")}`, `${first}'s turn.`],
  };
}

export function currentParticipant(state: CombatState): CombatParticipant | null {
  return state.order[state.turnIndex] ?? null;
}

export function spendAction(state: CombatState, participantId: string, kind: "action" | "bonusAction" | "reaction"): CombatState {
  const eco = state.economy[participantId];
  if (!eco) return state;
  return {
    ...state,
    economy: {
      ...state.economy,
      [participantId]: { ...eco, [kind]: false },
    },
  };
}

export function resolveAttack(
  state: CombatState,
  attackerId: string,
  targetId: string
): { state: CombatState; result: AttackResult } {
  const attacker = state.order.find((p) => p.id === attackerId);
  const target = state.order.find((p) => p.id === targetId);
  if (!attacker || !target) {
    throw new Error("Invalid attacker or target");
  }

  const roll = rollD20();
  const total = roll + attacker.attackBonus;
  const critical = roll === 20;
  const hit = critical || (roll !== 1 && total >= target.armorClass);

  let damage = 0;
  let damageRoll = "";
  if (hit) {
    const dmg = rollDamage(attacker.damage);
    damage = critical ? dmg.total * 2 : dmg.total;
    damageRoll = critical ? `${dmg.detail} (crit)` : dmg.detail;
  }

  const updatedOrder = state.order.map((p) =>
    p.id === targetId ? { ...p, hp: { ...p.hp, current: Math.max(0, p.hp.current - damage) } } : p
  );

  const message = hit
    ? `${attacker.name} hits ${target.name} for ${damage} ${attacker.damageType} damage (${damageRoll}).`
    : `${attacker.name} misses ${target.name} (${total} vs AC ${target.armorClass}).`;

  let nextState: CombatState = {
    ...state,
    order: updatedOrder,
    log: [...state.log, message],
  };

  nextState = spendAction(nextState, attackerId, "action");

  return {
    state: nextState,
    result: {
      hit,
      critical,
      roll,
      total,
      damage,
      damageRoll,
      targetId,
      targetName: target.name,
      attackerName: attacker.name,
      message,
    },
  };
}

export function endTurn(state: CombatState, speedFeet = 30): CombatState {
  let turnIndex = state.turnIndex + 1;
  let round = state.round;
  if (turnIndex >= state.order.length) {
    turnIndex = 0;
    round += 1;
  }

  const next = state.order[turnIndex];
  const economy = { ...state.economy };
  if (next) {
    economy[next.id] = freshEconomy(next.kind === "pc" ? speedFeet : 30);
  }

  const log = next ? [...state.log, `Round ${round}. ${next.name}'s turn.`] : state.log;

  return { ...state, turnIndex, round, economy, log };
}

export function isCombatOver(state: CombatState): "ongoing" | "victory" | "defeat" {
  const pcs = state.order.filter((p) => p.kind === "pc");
  const monsters = state.order.filter((p) => p.kind === "monster");
  if (pcs.every((p) => p.hp.current <= 0)) return "defeat";
  if (monsters.every((p) => p.hp.current <= 0)) return "victory";
  return "ongoing";
}

export function applyAction(state: CombatState, participantId: string, action: SrdAction, speedFeet = 30): CombatState {
  const participant = state.order.find((p) => p.id === participantId);
  if (!participant) return state;

  let next = spendAction(state, participantId, "action");
  let message = `${participant.name} uses ${CORE_ACTIONS.find((a) => a.id === action)?.label ?? action}.`;

  if (action === "dash") {
    const eco = next.economy[participantId];
    if (eco) {
      next = {
        ...next,
        economy: {
          ...next.economy,
          [participantId]: { ...eco, movementRemaining: eco.movementRemaining + speedFeet },
        },
      };
      message += ` Movement increased by ${speedFeet} ft.`;
    }
  }

  return { ...next, log: [...next.log, message] };
}

export function runMonsterTurn(state: CombatState): CombatState {
  const current = currentParticipant(state);
  if (!current || current.kind !== "monster" || current.hp.current <= 0) {
    return endTurn(state);
  }

  const pc = state.order.find((p) => p.kind === "pc" && p.hp.current > 0);
  if (!pc) return endTurn(state);

  const { state: afterAttack } = resolveAttack(state, current.id, pc.id);
  let next = afterAttack;

  const outcome = isCombatOver(next);
  if (outcome === "victory") {
    next = { ...next, active: false, log: [...next.log, "Victory! All enemies defeated."] };
  } else if (outcome === "defeat") {
    next = { ...next, active: false, log: [...next.log, "Defeat! The party has fallen."] };
  } else {
    next = endTurn(next);
  }

  return next;
}

export { CORE_ACTIONS };
