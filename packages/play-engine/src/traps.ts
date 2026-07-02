import type { RoomNode } from "@dungeonforge/engine";
import { rollD20 } from "@dungeonforge/rules-engine";

export interface TrapInteractionResult {
  message: string;
  detected: boolean;
  disarmed: boolean;
  triggered: boolean;
  damage: number;
}

export function detectTrap(room: RoomNode, perceptionMod: number): TrapInteractionResult {
  const trap = room.content.trap;
  if (!trap) {
    return { message: "No trap found.", detected: false, disarmed: false, triggered: false, damage: 0 };
  }
  const roll = rollD20() + perceptionMod;
  const detected = roll >= trap.detectDc;
  return {
    message: detected
      ? `You spot the ${trap.name} (Perception ${roll} vs DC ${trap.detectDc}).`
      : `You don't notice anything unusual (Perception ${roll} vs DC ${trap.detectDc}).`,
    detected,
    disarmed: false,
    triggered: false,
    damage: 0,
  };
}

export function disarmTrap(room: RoomNode, dexMod: number, profBonus: number): TrapInteractionResult {
  const trap = room.content.trap;
  if (!trap) {
    return { message: "No trap to disarm.", detected: false, disarmed: false, triggered: false, damage: 0 };
  }
  const dc = trap.saveDc ?? trap.detectDc + 5;
  const roll = rollD20() + dexMod + profBonus;
  if (roll >= dc) {
    return {
      message: `You disarm the ${trap.name} (Thieves' Tools ${roll} vs DC ${dc}).`,
      detected: true,
      disarmed: true,
      triggered: false,
      damage: 0,
    };
  }
  const damage = trap.damage ? parseTrapDamage(trap.damage) : 7;
  return {
    message: `Failed to disarm! The ${trap.name} triggers (${roll} vs DC ${dc}).`,
    detected: true,
    disarmed: false,
    triggered: true,
    damage,
  };
}

function parseTrapDamage(damage: string): number {
  const match = damage.match(/(\d+)d(\d+)/);
  if (!match) return 7;
  const count = parseInt(match[1]!, 10);
  const sides = parseInt(match[2]!, 10);
  let total = 0;
  for (let i = 0; i < count; i++) total += Math.floor(Math.random() * sides) + 1;
  return total;
}

export function searchRoomForTrap(room: RoomNode, passivePerception: number): TrapInteractionResult {
  if (!room.content.trap) {
    return { message: "The room appears safe.", detected: false, disarmed: false, triggered: false, damage: 0 };
  }
  if (passivePerception >= room.content.trap.detectDc) {
    return {
      message: `Passive Perception reveals a ${room.content.trap.name}.`,
      detected: true,
      disarmed: false,
      triggered: false,
      damage: 0,
    };
  }
  return { message: "Nothing obvious stands out.", detected: false, disarmed: false, triggered: false, damage: 0 };
}
