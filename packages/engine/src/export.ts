import type { DungeonDocument, RoomNode } from "./types.js";

function formatRoom(room: RoomNode): string {
  const lines: string[] = [];
  lines.push(`### ${room.number}. ${room.name}`);
  lines.push(`**Role:** ${room.content.role}`);
  lines.push(`**Light:** ${room.content.lightLevel}`);
  lines.push(room.content.description);

  if (room.content.terrain) {
    lines.push(`**Terrain:** ${room.content.terrain}`);
  }

  if (room.content.encounter) {
    lines.push("**Encounter:**");
    for (const m of room.content.encounter.monsters) {
      lines.push(`- ${m.count}× ${m.name} (CR ${m.cr}, ${m.xp} XP each)`);
    }
    lines.push(
      `*Budget: ${room.content.encounter.xpSpent}/${room.content.encounter.xpBudget} XP (${room.content.encounter.difficulty})*`
    );
  }

  if (room.content.trap) {
    const t = room.content.trap;
    lines.push(`**Trap — ${t.name}** (${t.severity})`);
    lines.push(`- Trigger: ${t.trigger}`);
    lines.push(`- Effect: ${t.summary}`);
    if (t.damage) lines.push(`- Damage: ${t.damage}${t.saveDc ? `, DC ${t.saveDc}` : ""}`);
    lines.push(`- Detect: ${t.detectSkill} DC ${t.detectDc}`);
  }

  if (room.content.treasure) {
    lines.push(`**Treasure:** ${room.content.treasure.description}`);
  }

  return lines.join("\n");
}

export function exportMarkdown(dungeon: DungeonDocument, asciiMap?: string): string {
  const { metadata } = dungeon;
  const lines: string[] = [];

  lines.push(`# ${metadata.name}`);
  lines.push("");
  lines.push(`> ${metadata.motifName} dungeon for a level ${metadata.partyLevel} party (${metadata.partySize} characters).`);
  lines.push(`> Encounter difficulty: **${metadata.difficulty}**. Seed: \`${metadata.seed}\`.`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- **Entrance:** Room ${dungeon.rooms.find((r) => r.id === dungeon.entranceRoomId)?.number ?? "?"}`);
  lines.push(`- **Rooms:** ${dungeon.rooms.length}`);
  lines.push(`- **Corridors:** ${dungeon.corridors.length}`);
  lines.push(`- **SRD:** ${metadata.srdVersion} (CC-BY 4.0)`);
  lines.push("");

  if (asciiMap) {
    lines.push("## Map");
    lines.push("```");
    lines.push(asciiMap);
    lines.push("```");
    lines.push("");
  }

  lines.push("## Room Key");
  lines.push("");
  for (const room of [...dungeon.rooms].sort((a, b) => a.number - b.number)) {
    lines.push(formatRoom(room));
    lines.push("");
  }

  lines.push("## Corridors");
  lines.push("");
  for (const corridor of dungeon.corridors) {
    const from = dungeon.rooms.find((r) => r.id === corridor.fromRoomId)?.number;
    const to = dungeon.rooms.find((r) => r.id === corridor.toRoomId)?.number;
    lines.push(
      `- Room ${from} ↔ Room ${to}: ${corridor.door} door`
    );
  }

  lines.push("");
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
