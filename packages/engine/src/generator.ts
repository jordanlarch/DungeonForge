import type { DungeonDocument, GenerationOptions } from "./types.js";
import { loadSrdDatabase, getMotif } from "./srd-database.js";
import { generateTopology, renderAsciiMap } from "./topology.js";
import { stockRooms } from "./stocking.js";
import { SeededRandom, generateDungeonName } from "./utils.js";

export interface GenerateResult {
  dungeon: DungeonDocument;
  asciiMap: string;
}

export function generateDungeon(partial: Partial<GenerationOptions> = {}): GenerateResult {
  const options: GenerationOptions = {
    seed: partial.seed ?? Date.now(),
    partyLevel: partial.partyLevel ?? 3,
    partySize: partial.partySize ?? 4,
    difficulty: partial.difficulty ?? "moderate",
    roomCount: partial.roomCount ?? 12,
    gridWidth: partial.gridWidth ?? 60,
    gridHeight: partial.gridHeight ?? 40,
    motifId: partial.motifId ?? "abandoned",
    density: partial.density ?? "scattered",
  };

  const db = loadSrdDatabase();
  const motif = getMotif(db, options.motifId);
  const rng = new SeededRandom(options.seed);

  const topology = generateTopology(rng, options);
  const stockedRooms = stockRooms(
    rng,
    db,
    options,
    topology.rooms,
    topology.entranceRoomId
  );

  const dungeon: DungeonDocument = {
    schemaVersion: 1,
    metadata: {
      seed: options.seed,
      name: generateDungeonName(rng, motif.name),
      partyLevel: options.partyLevel,
      partySize: options.partySize,
      difficulty: options.difficulty,
      motifId: motif.id,
      motifName: motif.name,
      generatedAt: new Date().toISOString(),
      srdVersion: "5.2.1",
      license: db.license,
    },
    grid: {
      width: options.gridWidth,
      height: options.gridHeight,
      cellSizeFeet: 5,
    },
    rooms: stockedRooms,
    corridors: topology.corridors,
    entranceRoomId: topology.entranceRoomId,
  };

  return {
    dungeon,
    asciiMap: renderAsciiMap(options, { ...topology, rooms: stockedRooms }),
  };
}

export { loadSrdDatabase };
export type { GenerationOptions, DungeonDocument };
