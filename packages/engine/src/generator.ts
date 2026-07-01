import type { DungeonDocument, GenerationOptions } from "./types.js";
import { DEFAULT_GENERATION_OPTIONS } from "./types.js";
import { loadSrdDatabase, getMotif } from "./srd-database.js";
import { generateTopology, getStairRoomIds, renderAsciiMap } from "./topology.js";
import { stockRooms } from "./stocking.js";
import { generateDungeonHook, generateRumor } from "./narrative-templates.js";
import { SeededRandom, generateDungeonName } from "./utils.js";

export interface GenerateResult {
  dungeon: DungeonDocument;
  asciiMap: string;
}

export function mergeOptions(partial: Partial<GenerationOptions> = {}): GenerationOptions {
  return { ...DEFAULT_GENERATION_OPTIONS, ...partial };
}

export function generateDungeon(partial: Partial<GenerationOptions> = {}): GenerateResult {
  const options = mergeOptions(partial);
  const db = loadSrdDatabase();
  const motif = getMotif(db, options.motifId);
  const rng = new SeededRandom(options.seed);

  const topology = generateTopology(rng, options);
  const stairIds = getStairRoomIds(topology);
  const stockedRooms = stockRooms(
    rng,
    db,
    options,
    topology.rooms,
    topology.entranceRoomId,
    stairIds
  );

  const dungeon: DungeonDocument = {
    schemaVersion: 2,
    metadata: {
      seed: options.seed,
      name: generateDungeonName(rng, motif.name),
      partyLevel: options.partyLevel,
      partySize: options.partySize,
      difficulty: options.difficulty,
      motifId: motif.id,
      motifName: motif.name,
      mapTheme: options.mapTheme,
      generatedAt: new Date().toISOString(),
      srdVersion: "5.2.1",
      license: db.license,
      hook: generateDungeonHook(rng, motif),
      rumor: generateRumor(rng),
    },
    grid: {
      width: options.gridWidth,
      height: options.gridHeight,
      cellSizeFeet: 5,
    },
    floors: topology.floors,
    rooms: stockedRooms,
    corridors: topology.corridors,
    stairs: topology.stairs,
    entranceRoomId: topology.entranceRoomId,
  };

  return {
    dungeon,
    asciiMap: renderAsciiMap(options, { ...topology, rooms: stockedRooms }),
  };
}

export { loadSrdDatabase, mergeOptions as mergeGenerationOptions };
export type { GenerationOptions, DungeonDocument };