import { useState } from "react";
import type { AbilityKey, CharacterDocument } from "@dungeonforge/character-engine";
import {
  CLASSES,
  SPECIES,
  createCharacter,
  defaultAbilitiesFromArray,
  deleteCharacter,
  loadParty,
  setActiveCharacter,
  togglePartyMember,
  upsertCharacter,
  abilityModifier,
  MAX_PARTY,
} from "@dungeonforge/character-engine";

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

export default function CharactersPage() {
  const [party, setParty] = useState(() => loadParty());
  const [form, setForm] = useState({
    name: "",
    speciesId: "human",
    classId: "fighter",
    level: 1,
    abilities: defaultAbilitiesFromArray(),
  });

  const active = party.characters.find((c) => c.id === party.activeCharacterId) ?? party.characters[0] ?? null;

  const handleCreate = () => {
    const character = createCharacter(form);
    const roster = upsertCharacter(character);
    setParty(roster);
    setForm((f) => ({ ...f, name: "" }));
  };

  const handleSelect = (c: CharacterDocument) => {
    setParty(setActiveCharacter(c.id));
  };

  const handleDelete = (id: string) => {
    setParty(deleteCharacter(id));
  };

  const preview = createCharacter({ ...form, name: form.name || "Preview" });

  return (
    <div className="characters-page">
      <div className="layout characters-layout">
        <aside className="panel">
          <h2>Party Roster</h2>
          {party.characters.length === 0 && <p className="muted">No characters yet. Create one to play.</p>}
          <ul className="roster-list">
            {party.characters.map((c) => (
              <li key={c.id} className={party.partyMemberIds.includes(c.id) ? "in-party" : ""}>
                <button type="button" className="roster-btn" onClick={() => handleSelect(c)}>
                  <strong>{c.name}</strong>
                  <span>L{c.level} {CLASSES.find((x) => x.id === c.classId)?.name} · HP {c.hp.current}/{c.hp.max}</span>
                </button>
                <button
                  type="button"
                  className={party.partyMemberIds.includes(c.id) ? "party-toggle active" : "party-toggle"}
                  title="Include in Play party"
                  onClick={() => setParty(togglePartyMember(c.id))}
                >
                  {party.partyMemberIds.includes(c.id) ? "★" : "☆"}
                </button>
                <button type="button" className="danger-btn" onClick={() => handleDelete(c.id)}>×</button>
              </li>
            ))}
          </ul>
          <p className="muted">Party for Play: {party.partyMemberIds.length}/{MAX_PARTY} selected (★)</p>
          {active && (
            <div className="active-summary">
              <h3>Selected for editing</h3>
              <p>{active.name} · AC {active.armorClass} · Init +{active.initiativeBonus}</p>
            </div>
          )}
        </aside>

        <main className="panel">
          <h2>Character Builder</h2>
          <p className="muted">SRD 5.2.1 subset — levels 1–5, standard array.</p>
          <div className="char-form">
            <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Adventurer" /></label>
            <label>Species
              <select value={form.speciesId} onChange={(e) => setForm({ ...form, speciesId: e.target.value })}>
                {SPECIES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label>Class
              <select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                {CLASSES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>Level ({form.level})
              <input type="range" min={1} max={5} value={form.level} onChange={(e) => setForm({ ...form, level: +e.target.value })} />
            </label>
            <h3>Ability Scores (standard array)</h3>
            {ABILITY_KEYS.map((key) => (
              <label key={key}>{key.toUpperCase()} ({form.abilities[key]})
                <input
                  type="number"
                  min={3}
                  max={20}
                  value={form.abilities[key]}
                  onChange={(e) => setForm({
                    ...form,
                    abilities: { ...form.abilities, [key]: +e.target.value },
                  })}
                />
              </label>
            ))}
            <button type="button" className="primary" onClick={handleCreate}>Save Character</button>
          </div>
        </main>

        <aside className="panel sheet-preview">
          <h2>Sheet Preview</h2>
          <h3>{preview.name}</h3>
          <p>{SPECIES.find((s) => s.id === preview.speciesId)?.name} {CLASSES.find((c) => c.id === preview.classId)?.name} {preview.level}</p>
          <p>HP {preview.hp.max} · AC {preview.armorClass} · Speed {preview.speed} ft</p>
          <dl className="ability-grid">
            {ABILITY_KEYS.map((key) => (
              <div key={key}>
                <dt>{key.toUpperCase()}</dt>
                <dd>{preview.abilities[key]} ({abilityModifier(preview.abilities[key]) >= 0 ? "+" : ""}{abilityModifier(preview.abilities[key])})</dd>
              </div>
            ))}
          </dl>
          <h4>Weapons</h4>
          {preview.weapons.map((w) => (
            <p key={w.name}>{w.name}: +{w.attackBonus} to hit, {w.damage} {w.damageType}</p>
          ))}
        </aside>
      </div>
    </div>
  );
}
