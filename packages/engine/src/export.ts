import type { DungeonDocument, RoomNode } from "./types.js";

function formatRoom(room: RoomNode): string {
  const lines: string[] = [];
  lines.push(`### ${room.number}. ${room.name} (Floor ${room.floor})`);
  lines.push(`**Role:** ${room.content.role} | **Light:** ${room.content.lightLevel}`);
  if (room.content.narrative?.template) lines.push(room.content.narrative.template);
  if (room.content.narrative?.aiEnhanced) lines.push(`*${room.content.narrative.aiEnhanced}*`);
  lines.push(room.content.description);

  if (room.content.hazard) {
    lines.push(`**Hazard:** ${room.content.hazard.name} — ${room.content.hazard.summary}`);
  }
  if (room.content.encounter) {
    lines.push("**Encounter:**");
    for (const m of room.content.encounter.monsters) {
      lines.push(`- ${m.count}× ${m.name} (CR ${m.cr})`);
    }
    lines.push(`*${room.content.encounter.xpSpent}/${room.content.encounter.xpBudget} XP*`);
  }
  if (room.content.trap) {
    const t = room.content.trap;
    lines.push(`**Trap — ${t.name}:** ${t.summary}`);
  }
  if (room.content.treasure) {
    lines.push(`**Treasure:** ${room.content.treasure.description}`);
  }
  if (room.content.npc) {
    const n = room.content.npc;
    lines.push(`**NPC — ${n.name}:** ${n.personality}`);
    for (const d of n.dialogue) lines.push(`> ${d}`);
    lines.push(`*Secret: ${n.secret}*`);
  }
  return lines.join("\n");
}

export function exportMarkdown(dungeon: DungeonDocument, asciiMap?: string): string {
  const { metadata } = dungeon;
  const lines: string[] = [];

  lines.push(`# ${metadata.name}`);
  lines.push("");
  lines.push(`> ${metadata.motifName} · Level ${metadata.partyLevel} party · Seed \`${metadata.seed}\``);
  if (metadata.hook) lines.push(`> **Hook:** ${metadata.hook}`);
  if (metadata.rumor) lines.push(`> **Rumor:** ${metadata.rumor}`);
  lines.push("");
  lines.push(`- **Floors:** ${dungeon.floors.length}`);
  lines.push(`- **Rooms:** ${dungeon.rooms.length}`);
  lines.push(`- **Entrance:** Room ${dungeon.rooms.find((r) => r.id === dungeon.entranceRoomId)?.number ?? "?"}`);
  lines.push("");

  if (asciiMap) {
    lines.push("## Map (ASCII)");
    lines.push("```");
    lines.push(asciiMap);
    lines.push("```");
    lines.push("");
  }

  for (const floor of dungeon.floors) {
    lines.push(`## ${floor.name}`);
    lines.push("");
    for (const room of dungeon.rooms.filter((r) => r.floor === floor.number).sort((a, b) => a.number - b.number)) {
      lines.push(formatRoom(room));
      lines.push("");
    }
  }

  if (dungeon.stairs.length) {
    lines.push("## Stairs");
    for (const s of dungeon.stairs) {
      lines.push(`- Floor ${s.fromFloor} room → Floor ${s.toFloor} room`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`*${metadata.license}*`);
  return lines.join("\n");
}

export function exportJson(dungeon: DungeonDocument): string {
  return JSON.stringify(dungeon, null, 2);
}

export function downloadFilename(dungeon: DungeonDocument, ext: string): string {
  const slug = dungeon.metadata.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "dungeon"}-${dungeon.metadata.seed}.${ext}`;
}
