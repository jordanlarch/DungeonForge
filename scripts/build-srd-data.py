#!/usr/bin/env python3
"""Transform raw SRD monster data and emit engine-ready JSON bundles."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "packages" / "srd-data" / "data"

CR_TO_XP = {
    "0": 10,
    "1/8": 25,
    "1/4": 50,
    "1/2": 100,
    "1": 200,
    "2": 450,
    "3": 700,
    "4": 1100,
    "5": 1800,
    "6": 2300,
    "7": 2900,
    "8": 3900,
    "9": 5000,
    "10": 5900,
    "11": 7200,
    "12": 8400,
    "13": 10000,
    "14": 11500,
    "15": 13000,
    "16": 15000,
    "17": 18000,
    "18": 20000,
    "19": 22000,
    "20": 25000,
    "21": 33000,
    "22": 41000,
    "23": 50000,
    "24": 62000,
    "25": 75000,
    "26": 90000,
    "27": 105000,
    "28": 120000,
    "29": 135000,
    "30": 155000,
}

LICENSE = (
    "Source: D&D System Reference Document v5.2.1, "
    "© Wizards of the Coast LLC, licensed under CC-BY 4.0."
)


def build_monsters() -> None:
    raw = json.loads((DATA / "monsters.raw.json").read_text())
    monsters = []
    for m in raw["monsters"]:
        cr = m["cr"]
        xp = CR_TO_XP.get(cr, 0)
        monsters.append(
            {
                "id": m["id"],
                "name": m["name"],
                "cr": cr,
                "crNumeric": m["cr_numeric"],
                "xp": xp,
                "type": m["type"],
                "size": m["size"],
                "armorClass": m["armor_class"],
                "hpMax": m["hp_max"],
            }
        )
    (DATA / "monsters.json").write_text(
        json.dumps({"_license": LICENSE, "monsters": monsters}, indent=2)
    )


def main() -> None:
    build_monsters()
    print(f"Wrote {DATA / 'monsters.json'}")


if __name__ == "__main__":
    main()
