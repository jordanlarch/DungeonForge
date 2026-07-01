#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  generateDungeon,
  exportJson,
  exportMarkdown,
} from "@dungeonforge/engine";

function parseArgs(argv) {
  const args = { command: argv[2] ?? "generate" };
  for (let i = 3; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--seed") args.seed = Number(argv[++i]);
    else if (arg === "--level") args.level = Number(argv[++i]);
    else if (arg === "--size") args.size = Number(argv[++i]);
    else if (arg === "--party") args.party = Number(argv[++i]);
    else if (arg === "--difficulty") args.difficulty = argv[++i];
    else if (arg === "--motif") args.motif = argv[++i];
    else if (arg === "--density") args.density = argv[++i];
    else if (arg === "--output" || arg === "-o") args.output = argv[++i];
  }
  return args;
}

const args = parseArgs(process.argv);

if (args.command !== "generate") {
  console.error("Usage: dungeonforge generate [--seed N] [--level N] [--size N] [--party N] [--difficulty low|moderate|high] [--motif id] [--output dir]");
  process.exit(1);
}

const { dungeon, asciiMap } = generateDungeon({
  seed: args.seed,
  partyLevel: args.level ?? 3,
  partySize: args.party ?? 4,
  difficulty: args.difficulty ?? "moderate",
  roomCount: args.size ?? 12,
  motifId: args.motif ?? "abandoned",
  density: args.density ?? "scattered",
});

const outDir = resolve(args.output ?? ".");
mkdirSync(outDir, { recursive: true });

const jsonPath = resolve(outDir, "dungeon.json");
const mdPath = resolve(outDir, "dungeon.md");

writeFileSync(jsonPath, exportJson(dungeon));
writeFileSync(mdPath, exportMarkdown(dungeon, asciiMap));

console.log(`Generated: ${dungeon.metadata.name}`);
console.log(`  Rooms: ${dungeon.rooms.length}`);
console.log(`  JSON: ${jsonPath}`);
console.log(`  Markdown: ${mdPath}`);
