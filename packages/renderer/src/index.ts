import type { DungeonDocument, MapTheme, RoomNode } from "@dungeonforge/engine";

export interface RenderTheme {
  background: string;
  roomFill: string;
  roomStroke: string;
  corridor: string;
  grid: string;
  label: string;
  doorOpen: string;
  doorClosed: string;
  doorSecret: string;
  selected: string;
}

export const THEMES: Record<MapTheme, RenderTheme> = {
  parchment: {
    background: "#d4c4a8",
    roomFill: "#e8dcc4",
    roomStroke: "#5c4a32",
    corridor: "#8b7355",
    grid: "rgba(92,74,50,0.15)",
    label: "#3d2f1f",
    doorOpen: "#5c4a32",
    doorClosed: "#2a1f14",
    doorSecret: "#8b4513",
    selected: "#c9a227",
  },
  darkStone: {
    background: "#1e1e24",
    roomFill: "#2a2a32",
    roomStroke: "#6a6a78",
    corridor: "#4a4a58",
    grid: "rgba(255,255,255,0.06)",
    label: "#d0d0dc",
    doorOpen: "#8a8a9a",
    doorClosed: "#3a3a48",
    doorSecret: "#7a5c9a",
    selected: "#7eb8ff",
  },
};

export interface RenderOptions {
  pixelsPerFoot?: number;
  theme?: MapTheme;
  activeFloor?: number;
  selectedRoomId?: string | null;
}

const DEFAULT_PPF = 10;

export function renderDungeonSvg(
  dungeon: DungeonDocument,
  opts: RenderOptions = {}
): string {
  const ppf = opts.pixelsPerFoot ?? DEFAULT_PPF;
  const cell = ppf * dungeon.grid.cellSizeFeet;
  const theme = THEMES[opts.theme ?? dungeon.metadata.mapTheme];
  const floor = opts.activeFloor ?? 1;
  const w = dungeon.grid.width * cell;
  const h = dungeon.grid.height * cell;

  const rooms = dungeon.rooms.filter((r) => r.floor === floor);
  const corridors = dungeon.corridors.filter((c) => c.floor === floor);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`;
  svg += `<rect width="100%" height="100%" fill="${theme.background}"/>`;

  for (let x = 0; x <= dungeon.grid.width; x++) {
    const px = x * cell;
    svg += `<line x1="${px}" y1="0" x2="${px}" y2="${h}" stroke="${theme.grid}" stroke-width="1"/>`;
  }
  for (let y = 0; y <= dungeon.grid.height; y++) {
    const py = y * cell;
    svg += `<line x1="0" y1="${py}" x2="${w}" y2="${py}" stroke="${theme.grid}" stroke-width="1"/>`;
  }

  for (const corridor of corridors) {
    for (const p of corridor.points) {
      svg += `<rect x="${p.x * cell}" y="${p.y * cell}" width="${cell}" height="${cell}" fill="${theme.corridor}"/>`;
    }
    const mid = corridor.points[Math.floor(corridor.points.length / 2)];
    if (mid) {
      const doorColor =
        corridor.door === "secret"
          ? theme.doorSecret
          : corridor.door === "closed"
            ? theme.doorClosed
            : theme.doorOpen;
      svg += `<rect x="${mid.x * cell + cell * 0.35}" y="${mid.y * cell + cell * 0.35}" width="${cell * 0.3}" height="${cell * 0.3}" fill="${doorColor}"/>`;
    }
  }

  for (const room of rooms) {
    const selected = opts.selectedRoomId === room.id;
    const stroke = selected ? theme.selected : theme.roomStroke;
    const sw = selected ? 3 : 1.5;
    svg += `<rect x="${room.bounds.x * cell}" y="${room.bounds.y * cell}" width="${room.bounds.width * cell}" height="${room.bounds.height * cell}" fill="${theme.roomFill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    const cx = (room.bounds.x + room.bounds.width / 2) * cell;
    const cy = (room.bounds.y + room.bounds.height / 2) * cell;
    svg += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" fill="${theme.label}" font-size="${cell * 0.9}" font-family="serif">${room.number}</text>`;
  }

  svg += `</svg>`;
  return svg;
}

export function roleColor(role: RoomNode["content"]["role"]): string {
  const map: Record<string, string> = {
    encounter: "#c45c5c",
    trap: "#c9a227",
    treasure: "#6aab6a",
    npc: "#7eb8ff",
    entrance: "#9a9aaa",
    stairs: "#a080c0",
    empty: "#888",
  };
  return map[role] ?? "#888";
}

export async function svgToPngBlob(svg: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => {
        URL.revokeObjectURL(url);
        if (b) resolve(b);
        else reject(new Error("PNG export failed"));
      }, "image/png");
    };
    img.onerror = () => reject(new Error("SVG load failed"));
    img.src = url;
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
