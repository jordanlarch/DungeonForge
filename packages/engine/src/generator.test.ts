import { generateDungeon } from "./generator.js";
import { buildEncounter } from "./stocking.js";
import { loadSrdDatabase, getXpBudget } from "./srd-database.js";
import { SeededRandom } from "./utils.js";
import { exportJson, exportMarkdown } from "./export.js";

describe("generateDungeon", () => {
  it("produces deterministic output for a fixed seed", () => {
    const a = generateDungeon({ seed: 42, partyLevel: 3, roomCount: 10 });
    const b = generateDungeon({ seed: 42, partyLevel: 3, roomCount: 10 });
    const stripTime = (json: string) =>
      json.replace(/"generatedAt": "[^"]+"/, '"generatedAt": "FIXED"');
    expect(stripTime(exportJson(a.dungeon))).toBe(stripTime(exportJson(b.dungeon)));
  });

  it("creates rooms, corridors, and entrance", () => {
    const { dungeon } = generateDungeon({ seed: 123, roomCount: 12 });
    expect(dungeon.rooms.length).toBeGreaterThanOrEqual(5);
    expect(dungeon.corridors.length).toBeGreaterThan(0);
    expect(dungeon.entranceRoomId).toBeTruthy();
    expect(dungeon.metadata.srdVersion).toBe("5.2.1");
  });

  it("exports markdown with map and room key", () => {
    const { dungeon, asciiMap } = generateDungeon({ seed: 7 });
    const md = exportMarkdown(dungeon, asciiMap);
    expect(md).toContain("# ");
    expect(md).toContain("## Room Key");
    expect(md).toContain("```");
  });
});

describe("buildEncounter", () => {
  it("spends XP within budget using SRD tables", () => {
    const db = loadSrdDatabase();
    const rng = new SeededRandom(99);
    const options = {
      seed: 99,
      partyLevel: 5,
      partySize: 4,
      difficulty: "moderate" as const,
      roomCount: 10,
      gridWidth: 60,
      gridHeight: 40,
      motifId: "undead",
      density: "scattered" as const,
    };
    const budget = getXpBudget(db, 5, 4, "moderate");
    const encounter = buildEncounter(rng, db, options, db.motifs.find((m) => m.id === "undead")!);
    expect(encounter.xpBudget).toBe(budget);
    expect(encounter.monsters.length).toBeGreaterThan(0);
    expect(encounter.xpSpent).toBeLessThanOrEqual(encounter.xpBudget);
  });
});
