/**
 * Sorteio de amigo secreto.
 *
 * Preferimos um ciclo único (A→B→C→…→A): na festa, a revelação em cadeia
 * passa por todo mundo sem "fechar" antes da hora. Quando as restrições não
 * permitem um ciclo, caímos para qualquer emparelhamento válido. Restrições
 * "soft" (pares da edição anterior) são respeitadas se possível e
 * abandonadas se travarem o sorteio.
 */

export type Pair = readonly [giver: string, receiver: string];
export type Rng = () => number;

export type DrawOk = {
  ok: true;
  /** giver → receiver */
  pairs: Record<string, string>;
  singleCycle: boolean;
  softDropped: boolean;
};

export type DrawFail = {
  ok: false;
  reason: "poucos" | "impossivel";
  /** Pessoas sem ninguém possível para tirar, ou que ninguém pode tirar. */
  stuck: string[];
};

export const MIN_PARTICIPANTS = 3;

export function secureRng(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x1_0000_0000;
}

export function shuffle<T>(items: readonly T[], rng: Rng = secureRng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Allowed = Map<string, Set<string>>;

function buildAllowed(ids: readonly string[], forbidden: readonly Pair[]) {
  const allowed: Allowed = new Map();
  for (const id of ids) {
    allowed.set(id, new Set(ids.filter((other) => other !== id)));
  }
  for (const [giver, receiver] of forbidden) {
    allowed.get(giver)?.delete(receiver);
  }
  return allowed;
}

function findCycle(
  ids: readonly string[],
  allowed: Allowed,
  rng: Rng,
): string[] | null {
  const n = ids.length;
  const STEP_BUDGET = 20_000;
  const RESTARTS = 6;

  for (let attempt = 0; attempt < RESTARTS; attempt++) {
    const start = ids[Math.floor(rng() * n)];
    const path = [start];
    const visited = new Set([start]);
    let steps = 0;

    const extend = (current: string): boolean => {
      if (++steps > STEP_BUDGET) return false;
      const options = allowed.get(current)!;
      if (path.length === n) return options.has(start);

      const onward = (id: string) => {
        let count = 0;
        for (const next of allowed.get(id)!) if (!visited.has(next)) count++;
        return count;
      };
      // Menos saídas primeiro (heurística de Warnsdorff); o shuffle desempata.
      const candidates = shuffle(
        [...options].filter((id) => !visited.has(id)),
        rng,
      )
        .map((id) => ({ id, onward: onward(id) }))
        .sort((a, b) => a.onward - b.onward);

      for (const { id } of candidates) {
        visited.add(id);
        path.push(id);
        if (extend(id)) return true;
        path.pop();
        visited.delete(id);
        if (steps > STEP_BUDGET) return false;
      }
      return false;
    };

    if (extend(start)) return path;
  }
  return null;
}

/** Emparelhamento perfeito em grafo bipartido (algoritmo de Kuhn). */
function findMatching(
  ids: readonly string[],
  allowed: Allowed,
  rng: Rng,
): Record<string, string> | null {
  const giverOf = new Map<string, string>();
  const adjacency = new Map(
    ids.map((id) => [id, shuffle([...allowed.get(id)!], rng)]),
  );

  const tryAssign = (giver: string, seen: Set<string>): boolean => {
    for (const receiver of adjacency.get(giver)!) {
      if (seen.has(receiver)) continue;
      seen.add(receiver);
      const current = giverOf.get(receiver);
      if (current === undefined || tryAssign(current, seen)) {
        giverOf.set(receiver, giver);
        return true;
      }
    }
    return false;
  };

  for (const giver of shuffle(ids, rng)) {
    if (!tryAssign(giver, new Set())) return null;
  }
  const pairs: Record<string, string> = {};
  for (const [receiver, giver] of giverOf) pairs[giver] = receiver;
  return pairs;
}

export function isSingleCycle(pairs: Record<string, string>): boolean {
  const ids = Object.keys(pairs);
  if (ids.length === 0) return false;
  let current = ids[0];
  for (let i = 0; i < ids.length; i++) {
    current = pairs[current];
    if (current === undefined) return false;
    if (current === ids[0]) return i === ids.length - 1;
  }
  return false;
}

function attempt(ids: readonly string[], forbidden: readonly Pair[], rng: Rng) {
  const allowed = buildAllowed(ids, forbidden);
  const cycle = findCycle(ids, allowed, rng);
  if (cycle) {
    const pairs: Record<string, string> = {};
    cycle.forEach((id, i) => {
      pairs[id] = cycle[(i + 1) % cycle.length];
    });
    return { pairs, singleCycle: true };
  }
  const pairs = findMatching(ids, allowed, rng);
  return pairs ? { pairs, singleCycle: isSingleCycle(pairs) } : null;
}

function findStuck(ids: readonly string[], forbidden: readonly Pair[]) {
  const allowed = buildAllowed(ids, forbidden);
  const receivable = new Set<string>();
  for (const options of allowed.values()) {
    for (const id of options) receivable.add(id);
  }
  return ids.filter(
    (id) => allowed.get(id)!.size === 0 || !receivable.has(id),
  );
}

export function draw(
  ids: readonly string[],
  options: { forbidden?: readonly Pair[]; soft?: readonly Pair[]; rng?: Rng } = {},
): DrawOk | DrawFail {
  const { forbidden = [], soft = [], rng = secureRng } = options;
  const unique = [...new Set(ids)];
  if (unique.length < MIN_PARTICIPANTS) {
    return { ok: false, reason: "poucos", stuck: [] };
  }

  if (soft.length > 0) {
    const strict = attempt(unique, [...forbidden, ...soft], rng);
    if (strict) return { ok: true, ...strict, softDropped: false };
  }
  const result = attempt(unique, forbidden, rng);
  if (result) return { ok: true, ...result, softDropped: soft.length > 0 };
  return { ok: false, reason: "impossivel", stuck: findStuck(unique, forbidden) };
}

export type StitchResult =
  | { ok: true; pairs: Record<string, string>; giver: string; receiver: string }
  | { ok: false; reason: "poucos" | "sozinho" | "restricao" };

/**
 * Alguém saiu depois do sorteio: quem tinha tirado essa pessoa herda quem
 * ela tinha tirado. Só um participante muda de amigo; ninguém mais é afetado.
 */
export function stitch(
  pairs: Record<string, string>,
  leaving: string,
  forbidden: readonly Pair[] = [],
): StitchResult {
  const remaining = Object.keys(pairs).length - 1;
  if (remaining < MIN_PARTICIPANTS) return { ok: false, reason: "poucos" };
  const receiver = pairs[leaving];
  const giver = Object.keys(pairs).find((id) => pairs[id] === leaving);
  if (!giver || !receiver) return { ok: false, reason: "sozinho" };
  if (giver === receiver) return { ok: false, reason: "sozinho" };
  if (forbidden.some(([g, r]) => g === giver && r === receiver)) {
    return { ok: false, reason: "restricao" };
  }
  const next = { ...pairs, [giver]: receiver };
  delete next[leaving];
  return { ok: true, pairs: next, giver, receiver };
}

/**
 * Revelação em cadeia: quem acabou de receber é o próximo a entregar; se essa
 * pessoa já entregou (o ciclo fechou), sorteia alguém que ainda não foi.
 */
export function nextGiver(
  pairs: Record<string, string>,
  alreadyGave: ReadonlySet<string>,
  justReceived: string | null,
  rng: Rng = secureRng,
): string | null {
  if (justReceived && pairs[justReceived] && !alreadyGave.has(justReceived)) {
    return justReceived;
  }
  const waiting = Object.keys(pairs).filter((id) => !alreadyGave.has(id));
  if (waiting.length === 0) return null;
  return waiting[Math.floor(rng() * waiting.length)];
}
