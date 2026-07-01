#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  generateDungeon,
  exportJson,
  exportMarkdown,
  DEFAULT_GENERATION_OPTIONS,
} from "@dungeonforge/engine";

function parseArgs(argv) {
  const args: Record<string, unknown> = { command: argv[2] ?? "generate" };
  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--seed") args.seed = Number(argv[++i]);
    else if (arg === "--level") args.level = Number(argv[++i]);
    else if (arg === "--size") args.size = Number(argv[++i]);
    else if (arg === "--floors") args.floors = Number(argv[++i]);
    else if (arg === "--party") args.party = Number(argv[++i]);
    else if (arg === "--difficulty") args.difficulty = argv[++i];
    else if (arg === "--motif") args.motif = argv[++i];
    else if (arg === "--theme") args.theme = argv[++i];
    else if (arg === "--encounters") args.encounters = Number(argv[++i]);
    else if (arg === "--traps") args.traps = Number(argv[++i]);
    else if (arg === "--treasure") args.treasure = Number(argv[++i]);
    else if (arg === "--output" || arg === "-o") args.output = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv);

if (args.command !== "generate") {
  console.error("Usage: dungeonforge generate [options]");
  process.exit(1);
}

const { dungeon, asciiMap } = generateDungeon({
  ...DEFAULT_GENERATION_OPTIONS,
  seed: (args.seed as number) ?? DEFAULT_GENERATION_OPTIONS.seed,
  partyLevel: (args.level as number) ?? 3,
  partySize: (args.party as number) ?? 4,
  difficulty: (args.difficulty as typeof DEFAULT_GENERATION_OPTIONS.difficulty) ?? "moderate",
  roomCount: (args.size as number) ?? 12,
  floorCount: (args.floors as number) ?? 1,
  motifId: (args.motif as string) ?? "abandoned",
  mapTheme: (args.theme as typeof DEFAULT_GENERATION_OPTIONS.mapTheme) ?? "parchment",
  encounterDensity: (args.encounters as number) ?? 35,
  trapDensity: (args.traps as number) ?? 20,
  treasureDensity: (args.treasure as number) ?? 20,
});

const outDir = resolve((args.output as string) ?? ".");
mkdirSync(outDir, { recursive: true });

writeFileSync(resolve(outDir, "dungeon.json"), exportJson(dungeon));
writeFileSync(resolve(outDir, "dungeon.md"), exportMarkdown(dungeon, asciiMap));

console.log(`Generated: ${dungeon.metadata.name}`);
console.log(`  Floors: ${dungeon.floors.length}, Rooms: ${dungeon.rooms.length}`);
