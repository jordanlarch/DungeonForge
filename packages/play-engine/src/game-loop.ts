import type { DungeonDocument, Point } from "@dungeonforge/engine";
import { loadSrdDatabase } from "@dungeonforge/engine";
import {
  currentParticipant,
  endTurn,
  isCombatOver,
  resolveAttack,
  runMonsterTurn,
  startCombat,
  applyAction,
} from "@dungeonforge/rules-engine";
import { applyFogForTokens, createInitialFog } from "./fog.js";
import { entrancePosition, isAdjacent, isPassable, roomAtPoint } from "./passability.js";
import type { GridToken, PlayAction, PlayActionResult, PlaySession, PlaySessionInput } from "./types.js";

export function createPlaySession(input: PlaySessionInput): PlaySession {
  const { dungeon, character } = input;
  const spawn = entrancePosition(dungeon);
  const pcToken: GridToken = {
    id: `token-pc-${character.id}`,
    kind: "pc",
    name: character.name,
    characterId: character.id,
    position: spawn,
    floor: 1,
    color: "#7eb8ff",
  };

  const fog = applyFogForTokens(createInitialFog(dungeon), dungeon, 1, [spawn]);

  return {
    schemaVersion: 1,
    id: `session-${Date.now()}`,
    dungeonId: `${dungeon.metadata.seed}-${dungeon.metadata.name}`,
    activeFloor: 1,
    tokens: [pcToken],
    fog,
    activeTokenId: pcToken.id,
    combat: null,
    phase: "exploration",
    log: [`${character.name} enters ${dungeon.metadata.name}.`],
    createdAt: new Date().toISOString(),
  };
}

function syncCombatToTokens(session: PlaySession): GridToken[] {
  if (!session.combat) return session.tokens;
  const deadTokenIds = new Set(
    session.combat.order.filter((p) => p.hp.current <= 0).map((p) => p.tokenId)
  );
  return session.tokens.filter((t) => !deadTokenIds.has(t.id));
}

function lookupMonsterStats(name: string) {
  const db = loadSrdDatabase();
  const monster = db.monsters.find((m) => m.name === name);
  if (monster) {
    return { hpMax: monster.hpMax, armorClass: monster.armorClass, crNumeric: monster.crNumeric };
  }
  return { hpMax: 7, armorClass: 15, crNumeric: 0.25 };
}

function spawnMonstersForRoom(dungeon: DungeonDocument, session: PlaySession, roomId: string): GridToken[] {
  const room = dungeon.rooms.find((r) => r.id === roomId);
  if (!room?.content.encounter) return session.tokens;

  const existing = new Set(session.tokens.filter((t) => t.kind === "monster").map((t) => t.monsterRefId));
  const newTokens: GridToken[] = [...session.tokens];
  let offset = 0;

  for (const monster of room.content.encounter.monsters) {
    for (let i = 0; i < monster.count; i++) {
      const refId = `${monster.id}-${roomId}-${i}`;
      if (existing.has(refId)) continue;
      newTokens.push({
        id: `token-mon-${refId}`,
        kind: "monster",
        name: monster.name,
        monsterRefId: refId,
        position: {
          x: Math.min(room.bounds.x + room.bounds.width - 1, room.bounds.x + 1 + offset),
          y: Math.floor(room.bounds.y + room.bounds.height / 2),
        },
        floor: room.floor,
        color: "#c45c5c",
      });
      offset++;
    }
  }
  return newTokens;
}

export function dispatchPlayAction(
  session: PlaySession,
  dungeon: DungeonDocument,
  action: PlayAction
): PlayActionResult {
  const messages: string[] = [];
  let next: PlaySession = { ...session };

  switch (action.type) {
    case "select_token": {
      next.activeTokenId = action.tokenId;
      break;
    }

    case "move": {
      const token = next.tokens.find((t) => t.id === action.tokenId);
      if (!token || next.phase === "combat") break;
      if (!isAdjacent(token.position, action.to)) {
        messages.push("You can only move one 5ft square at a time.");
        break;
      }
      if (!isPassable(dungeon, token.floor, action.to)) {
        messages.push("That square is blocked.");
        break;
      }
      next.tokens = next.tokens.map((t) =>
        t.id === action.tokenId ? { ...t, position: action.to } : t
      );
      next.fog = applyFogForTokens(next.fog, dungeon, token.floor, [action.to]);
      messages.push(`${token.name} moves to (${action.to.x}, ${action.to.y}).`);

      const room = roomAtPoint(dungeon, token.floor, action.to);
      if (room?.content.encounter) {
        next.tokens = spawnMonstersForRoom(dungeon, next, room.id);
        messages.push(`Hostiles spotted in room ${room.number}!`);
      }
      break;
    }

    case "start_combat":
      break;

    default:
      break;
  }

  return { session: next, messages };
}

export function startCombatInSession(
  session: PlaySession,
  dungeon: DungeonDocument,
  character: PlaySessionInput["character"]
): PlayActionResult {
  const pcToken = session.tokens.find((t) => t.kind === "pc");
  if (!pcToken) return { session, messages: ["No player token."] };

  const room = roomAtPoint(dungeon, pcToken.floor, pcToken.position);
  if (!room?.content.encounter) {
    return { session, messages: ["No encounter here. Move into an encounter room first."] };
  }

  let tokens = spawnMonstersForRoom(dungeon, session, room.id);
  const monsters = tokens.filter((t) => t.kind === "monster");

  const combat = startCombat(
    {
      pc: {
        tokenId: pcToken.id,
        name: character.name,
        hp: character.hp,
        armorClass: character.armorClass,
        attackBonus: character.attackBonus,
        damage: character.damage,
        damageType: character.damageType,
        initiativeBonus: character.initiativeBonus,
        speed: character.speed,
      },
      monsters: room.content.encounter.monsters.flatMap((m) => {
        const stats = lookupMonsterStats(m.name);
        const monTokens = monsters.filter((t) => t.name === m.name);
        return monTokens.map((t) => ({
          tokenId: t.id,
          name: m.name,
          hpMax: stats.hpMax,
          armorClass: stats.armorClass,
          crNumeric: stats.crNumeric,
        }));
      }),
    },
    dungeon.metadata.partyLevel
  );

  let next: PlaySession = {
    ...session,
    tokens,
    combat,
    phase: "combat",
    log: [...session.log, ...combat.log],
  };

  return { session: next, messages: ["Combat started!"] };
}

export function attackInSession(
  session: PlaySession,
  targetTokenId: string,
  characterSpeed = 30
): PlayActionResult {
  if (!session.combat?.active) return { session, messages: ["Not in combat."] };

  const current = currentParticipant(session.combat);
  if (!current || current.kind !== "pc") {
    return { session, messages: ["Not your turn."] };
  }

  const targetToken = session.tokens.find((t) => t.id === targetTokenId);
  if (!targetToken) return { session, messages: ["Invalid target."] };

  const targetParticipant = session.combat.order.find((p) => p.tokenId === targetTokenId);
  if (!targetParticipant) return { session, messages: ["Target not in combat."] };

  const { state: combat, result } = resolveAttack(session.combat, current.id, targetParticipant.id);

  let nextCombat = combat;
  let tokens = syncCombatToTokens({ ...session, combat: nextCombat });

  let next: PlaySession = { ...session, tokens, combat: nextCombat, log: [...session.log, result.message] };

  let outcome = isCombatOver(nextCombat);
  if (outcome === "victory") {
    next = { ...next, phase: "exploration", combat: { ...nextCombat, active: false }, log: [...next.log, "Victory!"] };
    return { session: next, messages: [result.message, "Victory!"] };
  }

  nextCombat = endTurn(nextCombat, characterSpeed);
  next = { ...next, combat: nextCombat, log: [...next.log, ...nextCombat.log.slice(-1)] };

  while (next.combat?.active) {
    const turn = currentParticipant(next.combat);
    if (!turn || turn.kind === "pc") break;
    next.combat = runMonsterTurn(next.combat);
    next.log = [...next.log, ...next.combat.log.slice(-1)];
    outcome = isCombatOver(next.combat);
    if (outcome !== "ongoing") {
      next = {
        ...next,
        phase: "exploration",
        combat: { ...next.combat, active: false },
      };
      break;
    }
  }

  return { session: next, messages: [result.message] };
}

export function useCombatAction(
  session: PlaySession,
  action: import("@dungeonforge/rules-engine").SrdAction,
  characterSpeed = 30
): PlayActionResult {
  if (!session.combat?.active) return { session, messages: ["Not in combat."] };
  const current = currentParticipant(session.combat);
  if (!current || current.kind !== "pc") return { session, messages: ["Not your turn."] };

  let combat = applyAction(session.combat, current.id, action, characterSpeed);
  combat = endTurn(combat, characterSpeed);
  const next: PlaySession = {
    ...session,
    combat,
    log: [...session.log, ...combat.log.slice(-2)],
  };
  return { session: next, messages: [combat.log.at(-2) ?? "Action used."] };
}

export function endCombatTurn(session: PlaySession, characterSpeed = 30): PlayActionResult {
  if (!session.combat?.active) return { session, messages: [] };
  let combat = endTurn(session.combat, characterSpeed);

  while (combat.active) {
    const turn = currentParticipant(combat);
    if (!turn || turn.kind === "pc") break;
    combat = runMonsterTurn(combat);
    const outcome = isCombatOver(combat);
    if (outcome !== "ongoing") {
      return {
        session: { ...session, combat: { ...combat, active: false }, phase: "exploration", log: [...session.log, ...combat.log.slice(-1)] },
        messages: [combat.log.at(-1) ?? "Turn ended."],
      };
    }
  }

  return {
    session: { ...session, combat, log: [...session.log, ...combat.log.slice(-1)] },
    messages: [combat.log.at(-1) ?? "Turn ended."],
  };
}

export function moveTokenInCombat(
  session: PlaySession,
  dungeon: DungeonDocument,
  tokenId: string,
  to: Point
): PlayActionResult {
  if (!session.combat?.active) {
    return dispatchPlayAction(session, dungeon, { type: "move", tokenId, to });
  }

  const token = session.tokens.find((t) => t.id === tokenId);
  if (!token || !isAdjacent(token.position, to) || !isPassable(dungeon, token.floor, to)) {
    return { session, messages: ["Invalid move."] };
  }

  const current = currentParticipant(session.combat);
  if (!current || current.tokenId !== tokenId) {
    return { session, messages: ["Not your turn."] };
  }

  const eco = session.combat.economy[current.id];
  if (!eco || eco.movementRemaining < 5) {
    return { session, messages: ["Not enough movement remaining."] };
  }

  const tokens = session.tokens.map((t) => (t.id === tokenId ? { ...t, position: to } : t));
  const fog = applyFogForTokens(session.fog, dungeon, token.floor, [to]);
  const economy = {
    ...session.combat.economy,
    [current.id]: { ...eco, movementRemaining: eco.movementRemaining - 5 },
  };

  return {
    session: {
      ...session,
      tokens,
      fog,
      combat: { ...session.combat, economy },
      log: [...session.log, `${token.name} moves (5 ft).`],
    },
    messages: [`Moved to (${to.x}, ${to.y}).`],
  };
}
