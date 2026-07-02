import type { CharacterDocument } from "@dungeonforge/character-engine";
import { CLASSES, SPECIES, abilityModifier } from "@dungeonforge/character-engine";

interface CharacterRailProps {
  character: CharacterDocument | null;
  expanded: boolean;
  onToggle: () => void;
}

export default function CharacterRail({ character, expanded, onToggle }: CharacterRailProps) {
  if (!character) {
    return (
      <aside className="character-rail panel">
        <p className="muted">Create a character on the Characters page first.</p>
      </aside>
    );
  }

  return (
    <aside className="character-rail panel">
      <button type="button" className="character-portrait" onClick={onToggle}>
        <span className="portrait-circle">{character.name.slice(0, 1)}</span>
        <div>
          <strong>{character.name}</strong>
          <span>HP {character.hp.current}/{character.hp.max}</span>
        </div>
      </button>
      {expanded && (
        <div className="character-sheet">
          <p>{SPECIES.find((s) => s.id === character.speciesId)?.name} {CLASSES.find((c) => c.id === character.classId)?.name} {character.level}</p>
          <p>AC {character.armorClass} · Init +{character.initiativeBonus}</p>
          <ul>
            {(["str", "dex", "con", "int", "wis", "cha"] as const).map((k) => (
              <li key={k}>{k.toUpperCase()} {character.abilities[k]} ({abilityModifier(character.abilities[k]) >= 0 ? "+" : ""}{abilityModifier(character.abilities[k])})</li>
            ))}
          </ul>
          {character.weapons.map((w) => (
            <p key={w.name}>{w.name}: +{w.attackBonus}, {w.damage}</p>
          ))}
        </div>
      )}
    </aside>
  );
}
