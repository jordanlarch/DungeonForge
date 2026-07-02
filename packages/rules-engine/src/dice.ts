export function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

export function rollD20(): number {
  return rollDie(20);
}

export function parseDamage(dice: string): { count: number; sides: number; mod: number } {
  const match = dice.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) return { count: 1, sides: 4, mod: 0 };
  return {
    count: parseInt(match[1]!, 10),
    sides: parseInt(match[2]!, 10),
    mod: match[3] ? parseInt(match[3], 10) : 0,
  };
}

export function rollDamage(dice: string): { total: number; detail: string } {
  const { count, sides, mod } = parseDamage(dice);
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(rollDie(sides));
  const sum = rolls.reduce((a, b) => a + b, 0) + mod;
  const modStr = mod !== 0 ? (mod > 0 ? `+${mod}` : `${mod}`) : "";
  return {
    total: Math.max(0, sum),
    detail: `${count}d${sides}${modStr} [${rolls.join(",")}${modStr}]`,
  };
}

export function rollInitiative(modifier: number): number {
  return rollD20() + modifier;
}
