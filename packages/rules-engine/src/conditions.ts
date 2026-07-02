export type ConditionId = "prone" | "poisoned" | "frightened" | "restrained";

export interface ActiveCondition {
  id: ConditionId;
  name: string;
  roundsRemaining?: number;
}

export interface ConcentrationState {
  spellName: string;
  spellId: string;
}
