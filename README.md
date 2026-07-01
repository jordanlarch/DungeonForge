# DungeonForge

SRD 5.2.1-grounded procedural dungeon generator with an in-browser map editor, configurable stocking, and optional Anthropic AI narrative enhancement.

## Features

- **Donjon-style 5ft grid** — rooms, corridors, secret doors, multi-floor stairs
- **Configurable stocking** — encounter / trap / treasure / NPC density sliders
- **SRD 5.2.1 content** — XP-budget encounters, scaled traps, magic items, hazards
- **In-browser editor** — click rooms, reroll contents, pan/zoom map
- **Themes** — parchment or dark stone
- **Export** — PNG, SVG, JSON, Markdown
- **AI narrative** — Anthropic Claude via Settings (key in localStorage only)

## Quick Start

```bash
npm install
npm run build:srd
npm run build
npm run dev    # http://localhost:5173
```

Copy `.env.example` to `.env.local` for optional dev API key (Settings UI preferred).

## SRD PDF

Official CC-licensed PDF: [`docs/srd/SRD_CC_v5.2.1.pdf`](docs/srd/SRD_CC_v5.2.1.pdf)

## Project Structure

```
docs/srd/           SRD PDF + attribution
packages/
  srd-data/         JSON (monsters, traps, hazards, NPC templates)
  engine/           Generator + stocking (schema v2)
  renderer/         SVG/PNG map rendering
  narrative/        Template + Anthropic AI provider
  cli/              Command-line generator
apps/web/           Generator + editor UI
```

## Security

Never commit API keys. If a key was exposed, rotate it at [console.anthropic.com](https://console.anthropic.com).

## License

- Code: MIT
- SRD content: CC-BY 4.0 © Wizards of the Coast LLC
