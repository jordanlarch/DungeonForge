import type { HazardContent, Motif, NpcContent } from "./types.js";
import type { SrdDatabase } from "./srd-database.js";
import { SeededRandom } from "./utils.js";

export interface NpcTemplate {
  id: string;
  name: string;
  personality: string;
  dialogue: string[];
  secret: string;
  motifs: string[];
}

export interface HazardDef {
  id: string;
  name: string;
  summary: string;
  motifs: string[];
}

export function buildNpc(
  rng: SeededRandom,
  db: SrdDatabase,
  motif: Motif
): NpcContent | undefined {
  const templates = (db.npcTemplates as NpcTemplate[]).filter(
    (t) => t.motifs.length === 0 || t.motifs.includes(motif.id)
  );
  if (templates.length === 0) return undefined;
  const t = rng.pick(templates);
  return {
    templateId: t.id,
    name: t.name,
    personality: t.personality,
    dialogue: t.dialogue,
    secret: t.secret,
  };
}

export function buildHazard(
  rng: SeededRandom,
  db: SrdDatabase,
  motif: Motif
): HazardContent | undefined {
  const pool = (db.hazards as HazardDef[]).filter(
    (h) => h.motifs.length === 0 || h.motifs.includes(motif.id)
  );
  if (pool.length === 0) return undefined;
  const h = rng.pick(pool);
  return { hazardId: h.id, name: h.name, summary: h.summary };
}
