import { useCallback, useMemo, useState } from "react";
import type { CharacterDocument } from "@dungeonforge/character-engine";
import { getPartyMembers, abilityModifier } from "@dungeonforge/character-engine";
import type { SrdAction } from "@dungeonforge/rules-engine";
import { currentParticipant } from "@dungeonforge/rules-engine";
import type { PlayCharacterInput } from "@dungeonforge/play-engine";
import {
  createPlaySession,
  moveTokenInCombat,
  dispatchPlayAction,
  startCombatInSession,
  attackInSession,
  useCombatAction,
  endCombatTurn,
  castSpellInSession,
  searchTrapInSession,
  detectTrapInSession,
  disarmTrapInSession,
  roomAtPoint,
} from "@dungeonforge/play-engine";
import { parseGameIntent, directionToDelta, intentSupported, DEFAULT_CAPABILITIES } from "@dungeonforge/narrative";
import { loadDungeon, loadPlaySession, savePlaySession } from "../lib/storage";
import MapViewport from "../components/play/MapViewport";
import ActionEconomyRail from "../components/play/ActionEconomyRail";
import CharacterRail from "../components/play/CharacterRail";
import SpellRail from "../components/play/SpellRail";
import TrapPanel from "../components/play/TrapPanel";
import DmChat, { buildDmReply, type ChatMessage } from "../components/play/DmChat";

function characterToPlayInput(c: CharacterDocument): PlayCharacterInput {
  const weapon = c.weapons[0]!;
  const spellAbility = c.classId === "wizard" ? c.abilities.int : c.abilities.wis;
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
    abilities: { ...c.abilities },
    spellAttackBonus: c.proficiencyBonus + abilityModifier(spellAbility),
  };
}

export default function PlayPage() {
  const dungeon = useMemo(() => loadDungeon(), []);
  const party = useMemo(() => getPartyMembers(), []);
  const [session, setSession] = useState(() => {
    const saved = loadPlaySession();
    if (saved && dungeon) return saved;
    if (dungeon && party.length) {
      return createPlaySession({ dungeon, party: party.map(characterToPlayInput) });
    }
    return null;
  });
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(party[0]?.id ?? null);
  const [expandedSheetId, setExpandedSheetId] = useState<string | null>(null);
  const [attackMode, setAttackMode] = useState(false);
  const [spellMode, setSpellMode] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([
    { role: "system", text: "Play v2: full party, spells, traps. Arrow keys move active character." },
  ]);

  const activeCharacter = party.find((c) => c.id === activeCharacterId) ?? party[0] ?? null;

  const persist = useCallback((next: typeof session) => {
    setSession(next);
    if (next) savePlaySession(next);
  }, []);

  const handleMove = useCallback(
    (dx: number, dy: number) => {
      if (!session || !dungeon) return;
      const token = session.tokens.find((t) => t.characterId === activeCharacterId && t.kind === "pc")
        ?? session.tokens.find((t) => t.kind === "pc");
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
    [session, dungeon, activeCharacterId, persist]
  );

  const partyInputs = useMemo(() => party.map(characterToPlayInput), [party]);

  const handleStartCombat = () => {
    if (!session || !dungeon || !party.length) return;
    const result = startCombatInSession(session, dungeon, partyInputs);
    persist(result.session);
    setChat((c) => [...c, ...result.messages.map((text) => ({ role: "system" as const, text }))]);
  };

  const handleAttackTarget = (targetTokenId: string) => {
    if (!session || !activeCharacter) return;
    const result = attackInSession(session, targetTokenId, activeCharacter.speed);
    persist(result.session);
    setAttackMode(false);
    setChat((c) => [...c, ...result.messages.map((text) => ({ role: "system" as const, text }))]);
  };

  const handleCastSpell = (targetTokenId: string) => {
    if (!session || !spellMode || !activeCharacter) return;
    const result = castSpellInSession(session, spellMode, targetTokenId, activeCharacter.speed);
    persist(result.session);
    setSpellMode(null);
    setChat((c) => [...c, ...result.messages.map((text) => ({ role: "system" as const, text }))]);
  };

  const handleAction = (action: SrdAction) => {
    if (!session || !activeCharacter) return;
    if (action === "attack") {
      setAttackMode(true);
      setChat((c) => [...c, { role: "system", text: "Select an enemy token to attack." }]);
      return;
    }
    if (action === "search" && dungeon) {
      const result = searchTrapInSession(session, dungeon, abilityModifier(activeCharacter.abilities.wis) + activeCharacter.proficiencyBonus);
      persist(result.session);
      setChat((c) => [...c, ...result.messages.map((text) => ({ role: "system" as const, text }))]);
      return;
    }
    const result = useCombatAction(session, action, activeCharacter.speed);
    persist(result.session);
    setChat((c) => [...c, ...result.messages.map((text) => ({ role: "system" as const, text }))]);
  };

  const handleEndTurn = () => {
    if (!session || !activeCharacter) return;
    const result = endCombatTurn(session, activeCharacter.speed);
    persist(result.session);
    setChat((c) => [...c, ...result.messages.map((text) => ({ role: "system" as const, text }))]);
  };

  const handleChat = (text: string) => {
    setChat((c) => [...c, { role: "user", text }]);
    const intent = parseGameIntent(text);
    if (intent.type === "move" && intent.direction && session && dungeon) {
      handleMove(directionToDelta(intent.direction).x, directionToDelta(intent.direction).y);
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
    if (spellMode && session) {
      handleCastSpell(tokenId);
      return;
    }
    if (attackMode && session) {
      const target = session.tokens.find((t) => t.id === tokenId && t.kind === "monster");
      if (target) {
        handleAttackTarget(tokenId);
        return;
      }
    }
    const token = session?.tokens.find((t) => t.id === tokenId);
    if (token?.characterId) setActiveCharacterId(token.characterId);
    if (!session) return;
    persist({ ...session, activeTokenId: tokenId });
  };

  const handleNewSession = () => {
    if (!dungeon || !party.length) return;
    const next = createPlaySession({ dungeon, party: party.map(characterToPlayInput) });
    persist(next);
    setActiveCharacterId(party[0]?.id ?? null);
    setChat([{ role: "system", text: "New session started with full party at the entrance." }]);
  };

  const currentRoom = session && dungeon && activeCharacter
    ? roomAtPoint(dungeon, session.activeFloor, session.tokens.find((t) => t.characterId === activeCharacterId)?.position ?? session.tokens[0]!.position)
    : null;

  if (!dungeon) {
    return <div className="empty-state panel"><p>Generate a dungeon on <strong>Forge</strong> first.</p></div>;
  }
  if (!party.length) {
    return <div className="empty-state panel"><p>Select party members (★) on <strong>Characters</strong>.</p></div>;
  }
  if (!session) {
    return <div className="empty-state panel"><button type="button" className="primary" onClick={handleNewSession}>Begin Play Session</button></div>;
  }

  const combatCurrent = session.combat ? currentParticipant(session.combat) : null;
  const turnCharacter = party.find((c) => c.id === combatCurrent?.characterId) ?? activeCharacter;

  return (
    <div className="play-page">
      <div className="play-toolbar">
        <h2>{dungeon.metadata.name}</h2>
        <span className="phase-badge">{session.phase}</span>
        {combatCurrent && <span className="turn-badge">{combatCurrent.name}'s turn</span>}
        <button type="button" onClick={handleNewSession}>Restart</button>
      </div>

      <div className="play-layout">
        <CharacterRail
          party={party}
          activeCharacterId={activeCharacterId}
          combat={session.combat}
          expandedId={expandedSheetId}
          onSelect={setActiveCharacterId}
          onToggleSheet={(id) => setExpandedSheetId((e) => (e === id ? null : id))}
        />

        <div className="play-center">
          <MapViewport dungeon={dungeon} session={session} onMove={handleMove} onSelectToken={handleSelectToken} />
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
          <SpellRail
            character={turnCharacter}
            combat={session.combat}
            spellTargetMode={!!spellMode}
            onCast={(id) => { setSpellMode(id); setChat((c) => [...c, { role: "system", text: "Select spell target." }]); }}
          />
          <TrapPanel
            hasTrap={!!currentRoom?.content.trap}
            disarmed={currentRoom ? session.disarmedTrapRoomIds.includes(currentRoom.id) : false}
            onSearch={() => activeCharacter && handleAction("search")}
            onDetect={() => {
              if (!session || !dungeon || !activeCharacter) return;
              const mod = abilityModifier(activeCharacter.abilities.wis) + activeCharacter.proficiencyBonus;
              const result = detectTrapInSession(session, dungeon, mod);
              persist(result.session);
              setChat((c) => [...c, ...result.messages.map((text) => ({ role: "system" as const, text }))]);
            }}
            onDisarm={() => {
              if (!session || !dungeon || !activeCharacter) return;
              const result = disarmTrapInSession(session, dungeon, abilityModifier(activeCharacter.abilities.dex), activeCharacter.proficiencyBonus);
              persist(result.session);
              setChat((c) => [...c, ...result.messages.map((text) => ({ role: "system" as const, text }))]);
            }}
          />
          <DmChat messages={chat} onSend={handleChat} />
        </div>
      </div>
    </div>
  );
}
