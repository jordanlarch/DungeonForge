import { useMemo, useState } from "react";
import type {
  DungeonDocument,
  EncounterDifficulty,
  GenerationOptions,
  MapTheme,
} from "@dungeonforge/engine";
import {
  generateDungeon,
  DEFAULT_GENERATION_OPTIONS,
  rerollRoomContent,
  loadSrdDatabase,
  exportJson,
  exportMarkdown,
  downloadFilename,
} from "@dungeonforge/engine";
import {
  renderDungeonSvg,
  svgToPngBlob,
  downloadBlob,
} from "@dungeonforge/renderer";
import {
  createNarrativeProvider,
  buildRoomContext,
} from "@dungeonforge/narrative";
import SettingsModal from "../components/SettingsModal";
import { loadDungeon, saveDungeon } from "../lib/storage";

const MOTIFS = [
  "abandoned", "undead", "vermin", "underdark", "arcane", "giant", "aquatic", "infernal",
];

function downloadText(filename: string, content: string, mime: string) {
  downloadBlob(new Blob([content], { type: mime }), filename);
}

export default function ForgePage() {
  const [opts, setOpts] = useState<GenerationOptions>({ ...DEFAULT_GENERATION_OPTIONS });
  const [dungeon, setDungeon] = useState<DungeonDocument | null>(() => loadDungeon());
  const [activeFloor, setActiveFloor] = useState(1);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });

  const selectedRoom = dungeon?.rooms.find((r) => r.id === selectedRoomId) ?? null;

  const svg = useMemo(() => {
    if (!dungeon) return "";
    return renderDungeonSvg(dungeon, {
      activeFloor,
      selectedRoomId,
      theme: opts.mapTheme,
    });
  }, [dungeon, activeFloor, selectedRoomId, opts.mapTheme]);

  const handleGenerate = () => {
    const result = generateDungeon(opts);
    setDungeon(result.dungeon);
    saveDungeon(result.dungeon);
    setActiveFloor(1);
    setSelectedRoomId(null);
    setView({ x: 0, y: 0, scale: 1 });
  };

  const patchOpt = <K extends keyof GenerationOptions>(key: K, value: GenerationOptions[K]) => {
    setOpts((o) => ({ ...o, [key]: value }));
  };

  const handleRerollRoom = () => {
    if (!dungeon || !selectedRoomId) return;
    const db = loadSrdDatabase();
    const updated = rerollRoomContent(dungeon, selectedRoomId, opts, db, Date.now());
    const next = { ...dungeon, rooms: updated };
    setDungeon(next);
    saveDungeon(next);
  };

  const handleEnhanceRoom = async () => {
    if (!dungeon || !selectedRoom) return;
    const provider = createNarrativeProvider();
    if (!provider) {
      setShowSettings(true);
      return;
    }
    setAiLoading(true);
    try {
      const ctx = buildRoomContext(
        dungeon.metadata.name,
        dungeon.metadata.motifName,
        selectedRoom
      );
      const text = await provider.enhanceRoom(ctx);
      const next = {
        ...dungeon,
        rooms: dungeon.rooms.map((r) =>
          r.id === selectedRoom.id
            ? {
                ...r,
                content: {
                  ...r.content,
                  narrative: {
                    ...r.content.narrative,
                    template: r.content.narrative?.template ?? "",
                    aiEnhanced: text,
                  },
                },
              }
            : r
        ),
      };
      setDungeon(next);
      saveDungeon(next);
    } catch (e) {
      alert(e instanceof Error ? e.message : "AI enhancement failed");
    } finally {
      setAiLoading(false);
    }
  };

  const handleExportPng = async () => {
    if (!svg || !dungeon) return;
    const blob = await svgToPngBlob(svg);
    downloadBlob(blob, downloadFilename(dungeon, "png"));
  };

  const handleExportSvg = () => {
    if (!svg || !dungeon) return;
    downloadText(downloadFilename(dungeon, "svg"), svg, "image/svg+xml");
  };

  const cellPx = 50;
  const mapW = (dungeon?.grid.width ?? 60) * cellPx;
  const mapH = (dungeon?.grid.height ?? 40) * cellPx;

  return (
    <>
      <div className="page-toolbar">
        <div className="header-actions">
          <button type="button" onClick={() => setShowSettings(true)}>Settings</button>
          <button type="button" onClick={() => patchOpt("seed", Math.floor(Math.random() * 1e6))}>
            New Seed
          </button>
          <button type="button" className="primary" onClick={handleGenerate}>
            Generate
          </button>
        </div>
      </div>

      <div className="layout">
        <aside className="panel controls">
          <h2>Generator</h2>
          <label>Seed<input type="number" value={opts.seed} onChange={(e) => patchOpt("seed", +e.target.value)} /></label>
          <label>Party Level ({opts.partyLevel})
            <input type="range" min={1} max={20} value={opts.partyLevel} onChange={(e) => patchOpt("partyLevel", +e.target.value)} />
          </label>
          <label>Party Size<input type="number" min={1} max={8} value={opts.partySize} onChange={(e) => patchOpt("partySize", +e.target.value)} /></label>
          <label>Difficulty
            <select value={opts.difficulty} onChange={(e) => patchOpt("difficulty", e.target.value as EncounterDifficulty)}>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>Rooms ({opts.roomCount})
            <input type="range" min={6} max={30} value={opts.roomCount} onChange={(e) => patchOpt("roomCount", +e.target.value)} />
          </label>
          <label>Floors ({opts.floorCount})
            <input type="range" min={1} max={5} value={opts.floorCount} onChange={(e) => patchOpt("floorCount", +e.target.value)} />
          </label>
          <label>Motif
            <select value={opts.motifId} onChange={(e) => patchOpt("motifId", e.target.value)}>
              {MOTIFS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label>Map theme
            <select value={opts.mapTheme} onChange={(e) => patchOpt("mapTheme", e.target.value as MapTheme)}>
              <option value="parchment">Parchment</option>
              <option value="darkStone">Dark stone</option>
            </select>
          </label>
          <label>Layout density
            <select value={opts.density} onChange={(e) => patchOpt("density", e.target.value as GenerationOptions["density"])}>
              <option value="sparse">Sparse</option>
              <option value="scattered">Scattered</option>
              <option value="dense">Dense</option>
            </select>
          </label>
          <h3>Stocking</h3>
          <label>Encounters ({opts.encounterDensity}%)
            <input type="range" min={0} max={60} value={opts.encounterDensity} onChange={(e) => patchOpt("encounterDensity", +e.target.value)} />
          </label>
          <label>Traps ({opts.trapDensity}%)
            <input type="range" min={0} max={40} value={opts.trapDensity} onChange={(e) => patchOpt("trapDensity", +e.target.value)} />
          </label>
          <label>Treasure ({opts.treasureDensity}%)
            <input type="range" min={0} max={40} value={opts.treasureDensity} onChange={(e) => patchOpt("treasureDensity", +e.target.value)} />
          </label>
          <label>NPCs ({opts.npcDensity}%)
            <input type="range" min={0} max={30} value={opts.npcDensity} onChange={(e) => patchOpt("npcDensity", +e.target.value)} />
          </label>
          <label>Secret doors ({Math.round(opts.secretDoorChance * 100)}%)
            <input type="range" min={0} max={50} value={opts.secretDoorChance * 100} onChange={(e) => patchOpt("secretDoorChance", +e.target.value / 100)} />
          </label>
          <label>Hazards ({Math.round(opts.hazardChance * 100)}%)
            <input type="range" min={0} max={50} value={opts.hazardChance * 100} onChange={(e) => patchOpt("hazardChance", +e.target.value / 100)} />
          </label>
        </aside>

        <main className="panel editor-panel">
          {dungeon ? (
            <>
              <div className="editor-toolbar">
                <h2>{dungeon.metadata.name}</h2>
                <div className="floor-tabs">
                  {dungeon.floors.map((f) => (
                    <button key={f.number} type="button" className={activeFloor === f.number ? "active" : ""} onClick={() => setActiveFloor(f.number)}>
                      {f.name}
                    </button>
                  ))}
                </div>
                <div className="toolbar-actions">
                  <button type="button" onClick={() => setView((v) => ({ ...v, scale: Math.min(2, v.scale + 0.1) }))}>+</button>
                  <button type="button" onClick={() => setView((v) => ({ ...v, scale: Math.max(0.3, v.scale - 0.1) }))}>−</button>
                  <button type="button" onClick={handleExportSvg}>SVG</button>
                  <button type="button" onClick={handleExportPng}>PNG</button>
                  <button type="button" onClick={() => downloadText(downloadFilename(dungeon, "json"), exportJson(dungeon), "application/json")}>JSON</button>
                  <button type="button" onClick={() => downloadText(downloadFilename(dungeon, "md"), exportMarkdown(dungeon), "text/markdown")}>MD</button>
                </div>
              </div>
              <div
                className="map-viewport"
                onWheel={(e) => {
                  e.preventDefault();
                  setView((v) => ({ ...v, scale: Math.max(0.2, Math.min(3, v.scale - e.deltaY * 0.001)) }));
                }}
              >
                <div
                  className="map-transform"
                  style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
                >
                  <div
                    className="map-hit-layer"
                    style={{ width: mapW, height: mapH, position: "relative" }}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                  {dungeon.rooms.filter((r) => r.floor === activeFloor).map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      className={`room-hit ${selectedRoomId === room.id ? "selected" : ""}`}
                      style={{
                        left: room.bounds.x * cellPx,
                        top: room.bounds.y * cellPx,
                        width: room.bounds.width * cellPx,
                        height: room.bounds.height * cellPx,
                      }}
                      onClick={() => setSelectedRoomId(room.id)}
                      aria-label={`Room ${room.number}`}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>Configure options and click <strong>Generate</strong> to create a dungeon.</p>
            </div>
          )}
        </main>

        <aside className="panel key-panel">
          <h2>Room Key</h2>
          {dungeon?.metadata.hook && <p className="hook">{dungeon.metadata.hook}</p>}
          {selectedRoom ? (
            <article className="room-detail">
              <h3>#{selectedRoom.number} · {selectedRoom.content.role}</h3>
              {selectedRoom.content.narrative?.template && <p className="narrative">{selectedRoom.content.narrative.template}</p>}
              {selectedRoom.content.narrative?.aiEnhanced && <p className="ai-narrative">{selectedRoom.content.narrative.aiEnhanced}</p>}
              <p>{selectedRoom.content.description}</p>
              {selectedRoom.content.hazard && <p><strong>Hazard:</strong> {selectedRoom.content.hazard.name}</p>}
              {selectedRoom.content.encounter && (
                <ul>{selectedRoom.content.encounter.monsters.map((m) => <li key={m.id}>{m.count}× {m.name}</li>)}</ul>
              )}
              {selectedRoom.content.trap && <p><strong>Trap:</strong> {selectedRoom.content.trap.name}</p>}
              {selectedRoom.content.treasure && <p><strong>Treasure:</strong> {selectedRoom.content.treasure.description}</p>}
              {selectedRoom.content.npc && (
                <>
                  <p><strong>{selectedRoom.content.npc.name}</strong> — {selectedRoom.content.npc.personality}</p>
                  {selectedRoom.content.npc.dialogue.map((d) => <blockquote key={d}>{d}</blockquote>)}
                </>
              )}
              <div className="room-actions">
                <button type="button" onClick={handleRerollRoom}>Reroll contents</button>
                <button type="button" onClick={handleEnhanceRoom} disabled={aiLoading}>
                  {aiLoading ? "Enhancing…" : "Enhance with AI"}
                </button>
              </div>
            </article>
          ) : (
            <p className="muted">Click a room on the map to inspect and edit.</p>
          )}
        </aside>
      </div>

      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
