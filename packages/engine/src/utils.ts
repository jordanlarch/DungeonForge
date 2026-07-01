export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0 || 1;
  }

  next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  chance(probability: number): boolean {
    return this.next() < probability;
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function crToNumeric(cr: string): number {
  if (cr.includes("/")) {
    const [num, den] = cr.split("/").map(Number);
    return num / den;
  }
  return Number(cr);
}

export function levelBandForPartyLevel(level: number): { min: number; max: number } {
  if (level <= 4) return { min: 1, max: 4 };
  if (level <= 10) return { min: 5, max: 10 };
  if (level <= 16) return { min: 11, max: 16 };
  return { min: 17, max: 20 };
}

const NAME_PREFIXES = [
  "Forgotten",
  "Sunken",
  "Cursed",
  "Hidden",
  "Shattered",
  "Whispering",
  "Burning",
  "Frozen",
  "Haunted",
  "Crumbled",
];

const NAME_NOUNS = [
  "Vault",
  "Sanctum",
  "Warren",
  "Crypt",
  "Halls",
  "Depths",
  "Labyrinth",
  "Redoubt",
  "Catacombs",
  "Grotto",
];

export function generateDungeonName(rng: SeededRandom, motifName: string): string {
  if (rng.chance(0.35)) {
    return `${rng.pick(NAME_PREFIXES)} ${motifName} ${rng.pick(NAME_NOUNS)}`;
  }
  return `${rng.pick(NAME_PREFIXES)} ${rng.pick(NAME_NOUNS)}`;
}

const ROOM_FLAVOR = [
  "Cracked flagstones and damp air.",
  "Faded murals peel from the walls.",
  "A cold draft whistles through cracks.",
  "Old torch sconces line the walls.",
  "Rubble is piled in the corners.",
  "Strange symbols are scratched into the stone.",
  "The ceiling is low and oppressive.",
  "Water drips steadily from above.",
];

export function roomFlavor(rng: SeededRandom): string {
  return rng.pick(ROOM_FLAVOR);
}
