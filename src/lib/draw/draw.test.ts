import { describe, expect, it } from "vitest";
import {
  draw,
  isSingleCycle,
  nextGiver,
  shuffle,
  stitch,
  type Pair,
} from "./index";

/** RNG determinístico (mulberry32) para os testes serem reproduzíveis. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const people = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

function expectValid(ids: string[], pairs: Record<string, string>, forbidden: Pair[] = []) {
  expect(Object.keys(pairs).sort()).toEqual([...ids].sort());
  expect(Object.values(pairs).sort()).toEqual([...ids].sort());
  for (const [giver, receiver] of Object.entries(pairs)) {
    expect(receiver).not.toBe(giver);
  }
  for (const [giver, receiver] of forbidden) {
    expect(pairs[giver]).not.toBe(receiver);
  }
}

describe("draw", () => {
  it("recusa grupos com menos de 3 pessoas", () => {
    expect(draw(["a", "b"])).toEqual({ ok: false, reason: "poucos", stuck: [] });
  });

  it("gera uma permutação válida em ciclo único, para vários tamanhos e sementes", () => {
    for (const n of [3, 4, 5, 8, 13, 40]) {
      for (let seed = 1; seed <= 25; seed++) {
        const ids = people(n);
        const result = draw(ids, { rng: seeded(seed * 97 + n) });
        expect(result.ok).toBe(true);
        if (!result.ok) continue;
        expectValid(ids, result.pairs);
        expect(result.singleCycle).toBe(true);
        expect(isSingleCycle(result.pairs)).toBe(true);
      }
    }
  });

  it("respeita restrições (casais não se tiram)", () => {
    const ids = people(8);
    const forbidden: Pair[] = [
      ["p0", "p1"], ["p1", "p0"],
      ["p2", "p3"], ["p3", "p2"],
      ["p4", "p5"], ["p5", "p4"],
    ];
    for (let seed = 1; seed <= 50; seed++) {
      const result = draw(ids, { forbidden, rng: seeded(seed) });
      expect(result.ok).toBe(true);
      if (result.ok) expectValid(ids, result.pairs, forbidden);
    }
  });

  it("cai para emparelhamento sem ciclo único quando só isso é possível", () => {
    // Dois trios isolados: cada pessoa só pode tirar alguém do próprio trio.
    const ids = people(6);
    const forbidden: Pair[] = [];
    for (const a of ["p0", "p1", "p2"]) {
      for (const b of ["p3", "p4", "p5"]) forbidden.push([a, b], [b, a]);
    }
    const result = draw(ids, { forbidden, rng: seeded(7) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expectValid(ids, result.pairs, forbidden);
    expect(result.singleCycle).toBe(false);
  });

  it("explica quem trava um sorteio impossível", () => {
    const ids = people(4);
    // p0 não pode tirar ninguém.
    const forbidden: Pair[] = [["p0", "p1"], ["p0", "p2"], ["p0", "p3"]];
    const result = draw(ids, { forbidden, rng: seeded(3) });
    expect(result).toEqual({ ok: false, reason: "impossivel", stuck: ["p0"] });
  });

  it("detecta impossibilidade sem culpado óbvio", () => {
    // p0 e p1 só podem tirar p2: não há como os dois serem atendidos.
    const ids = people(4);
    const forbidden: Pair[] = [["p0", "p1"], ["p0", "p3"], ["p1", "p0"], ["p1", "p3"]];
    const result = draw(ids, { forbidden, rng: seeded(11) });
    expect(result.ok).toBe(false);
  });

  it("evita repetir pares do ano anterior quando dá", () => {
    const ids = people(6);
    const soft: Pair[] = ids.map((id, i) => [id, ids[(i + 1) % ids.length]]);
    for (let seed = 1; seed <= 30; seed++) {
      const result = draw(ids, { soft, rng: seeded(seed) });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.softDropped).toBe(false);
      expectValid(ids, result.pairs, soft);
    }
  });

  it("abre mão dos pares do ano anterior se eles travarem o sorteio", () => {
    const ids = people(3);
    // Com 3 pessoas só existem dois sorteios possíveis; proibimos os dois.
    const soft: Pair[] = [
      ["p0", "p1"], ["p1", "p2"], ["p2", "p0"],
      ["p0", "p2"], ["p2", "p1"], ["p1", "p0"],
    ];
    const result = draw(ids, { soft, rng: seeded(5) });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.softDropped).toBe(true);
      expectValid(ids, result.pairs);
    }
  });

  it("distribui os resultados de forma razoavelmente uniforme", () => {
    const ids = people(4);
    const rng = seeded(2026);
    const counts: Record<string, number> = {};
    const rounds = 3000;
    for (let i = 0; i < rounds; i++) {
      const result = draw(ids, { rng });
      if (!result.ok) throw new Error("sorteio falhou");
      counts[result.pairs.p0] = (counts[result.pairs.p0] ?? 0) + 1;
    }
    for (const id of ["p1", "p2", "p3"]) {
      expect(counts[id] / rounds).toBeGreaterThan(0.27);
      expect(counts[id] / rounds).toBeLessThan(0.4);
    }
  });
});

describe("stitch", () => {
  const pairs = { a: "b", b: "c", c: "d", d: "a" };

  it("quem tirou a pessoa que saiu herda o amigo dela", () => {
    const result = stitch(pairs, "b");
    expect(result).toEqual({
      ok: true,
      pairs: { a: "c", c: "d", d: "a" },
      giver: "a",
      receiver: "c",
    });
  });

  it("recusa quando sobrariam menos de 3 pessoas", () => {
    expect(stitch({ a: "b", b: "c", c: "a" }, "a")).toEqual({ ok: false, reason: "poucos" });
  });

  it("recusa quando a herança cairia em um par proibido", () => {
    expect(stitch(pairs, "b", [["a", "c"]])).toEqual({ ok: false, reason: "restricao" });
  });

  it("recusa quando a pessoa herdaria a si mesma", () => {
    const twoCycles = { a: "b", b: "a", c: "d", d: "e", e: "c" };
    expect(stitch(twoCycles, "a")).toEqual({ ok: false, reason: "sozinho" });
  });
});

describe("nextGiver", () => {
  const pairs = { a: "b", b: "a", c: "d", d: "c" };

  it("segue a cadeia: quem recebeu entrega em seguida", () => {
    expect(nextGiver(pairs, new Set(["a"]), "b", seeded(1))).toBe("b");
  });

  it("quando o ciclo fecha, chama alguém que ainda não entregou", () => {
    const next = nextGiver(pairs, new Set(["a", "b"]), "a", seeded(1));
    expect(["c", "d"]).toContain(next);
  });

  it("termina quando todos já entregaram", () => {
    expect(nextGiver(pairs, new Set(["a", "b", "c", "d"]), "c", seeded(1))).toBeNull();
  });
});

describe("shuffle", () => {
  it("mantém os mesmos elementos", () => {
    const ids = people(20);
    expect(shuffle(ids, seeded(9)).sort()).toEqual([...ids].sort());
  });
});
