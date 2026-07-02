export interface RoomNarrativeContext {
  dungeonName: string;
  motifName: string;
  roomNumber: number;
  role: string;
  mechanicalSummary: string;
}

export interface NarrativeProvider {
  enhanceRoom(ctx: RoomNarrativeContext): Promise<string>;
}

const STORAGE_KEY = "df_anthropic_key";

export function getAnthropicApiKey(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setAnthropicApiKey(key: string) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, key);
  }
}

export function clearAnthropicApiKey() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export class AnthropicNarrativeProvider implements NarrativeProvider {
  constructor(private apiKey: string) {}

  async enhanceRoom(ctx: RoomNarrativeContext): Promise<string> {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: `Write 2-3 evocative sentences for a D&D dungeon room (watabou one-page dungeon style). No stat blocks.
Dungeon: ${ctx.dungeonName} (${ctx.motifName})
Room ${ctx.roomNumber}, role: ${ctx.role}
Contents: ${ctx.mechanicalSummary}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${err}`);
    }

    const data = (await response.json()) as {
      content: { type: string; text?: string }[];
    };
    const text = data.content.find((c) => c.type === "text")?.text;
    if (!text) throw new Error("No text in Anthropic response");
    return text.trim();
  }
}

export function createNarrativeProvider(): NarrativeProvider | null {
  const key = getAnthropicApiKey();
  if (!key) return null;
  return new AnthropicNarrativeProvider(key);
}

export function buildRoomContext(
  dungeonName: string,
  motifName: string,
  room: {
    number: number;
    content: {
      role: string;
      description: string;
      encounter?: { monsters: { count: number; name: string }[] };
      trap?: { name: string };
      treasure?: { description: string };
      npc?: { name: string };
    };
  }
): RoomNarrativeContext {
  let mechanical = room.content.description;
  if (room.content.encounter) {
    mechanical += ` Encounter: ${room.content.encounter.monsters.map((m) => `${m.count}x ${m.name}`).join(", ")}`;
  }
  if (room.content.trap) mechanical += ` Trap: ${room.content.trap.name}`;
  if (room.content.treasure) mechanical += ` Treasure: ${room.content.treasure.description}`;
  if (room.content.npc) mechanical += ` NPC: ${room.content.npc.name}`;

  return {
    dungeonName,
    motifName,
    roomNumber: room.number,
    role: room.content.role,
    mechanicalSummary: mechanical,
  };
}

export type {
  GameIntent,
  GameIntentType,
  MoveIntent,
  AttackIntent,
  TalkIntent,
  SearchIntent,
  UnknownIntent,
  RulesCapabilities,
} from "./intent.js";
export {
  DEFAULT_CAPABILITIES,
  parseGameIntent,
  intentSupported,
  directionToDelta,
} from "./intent.js";
