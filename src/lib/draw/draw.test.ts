import { describe, expect, it } from "vitest";
import {
  completeDraw,
  draw,
  drawOne,
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

describe("sorteio individual", () => {
  /** Simula todo mundo sorteando, um por vez, na ordem dada. */
  function everyoneDraws(
    ids: string[],
    order: string[],
    options: { forbidden?: Pair[]; soft?: Pair[]; rng: () => number },
  ) {
    const taken: Record<string, string> = {};
    for (const giver of order) {
      const result = drawOne({ ids, taken, giver, ...options });
      if (!result.ok) throw new Error(`${giver} ficou sem opção (${result.reason})`);
      taken[giver] = result.receiver;
    }
    return taken;
  }

  it("não deixa a última pessoa sobrar com o próprio nome", () => {
    // Com três pessoas, se A tirou B, B não pode tirar A: C ficaria com C.
    for (let seed = 1; seed <= 200; seed++) {
      const result = drawOne({
        ids: ["a", "b", "c"],
        taken: { a: "b" },
        giver: "b",
        rng: seeded(seed),
      });
      expect(result).toEqual({ ok: true, receiver: "c" });
    }
  });

  it("sempre termina num sorteio válido, em qualquer ordem e tamanho", () => {
    for (const n of [3, 4, 5, 7, 10, 16]) {
      for (let seed = 1; seed <= 40; seed++) {
        const rng = seeded(seed * 131 + n);
        const ids = people(n);
        const taken = everyoneDraws(ids, shuffle(ids, rng), { rng });
        expectValid(ids, taken);
      }
    }
  });

  it("respeita as restrições mesmo sorteando um por vez", () => {
    const ids = people(8);
    const forbidden: Pair[] = [
      ["p0", "p1"], ["p1", "p0"],
      ["p2", "p3"], ["p3", "p2"],
      ["p4", "p5"], ["p5", "p4"],
      ["p6", "p0"], ["p6", "p1"], ["p6", "p2"],
    ];
    for (let seed = 1; seed <= 80; seed++) {
      const rng = seeded(seed);
      const taken = everyoneDraws(ids, shuffle(ids, rng), { forbidden, rng });
      expectValid(ids, taken, forbidden);
    }
  });

  it("evita os pares indesejados quando há alternativa", () => {
    const ids = people(6);
    const soft: Pair[] = [["p0", "p1"], ["p0", "p2"], ["p0", "p3"]];
    for (let seed = 1; seed <= 60; seed++) {
      const result = drawOne({ ids, taken: {}, giver: "p0", soft, rng: seeded(seed) });
      expect(result.ok && ["p4", "p5"].includes(result.receiver)).toBe(true);
    }
  });

  it("cede no par indesejado quando ele é a única saída", () => {
    const result = drawOne({
      ids: ["a", "b", "c"],
      taken: { a: "b" },
      giver: "b",
      soft: [["b", "c"]],
      rng: seeded(4),
    });
    expect(result).toEqual({ ok: true, receiver: "c" });
  });

  it("avisa quando a pessoa já sorteou ou quando não há saída", () => {
    const ids = ["a", "b", "c"];
    expect(drawOne({ ids, taken: { a: "b" }, giver: "a", rng: seeded(1) })).toEqual({
      ok: false,
      reason: "ja-sorteou",
    });
    expect(
      drawOne({ ids, taken: {}, giver: "a", forbidden: [["a", "b"], ["a", "c"]], rng: seeded(1) }),
    ).toEqual({ ok: false, reason: "impossivel" });
  });

  it("completa o sorteio de quem falta sem mexer no que já foi tirado", () => {
    const ids = people(7);
    for (let seed = 1; seed <= 60; seed++) {
      const rng = seeded(seed);
      const order = shuffle(ids, rng);
      const taken = everyoneDraws(ids, order.slice(0, 3), { rng });
      const rest = completeDraw({ ids, taken, rng });
      expect(rest.ok).toBe(true);
      if (!rest.ok) continue;
      expect(Object.keys(rest.pairs).sort()).toEqual(order.slice(3).sort());
      expectValid(ids, { ...taken, ...rest.pairs });
    }
  });

  it("completar respeita restrições e evita pares indesejados quando dá", () => {
    const ids = people(5);
    // p3 só pode tirar p4; p2 deve evitar p0, e há como: p4 tira p0 e p2 tira p3.
    const forbidden: Pair[] = [["p3", "p0"]];
    const soft: Pair[] = [["p2", "p0"]];
    for (let seed = 1; seed <= 40; seed++) {
      const rest = completeDraw({ ids, taken: { p0: "p1", p1: "p2" }, forbidden, soft, rng: seeded(seed) });
      expect(rest.ok).toBe(true);
      if (!rest.ok) continue;
      const all = { p0: "p1", p1: "p2", ...rest.pairs };
      expectValid(ids, all, [...forbidden, ...soft]);
    }
  });
});
