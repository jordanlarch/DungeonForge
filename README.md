# DungeonForge

SRD 5.2.1-grounded procedural dungeon generator. Creates grid-based dungeon maps stocked with combat encounters (SRD XP budget rules), traps, and treasure.

## Features

- **Grid topology** — rooms, corridors, doors (open/closed/secret)
- **SRD 5.2.1 stocking** — monsters, traps, magic items, encounter XP tables
- **Motifs** — filter monster/trap pools (undead, arcane, underdark, etc.)
- **Exports** — JSON dungeon document + Markdown one-page key
- **Web UI** — live generation with seed control
- **CLI** — `dungeonforge generate`

## Quick Start

```bash
npm install
npm run build:srd    # rebuild monsters.json from raw Open5e data
npm run build
npm run dev          # web UI at http://localhost:5173
npm run generate     # CLI sample output to ./
```

## Project Structure

```
packages/
  srd-data/     CC-BY SRD JSON (monsters, traps, items, XP tables)
  engine/       Core generator, stocking, export
  cli/          Command-line interface
apps/
  web/          Vite + React UI
```

## SRD Compliance

Monster data sourced from [cocoajamworld/srd-5.2.1](https://github.com/cocoajamworld/srd-5.2.1) (Open5e / CC-BY 4.0). Traps, encounter XP budgets, and magic items follow SRD 5.2.1. Treasure hoard ranges are original DungeonForge tables (CC-BY 4.0), not DMG copies.

## License

- Code: MIT (see repository)
- SRD content: CC-BY 4.0 — © Wizards of the Coast LLC
