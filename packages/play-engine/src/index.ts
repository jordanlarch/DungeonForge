export type {
  FogVisibility,
  TokenKind,
  GridToken,
  PlaySession,
  PlaySessionInput,
  PlayCharacterInput,
  PlayAction,
  PlayActionResult,
} from "./types.js";
export { PC_COLORS } from "./types.js";
export { cellKey, buildPassableSet, isPassable, isAdjacent, roomAtPoint, entrancePosition } from "./passability.js";
export { createInitialFog, revealAroundPoint, applyFogForTokens } from "./fog.js";
export { detectTrap, disarmTrap, searchRoomForTrap, type TrapInteractionResult } from "./traps.js";
export {
  createPlaySession,
  dispatchPlayAction,
  startCombatInSession,
  attackInSession,
  useCombatAction,
  endCombatTurn,
  moveTokenInCombat,
  castSpellInSession,
  searchTrapInSession,
  detectTrapInSession,
  disarmTrapInSession,
} from "./game-loop.js";
