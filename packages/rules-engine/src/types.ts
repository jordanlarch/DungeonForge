export type CombatPhase = "exploration" | "combat";

export type ParticipantKind = "pc" | "monster";

export interface CombatParticipant {
  id: string;
  tokenId: string;
  name: string;
  kind: ParticipantKind;
  initiative: number;
  hp: { max: number; current: number };
  armorClass: number;
  attackBonus: number;
  damage: string;
  damageType: string;
}

export interface ActionEconomy {
  action: boolean;
  bonusAction: boolean;
  reaction: boolean;
  movementRemaining: number;
}

export interface AttackResult {
  hit: boolean;
  critical: boolean;
  roll: number;
  total: number;
  damage: number;
  damageRoll: string;
  targetId: string;
  targetName: string;
  attackerName: string;
  message: string;
}

export interface CombatState {
  active: boolean;
  round: number;
  turnIndex: number;
  order: CombatParticipant[];
  economy: Record<string, ActionEconomy>;
  log: string[];
}

export type SrdAction =
  | "attack"
  | "dash"
  | "dodge"
  | "disengage"
  | "hide"
  | "help"
  | "ready"
  | "search"
  | "study"
  | "utilize";

export const CORE_ACTIONS: { id: SrdAction; label: string; description: string }[] = [
  { id: "attack", label: "Attack", description: "Make one weapon attack" },
  { id: "dash", label: "Dash", description: "Gain extra movement equal to your speed" },
  { id: "dodge", label: "Dodge", description: "Attackers have disadvantage until your next turn" },
  { id: "disengage", label: "Disengage", description: "Your movement doesn't provoke opportunity attacks" },
  { id: "hide", label: "Hide", description: "Make a Dexterity (Stealth) check" },
  { id: "help", label: "Help", description: "Aid an ally's next ability check or attack" },
  { id: "ready", label: "Ready", description: "Prepare an action to trigger on a condition" },
  { id: "search", label: "Search", description: "Search for hidden creatures or objects" },
  { id: "study", label: "Study", description: "Recall lore about a creature or object" },
  { id: "utilize", label: "Utilize", description: "Use an object or environmental feature" },
];
