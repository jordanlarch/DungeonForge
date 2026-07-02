import { useCallback, useMemo, useState } from "react";
import type { CharacterDocument } from "@dungeonforge/character-engine";
import { getActiveCharacter } from "@dungeonforge/character-engine";
import type { SrdAction } from "@dungeonforge/rules-engine";
import { currentParticipant } from "@dungeonforge/rules-engine";
import {
  createPlaySession,
  moveTokenInCombat,
  dispatchPlayAction,
  startCombatInSession,
  attackInSession,
  useCombatAction,
  endCombatTurn,
} from "@dungeonforge/play-engine";
import { parseGameIntent, directionToDelta, intentSupported, DEFAULT_CAPABILITIES } from "@dungeonforge/narrative";
import { loadDungeon, loadPlaySession, savePlaySession } from "../lib/storage";
import MapViewport from "../components/play/MapViewport";
import ActionEconomyRail from "../components/play/ActionEconomyRail";
import CharacterRail from "../components/play/CharacterRail";
import DmChat, { buildDmReply, type ChatMessage } from "../components/play/DmChat";

function characterToPlayInput(c: CharacterDocument) {
  const weapon = c.weapons[0]!;
  return {
    id: c.id,
    name: c.name,
    hp: c.hp,
    armorClass: c.armorClass,
    attackBonus: weapon.attackBonus,
    damage: weapon.damage,
    damageType: weapon.damageType,
    initiativeBonus: c.initiativeBonus,
    speed: c.speed,
  };
}

export default function PlayPage() {
  const dungeon = useMemo(() => loadDungeon(), []);
  const character = useMemo(() => getActiveCharacter(), []);
  const [session, setSession] = useState(() => {
    const saved = loadPlaySession();
    if (saved && dungeon) return saved;
    if (dungeon && character) {
      return createPlaySession({ dungeon, character: characterToPlayInput(character) });
    }
    return null;
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [attackMode, setAttackMode] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([
    { role: "system", text: "Welcome to Play mode. Move with arrow keys; enter encounter rooms to fight." },
  ]);

  const persist = useCallback((next: typeof session) => {
    setSession(next);
    if (next) savePlaySession(next);
  }, []);

  const handleMove = useCallback(
    (dx: number, dy: number) => {
      if (!session || !dungeon) return;
      const token = session.tokens.find((t) => t.id === session.activeTokenId && t.kind === "pc");
      if (!token) return;
      const to = { x: token.position.x + dx, y: token.position.y + dy };

      const result =
        session.phase === "combat"
          ? moveTokenInCombat(session, dungeon, token.id, to)
          : dispatchPlayAction(session, dungeon, { type: "move", tokenId: token.id, to });

      persist(result.session);
      if (result.messages.length) {
        setChat((c) => [...c, ...result.messages.map((text) => ({ role: "system" as const, text }))]);
      }
    },
    [session, dungeon, character, persist]
  );

  const handleStartCombat = () => {
    if (!session || !dungeon || !character) return;
    const result = startCombatInSession(session, dungeon, characterToPlayInput(character));
    persist(result.session);
    setChat((c) => [...c, ...result.messages.map((text) => ({ role: "system" as const, text }))]);
  };

  const handleAttackTarget = (targetTokenId: string) => {
    if (!session) return;
    const result = attackInSession(session, targetTokenId, character?.speed ?? 30);
    persist(result.session);
    setAttackMode(false);
    setChat((c) => [...c, ...result.messages.map((text) => ({ role: "system" as const, text }))]);
  };

  const handleAction = (action: SrdAction) => {
    if (!session) return;
    if (action === "attack") {
      setAttackMode(true);
      setChat((c) => [...c, { role: "system", text: "Select an enemy token to attack." }]);
      return;
    }
    const result = useCombatAction(session, action, character?.speed ?? 30);
    persist(result.session);
    setChat((c) => [...c, ...result.messages.map((text) => ({ role: "system" as const, text }))]);
  };

  const handleEndTurn = () => {
    if (!session) return;
    const result = endCombatTurn(session, character?.speed ?? 30);
    persist(result.session);
    setChat((c) => [...c, ...result.messages.map((text) => ({ role: "system" as const, text }))]);
  };

  const handleChat = (text: string) => {
    setChat((c) => [...c, { role: "user", text }]);
    const intent = parseGameIntent(text);

    if (intent.type === "move" && intent.direction && session && dungeon) {
      const delta = directionToDelta(intent.direction);
      handleMove(delta.x, delta.y);
      setChat((c) => [...c, { role: "dm", text: `You move ${intent.direction}.` }]);
      return;
    }

    if (intent.type === "attack" && intentSupported(intent, DEFAULT_CAPABILITIES)) {
      setAttackMode(true);
      setChat((c) => [...c, { role: "dm", text: "Choose a target on the map." }]);
      return;
    }

    const { reply } = buildDmReply(text);
    setChat((c) => [...c, { role: "dm", text: reply }]);
  };

  const handleSelectToken = (tokenId: string) => {
    if (attackMode && session) {
      const target = session.tokens.find((t) => t.id === tokenId && t.kind === "monster");
      if (target) {
        handleAttackTarget(tokenId);
        return;
      }
    }
    if (!session) return;
    persist({ ...session, activeTokenId: tokenId });
  };

  const handleNewSession = () => {
    if (!dungeon || !character) return;
    const next = createPlaySession({ dungeon, character: characterToPlayInput(character) });
    persist(next);
    setChat([{ role: "system", text: "New session started at the dungeon entrance." }]);
  };

  if (!dungeon) {
    return (
      <div className="empty-state panel">
        <p>No dungeon loaded. Generate one on the <strong>Forge</strong> page first.</p>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="empty-state panel">
        <p>No active character. Create one on the <strong>Characters</strong> page.</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="empty-state panel">
        <button type="button" className="primary" onClick={handleNewSession}>Begin Play Session</button>
      </div>
    );
  }

  const combatCurrent = session.combat ? currentParticipant(session.combat) : null;

  return (
    <div className="play-page">
      <div className="play-toolbar">
        <h2>{dungeon.metadata.name}</h2>
        <span className="phase-badge">{session.phase}</span>
        {combatCurrent && <span className="turn-badge">{combatCurrent.name}'s turn</span>}
        <button type="button" onClick={handleNewSession}>Restart</button>
      </div>

      <div className="play-layout">
        <CharacterRail character={character} expanded={sheetOpen} onToggle={() => setSheetOpen((o) => !o)} />

        <div className="play-center">
          <MapViewport
            dungeon={dungeon}
            session={session}
            onMove={handleMove}
            onSelectToken={handleSelectToken}
          />
          <div className="combat-log panel">
            <h4>Session Log</h4>
            <ul>{session.log.slice(-8).map((line, i) => <li key={i}>{line}</li>)}</ul>
          </div>
        </div>

        <div className="play-right">
          <ActionEconomyRail
            combat={session.combat}
            phase={session.phase}
            onAction={handleAction}
            onAttack={() => handleAction("attack")}
            onStartCombat={handleStartCombat}
            onEndTurn={handleEndTurn}
          />
          <DmChat messages={chat} onSend={handleChat} />
        </div>
      </div>
    </div>
  );
}
