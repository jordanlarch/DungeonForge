import type { Motif, RoomContent, RoomNode } from "./types.js";
import { SeededRandom } from "./utils.js";

const HOOKS = [
  "Locals whisper that something valuable was left behind when the place was abandoned.",
  "A patron paid well for a map to this site—but warned not to go alone.",
  "Strange lights have been seen near the entrance on moonless nights.",
  "Every expedition that entered left something behind: a journal, a blade, a prayer.",
];

const RUMORS = [
  "The lower levels flood when it rains on the surface.",
  "A former occupant still walks the halls, though none agree on who.",
  "The treasure is cursed—or so says the only survivor of the last party.",
];

const ROOM_NARRATIVE: Record<string, string[]> = {
  entrance: [
    "A threshold marked by old claw marks and faded chalk symbols.",
    "The air changes here—cooler, heavier, as if the dungeon exhales.",
  ],
  encounter: [
    "Signs of recent habitation: bones, ash, something watching from the dark.",
    "This chamber was clearly defended. It still is.",
  ],
  trap: [
    "The floor is too clean, the walls too smooth—something is wrong.",
    "Mechanical precision in an otherwise chaotic ruin. Tread carefully.",
  ],
  treasure: [
    "A vault-like stillness. Greed has killed here before.",
    "Glitter catches torchlight—but so do trip-wires.",
  ],
  empty: [
    "An eerily quiet space, as if holding its breath.",
    "Dust motes swirl in a draft from somewhere deeper.",
  ],
  npc: [
    "Someone—or something—has made this room a refuge.",
    "Signs of a camp: bedroll, cold fire, wary eyes in the shadows.",
  ],
  stairs: [
    "Steps worn smooth by centuries of cautious descent.",
    "The stairwell spirals into colder, darker air.",
  ],
};

export function generateDungeonHook(rng: SeededRandom, motif: Motif): string {
  return `${rng.pick(HOOKS)} (${motif.name.toLowerCase()} theme)`;
}

export function generateRumor(rng: SeededRandom): string {
  return rng.pick(RUMORS);
}

export function generateRoomNarrative(
  rng: SeededRandom,
  room: RoomNode,
  motif: Motif
): { template: string; hook?: string } {
  const role = room.content.role;
  const pool = ROOM_NARRATIVE[role] ?? ROOM_NARRATIVE.empty;
  const template = rng.pick(pool);
  return {
    template: `${template} [${motif.name}]`,
    hook: role === "entrance" ? generateDungeonHook(rng, motif) : undefined,
  };
}

export function applyNarrativesToRooms(
  rng: SeededRandom,
  rooms: RoomNode[],
  motif: Motif
): RoomNode[] {
  return rooms.map((room) => ({
    ...room,
    content: {
      ...room.content,
      narrative: generateRoomNarrative(rng, room, motif),
    },
  }));
}

export function enrichDescription(content: RoomContent): string {
  const parts = [content.description];
  if (content.narrative?.template) parts.push(content.narrative.template);
  if (content.narrative?.aiEnhanced) parts.push(content.narrative.aiEnhanced);
  return parts.filter(Boolean).join(" ");
}
