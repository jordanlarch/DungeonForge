import type { CharacterDocument } from "@dungeonforge/character-engine";
import { CLASSES, SPECIES } from "@dungeonforge/character-engine";
import type { CombatState } from "@dungeonforge/rules-engine";
import { currentParticipant } from "@dungeonforge/rules-engine";

interface CharacterRailProps {
  party: CharacterDocument[];
  activeCharacterId: string | null;
  combat: CombatState | null;
  expandedId: string | null;
  onSelect: (id: string) => void;
  onToggleSheet: (id: string) => void;
}

export default function CharacterRail({
  party,
  activeCharacterId,
  combat,
  expandedId,
  onSelect,
  onToggleSheet,
}: CharacterRailProps) {
  if (!party.length) {
    return (
      <aside className="character-rail panel">
        <p className="muted">Add characters to your party on the Characters page.</p>
      </aside>
    );
  }

  const current = combat ? currentParticipant(combat) : null;

  return (
    <aside className="character-rail panel">
      <h3>Party ({party.length})</h3>
      {party.map((character) => {
        const inCombat = combat?.order.find((p) => p.characterId === character.id);
        const hp = inCombat?.hp ?? character.hp;
        const isTurn = current?.characterId === character.id;
        return (
          <div key={character.id} className={`party-member ${activeCharacterId === character.id ? "active" : ""} ${isTurn ? "turn" : ""}`}>
            <button type="button" className="character-portrait" onClick={() => { onSelect(character.id); onToggleSheet(character.id); }}>
              <span className="portrait-circle">{character.name.slice(0, 1)}</span>
              <div>
                <strong>{character.name}</strong>
                <span>HP {hp.current}/{hp.max}{isTurn ? " · TURN" : ""}</span>
              </div>
            </button>
            {expandedId === character.id && (
              <div className="character-sheet">
                <p>{SPECIES.find((s) => s.id === character.speciesId)?.name} {CLASSES.find((c) => c.id === character.classId)?.name} {character.level}</p>
                <p>AC {character.armorClass} · Init +{character.initiativeBonus}</p>
                {character.knownSpells && character.knownSpells.length > 0 && (
                  <p>Spells: {character.knownSpells.map((s) => s.name).join(", ")}</p>
                )}
                {inCombat?.conditions?.length ? (
                  <p>Conditions: {inCombat.conditions.map((c) => c.name).join(", ")}</p>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}
