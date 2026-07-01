import { generateDungeon } from "./generator.js";
import { buildEncounter } from "./stocking.js";
import { loadSrdDatabase, getXpBudget } from "./srd-database.js";
import { SeededRandom } from "./utils.js";
import { exportJson, exportMarkdown } from "./export.js";
import { renderDungeonSvg } from "@dungeonforge/renderer";

describe("generateDungeon v2", () => {
  it("produces deterministic output for a fixed seed", () => {
    const a = generateDungeon({ seed: 42, partyLevel: 3, roomCount: 10, floorCount: 2 });
    const b = generateDungeon({ seed: 42, partyLevel: 3, roomCount: 10, floorCount: 2 });
    const stripTime = (json: string) =>
      json.replace(/"generatedAt": "[^"]+"/, '"generatedAt": "FIXED"');
    expect(stripTime(exportJson(a.dungeon))).toBe(stripTime(exportJson(b.dungeon)));
  });

  it("creates multi-floor dungeons with schema v2", () => {
    const { dungeon } = generateDungeon({ seed: 123, roomCount: 12, floorCount: 2 });
    expect(dungeon.schemaVersion).toBe(2);
    expect(dungeon.floors.length).toBe(2);
    expect(dungeon.stairs.length).toBeGreaterThan(0);
    expect(dungeon.rooms.every((r) => r.floor >= 1)).toBe(true);
  });

  it("exports markdown with hook and rumor", () => {
    const { dungeon } = generateDungeon({ seed: 7 });
    const md = exportMarkdown(dungeon);
    expect(md).toContain("# ");
    expect(md).toContain("Hook");
  });

  it("renders SVG for both themes", () => {
    const { dungeon } = generateDungeon({ seed: 1, mapTheme: "parchment" });
    const svg = renderDungeonSvg(dungeon, { theme: "darkStone" });
    expect(svg).toContain("<svg");
    expect(svg).toContain("#1e1e24");
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
      floorCount: 1,
      encounterDensity: 35,
      trapDensity: 20,
      treasureDensity: 20,
      secretDoorChance: 0.15,
      hazardChance: 0.15,
      npcDensity: 10,
      mapTheme: "parchment" as const,
    };
    const budget = getXpBudget(db, 5, 4, "moderate");
    const encounter = buildEncounter(rng, db, options, db.motifs.find((m) => m.id === "undead")!);
    expect(encounter.xpBudget).toBe(budget);
    expect(encounter.monsters.length).toBeGreaterThan(0);
  });
});
