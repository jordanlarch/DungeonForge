import { useCallback, useMemo, useState } from "react";
import {
  generateDungeon,
  exportJson,
  exportMarkdown,
  downloadFilename,
  type EncounterDifficulty,
  type GenerationOptions,
} from "@dungeonforge/engine";

const MOTIFS = [
  "abandoned",
  "undead",
  "vermin",
  "underdark",
  "arcane",
  "giant",
  "aquatic",
  "infernal",
];

const DENSITIES: GenerationOptions["density"][] = [
  "sparse",
  "scattered",
  "dense",
];

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [seed, setSeed] = useState(42);
  const [partyLevel, setPartyLevel] = useState(3);
  const [partySize, setPartySize] = useState(4);
  const [difficulty, setDifficulty] = useState<EncounterDifficulty>("moderate");
  const [roomCount, setRoomCount] = useState(12);
  const [motifId, setMotifId] = useState("abandoned");
  const [density, setDensity] = useState<GenerationOptions["density"]>("scattered");
  const [tab, setTab] = useState<"map" | "key" | "json">("map");

  const result = useMemo(
    () =>
      generateDungeon({
        seed,
        partyLevel,
        partySize,
        difficulty,
        roomCount,
        motifId,
        density,
      }),
    [seed, partyLevel, partySize, difficulty, roomCount, motifId, density]
  );

  const markdown = useMemo(
    () => exportMarkdown(result.dungeon, result.asciiMap),
    [result]
  );

  const json = useMemo(() => exportJson(result.dungeon), [result.dungeon]);

  const rerollSeed = useCallback(() => {
    setSeed(Math.floor(Math.random() * 1_000_000));
  }, []);

  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="eyebrow">SRD 5.2.1 · CC-BY 4.0</p>
          <h1>DungeonForge</h1>
          <p className="subtitle">Procedural dungeons with SRD encounters, traps, and treasure.</p>
        </div>
        <div className="header-actions">
          <button type="button" onClick={rerollSeed}>
            New Seed
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="panel controls">
          <h2>Generate</h2>
          <label>
            Seed
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
            />
          </label>
          <label>
            Party Level
            <input
              type="range"
              min={1}
              max={20}
              value={partyLevel}
              onChange={(e) => setPartyLevel(Number(e.target.value))}
            />
            <span className="value">{partyLevel}</span>
          </label>
          <label>
            Party Size
            <input
              type="number"
              min={1}
              max={8}
              value={partySize}
              onChange={(e) => setPartySize(Number(e.target.value))}
            />
          </label>
          <label>
            Difficulty
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as EncounterDifficulty)}
            >
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Rooms
            <input
              type="range"
              min={6}
              max={24}
              value={roomCount}
              onChange={(e) => setRoomCount(Number(e.target.value))}
            />
            <span className="value">{roomCount}</span>
          </label>
          <label>
            Motif
            <select value={motifId} onChange={(e) => setMotifId(e.target.value)}>
              {MOTIFS.map((m) => (
                <option key={m} value={m}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Density
            <select
              value={density}
              onChange={(e) =>
                setDensity(e.target.value as GenerationOptions["density"])
              }
            >
              {DENSITIES.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </label>

          <div className="export-row">
            <button
              type="button"
              onClick={() =>
                downloadText(
                  downloadFilename(result.dungeon, "json"),
                  json,
                  "application/json"
                )
              }
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={() =>
                downloadText(
                  downloadFilename(result.dungeon, "md"),
                  markdown,
                  "text/markdown"
                )
              }
            >
              Export Markdown
            </button>
          </div>
        </aside>

        <main className="panel output">
          <div className="dungeon-title">
            <h2>{result.dungeon.metadata.name}</h2>
            <p>
              {result.dungeon.metadata.motifName} · {result.dungeon.rooms.length} rooms ·{" "}
              {result.dungeon.corridors.length} corridors
            </p>
          </div>

          <div className="tabs">
            {(["map", "key", "json"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t === "map" ? "Map" : t === "key" ? "Room Key" : "JSON"}
              </button>
            ))}
          </div>

          {tab === "map" && (
            <pre className="ascii-map" aria-label="ASCII dungeon map">
              {result.asciiMap}
            </pre>
          )}
          {tab === "key" && (
            <div className="room-key">
              {result.dungeon.rooms
                .slice()
                .sort((a, b) => a.number - b.number)
                .map((room) => (
                  <article key={room.id} className="room-card">
                    <h3>
                      {room.number}. {room.name}
                      <span className={`badge badge-${room.content.role}`}>
                        {room.content.role}
                      </span>
                    </h3>
                    <p>{room.content.description}</p>
                    {room.content.encounter && (
                      <ul>
                        {room.content.encounter.monsters.map((m) => (
                          <li key={m.id}>
                            {m.count}× {m.name} (CR {m.cr})
                          </li>
                        ))}
                      </ul>
                    )}
                    {room.content.trap && (
                      <p className="trap">
                        <strong>{room.content.trap.name}</strong> — {room.content.trap.summary}
                      </p>
                    )}
                    {room.content.treasure && (
                      <p className="treasure">{room.content.treasure.description}</p>
                    )}
                  </article>
                ))}
            </div>
          )}
          {tab === "json" && <pre className="json-view">{json}</pre>}
        </main>
      </div>

      <footer className="footer">
        <p>
          Content from the D&amp;D System Reference Document v5.2.1 © Wizards of the Coast LLC,
          licensed under CC-BY 4.0.
        </p>
      </footer>
    </div>
  );
}
