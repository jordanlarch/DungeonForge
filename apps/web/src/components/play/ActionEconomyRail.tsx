import { CORE_ACTIONS, currentParticipant, type CombatState, type SrdAction } from "@dungeonforge/rules-engine";

interface ActionEconomyRailProps {
  combat: CombatState | null;
  phase: "exploration" | "combat";
  onAction: (action: SrdAction) => void;
  onAttack: () => void;
  onStartCombat: () => void;
  onEndTurn: () => void;
}

export default function ActionEconomyRail({
  combat,
  phase,
  onAction,
  onAttack,
  onStartCombat,
  onEndTurn,
}: ActionEconomyRailProps) {
  const current = combat ? currentParticipant(combat) : null;
  const isPlayerTurn = current?.kind === "pc";
  const economy = current ? combat?.economy[current.id] : null;

  return (
    <div className="action-rail panel">
      <h3>Actions</h3>
      {phase === "exploration" && (
        <button type="button" className="primary" onClick={onStartCombat}>Start Combat</button>
      )}
      {phase === "combat" && combat && (
        <>
          <p className="turn-indicator">
            {isPlayerTurn ? "Your turn" : `${current?.name ?? "Enemy"}'s turn`}
            {combat.round > 0 && ` · Round ${combat.round}`}
          </p>
          <div className="economy-chips">
            <span className={economy?.action ? "available" : "spent"}>Action</span>
            <span className={economy?.bonusAction ? "available" : "spent"}>Bonus</span>
            <span className={economy?.reaction ? "available" : "spent"}>Reaction</span>
            <span className="movement">Move {economy?.movementRemaining ?? 0} ft</span>
          </div>
          <div className="action-grid">
            {CORE_ACTIONS.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={!isPlayerTurn || !economy?.action}
                className={!economy?.action ? "spent-btn" : ""}
                title={a.description}
                onClick={() => (a.id === "attack" ? onAttack() : onAction(a.id))}
              >
                {a.label}
              </button>
            ))}
          </div>
          <button type="button" disabled={!isPlayerTurn} onClick={onEndTurn}>End Turn</button>
        </>
      )}
    </div>
  );
}
