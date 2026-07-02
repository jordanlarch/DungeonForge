import { resolveAttack, startCombat } from "./combat.js";

describe("startCombat", () => {
  it("orders participants by initiative", () => {
    const state = startCombat({
      pc: {
        tokenId: "pc1",
        name: "Hero",
        hp: { max: 20, current: 20 },
        armorClass: 16,
        attackBonus: 5,
        damage: "1d8+3",
        damageType: "slashing",
        initiativeBonus: 2,
        speed: 30,
      },
      monsters: [
        { tokenId: "m1", name: "Goblin", hpMax: 7, armorClass: 15, crNumeric: 0.25 },
      ],
    });
    expect(state.active).toBe(true);
    expect(state.order).toHaveLength(2);
    expect(state.order[0]!.initiative).toBeGreaterThanOrEqual(state.order[1]!.initiative);
  });
});

describe("resolveAttack", () => {
  it("applies damage on hit", () => {
    const base = startCombat({
      pc: {
        tokenId: "pc1",
        name: "Hero",
        hp: { max: 20, current: 20 },
        armorClass: 16,
        attackBonus: 99,
        damage: "1d8+3",
        damageType: "slashing",
        initiativeBonus: 2,
        speed: 30,
      },
      monsters: [
        { tokenId: "m1", name: "Goblin", hpMax: 7, armorClass: 10, crNumeric: 0.25 },
      ],
    });
    const attacker = base.order.find((p) => p.kind === "pc")!;
    const target = base.order.find((p) => p.kind === "monster")!;
    const { state, result } = resolveAttack(base, attacker.id, target.id);
    expect(result.hit).toBe(true);
    expect(state.order.find((p) => p.id === target.id)!.hp.current).toBeLessThan(7);
  });
});
