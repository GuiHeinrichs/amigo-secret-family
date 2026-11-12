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

/**
 * Emparelhamento perfeito em grafo bipartido (algoritmo de Kuhn): cada um de
 * `givers` recebe um nome diferente de `receivers`. Devolve `null` se não
 * houver como atender todo mundo.
 */
function matchSubset(
  givers: readonly string[],
  receivers: ReadonlySet<string>,
  allowed: Allowed,
  rng: Rng,
): Record<string, string> | null {
  if (givers.length > receivers.size) return null;
  const giverOf = new Map<string, string>();
  const adjacency = new Map(
    givers.map((id) => [
      id,
      shuffle(
        [...allowed.get(id)!].filter((receiver) => receivers.has(receiver)),
        rng,
      ),
    ]),
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

  for (const giver of shuffle(givers, rng)) {
    if (!tryAssign(giver, new Set())) return null;
  }
  const pairs: Record<string, string> = {};
  for (const [receiver, giver] of giverOf) pairs[giver] = receiver;
  return pairs;
}

function findMatching(ids: readonly string[], allowed: Allowed, rng: Rng) {
  return matchSubset(ids, new Set(ids), allowed, rng);
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

/*
 * ——— Sorteio individual ———
 *
 * Em vez de sortear todo mundo de uma vez, cada pessoa sorteia o próprio
 * amigo quando quiser, como se tirasse um papelzinho do chapéu. O chapéu de
 * verdade tem um defeito: a última pessoa pode ficar só com o próprio nome.
 * Aqui isso não acontece, porque a cada sorteio só entram os nomes que ainda
 * deixam o sorteio dos demais possível.
 */

export type DrawOneResult =
  | { ok: true; receiver: string }
  | { ok: false; reason: "ja-sorteou" | "impossivel" };

type PartialDraw = {
  ids: readonly string[];
  /** Pares já sorteados: giver → receiver. */
  taken: Readonly<Record<string, string>>;
  forbidden?: readonly Pair[];
  /** Pares a evitar quando houver alternativa. */
  soft?: readonly Pair[];
  rng?: Rng;
};

function openSeats(ids: readonly string[], taken: Readonly<Record<string, string>>) {
  const drawn = new Set(Object.values(taken));
  return {
    /** Quem ainda não sorteou. */
    waiting: ids.filter((id) => taken[id] === undefined),
    /** Quem ainda não foi tirado por ninguém. */
    free: ids.filter((id) => !drawn.has(id)),
  };
}

export function drawOne(options: PartialDraw & { giver: string }): DrawOneResult {
  const { ids, taken, giver, forbidden = [], soft = [], rng = secureRng } = options;
  if (taken[giver] !== undefined) return { ok: false, reason: "ja-sorteou" };
  if (!ids.includes(giver)) return { ok: false, reason: "impossivel" };

  const allowed = buildAllowed(ids, forbidden);
  const { waiting, free } = openSeats(ids, taken);
  const others = waiting.filter((id) => id !== giver);

  // Um nome só entra no sorteio se, tirando ele, os outros ainda fecham.
  const feasible = free.filter((candidate) => {
    if (!allowed.get(giver)!.has(candidate)) return false;
    const rest = new Set(free);
    rest.delete(candidate);
    return matchSubset(others, rest, allowed, rng) !== null;
  });
  if (feasible.length === 0) return { ok: false, reason: "impossivel" };

  const avoid = new Set(soft.filter(([g]) => g === giver).map(([, receiver]) => receiver));
  const preferred = feasible.filter((candidate) => !avoid.has(candidate));
  const pool = preferred.length > 0 ? preferred : feasible;
  return { ok: true, receiver: pool[Math.floor(rng() * pool.length)] };
}

/**
 * Sorteia de uma vez todo mundo que ainda falta, sem mexer nos pares já
 * tirados. Devolve só os pares novos.
 */
export function completeDraw(
  options: PartialDraw,
): { ok: true; pairs: Record<string, string> } | { ok: false } {
  const { ids, taken, forbidden = [], soft = [], rng = secureRng } = options;
  const { waiting, free } = openSeats(ids, taken);
  const seats = new Set(free);

  if (soft.length > 0) {
    const strict = matchSubset(waiting, seats, buildAllowed(ids, [...forbidden, ...soft]), rng);
    if (strict) return { ok: true, pairs: strict };
  }
  const pairs = matchSubset(waiting, seats, buildAllowed(ids, forbidden), rng);
  return pairs ? { ok: true, pairs } : { ok: false };
}
