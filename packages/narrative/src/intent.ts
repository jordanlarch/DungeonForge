export type GameIntentType = "move" | "attack" | "talk" | "search" | "unknown";

export interface MoveIntent {
  type: "move";
  direction?: "north" | "south" | "east" | "west";
  squares?: number;
}

export interface AttackIntent {
  type: "attack";
  targetHint?: string;
}

export interface TalkIntent {
  type: "talk";
  message: string;
}

export interface SearchIntent {
  type: "search";
}

export interface UnknownIntent {
  type: "unknown";
  raw: string;
}

export type GameIntent = MoveIntent | AttackIntent | TalkIntent | SearchIntent | UnknownIntent;

export interface RulesCapabilities {
  move: boolean;
  attack: boolean;
  spells: boolean;
  conditions: boolean;
  traps: boolean;
  social: boolean;
}

export const DEFAULT_CAPABILITIES: RulesCapabilities = {
  move: true,
  attack: true,
  spells: false,
  conditions: false,
  traps: false,
  social: true,
};

const DIRECTION_MAP: Record<string, MoveIntent["direction"]> = {
  north: "north",
  south: "south",
  east: "east",
  west: "west",
  up: "north",
  down: "south",
  left: "west",
  right: "east",
};

export function parseGameIntent(text: string): GameIntent {
  const lower = text.toLowerCase().trim();

  for (const [word, dir] of Object.entries(DIRECTION_MAP)) {
    if (lower.includes(`move ${word}`) || lower.includes(`go ${word}`) || lower.includes(`head ${word}`)) {
      return { type: "move", direction: dir, squares: 1 };
    }
  }

  if (/\b(attack|strike|hit|swing at|shoot)\b/.test(lower)) {
    const targetMatch = lower.match(/\b(?:attack|strike|hit|shoot)\s+(?:the\s+)?(\w+)/);
    return { type: "attack", targetHint: targetMatch?.[1] };
  }

  if (/\b(search|investigate|look for|check for traps)\b/.test(lower)) {
    return { type: "search" };
  }

  if (/\b(say|tell|ask|talk|speak|greet)\b/.test(lower)) {
    return { type: "talk", message: text };
  }

  return { type: "unknown", raw: text };
}

export function intentSupported(intent: GameIntent, caps: RulesCapabilities = DEFAULT_CAPABILITIES): boolean {
  switch (intent.type) {
    case "move":
      return caps.move;
    case "attack":
      return caps.attack;
    case "search":
      return caps.traps;
    case "talk":
      return caps.social;
    default:
      return false;
  }
}

export function directionToDelta(direction: NonNullable<MoveIntent["direction"]>): { x: number; y: number } {
  switch (direction) {
    case "north":
      return { x: 0, y: -1 };
    case "south":
      return { x: 0, y: 1 };
    case "east":
      return { x: 1, y: 0 };
    case "west":
      return { x: -1, y: 0 };
  }
}
