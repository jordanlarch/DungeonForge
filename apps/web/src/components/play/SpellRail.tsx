import type { CharacterDocument } from "@dungeonforge/character-engine";
import { getSpell } from "@dungeonforge/character-engine";
import type { CombatState } from "@dungeonforge/rules-engine";
import { currentParticipant } from "@dungeonforge/rules-engine";

interface SpellRailProps {
  character: CharacterDocument | null;
  combat: CombatState | null;
  onCast: (spellId: string) => void;
  spellTargetMode: boolean;
}

export default function SpellRail({ character, combat, onCast, spellTargetMode }: SpellRailProps) {
  const current = combat ? currentParticipant(combat) : null;
  const isMyTurn = current?.kind === "pc" && current.characterId === character?.id;
  const spells = character?.knownSpells ?? [];
  const slots = character?.spellSlots?.level1;

  if (!spells.length) return null;

  return (
    <div className="spell-rail panel">
      <h3>Spells</h3>
      {slots && (
        <p className="muted">Level 1 slots: {slots.current}/{slots.max}</p>
      )}
      {character?.spellSlots && combat && current?.concentration && (
        <p className="concentration">Concentrating: {current.concentration.spellName}</p>
      )}
      <div className="spell-list">
        {spells.map((s) => {
          const def = getSpell(s.spellId);
          return (
            <button
              key={s.spellId}
              type="button"
              disabled={!isMyTurn || !combat?.active || (s.level > 0 && slots && slots.current <= 0)}
              className={spellTargetMode ? "active" : ""}
              title={def?.effect ?? def?.range ?? ""}
              onClick={() => onCast(s.spellId)}
            >
              {s.name}{s.level === 0 ? " ○" : " ●"}
            </button>
          );
        })}
      </div>
      {spellTargetMode && <p className="muted">Click a target on the map.</p>}
    </div>
  );
}
