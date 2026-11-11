/**
 * Regras do Amigo Ladrão.
 *
 * Na sua vez, a pessoa abre um presente novo ou rouba um já aberto. Quem é
 * roubado joga em seguida (abre ou rouba outro). A vez só passa para o
 * próximo da fila quando alguém abre um presente novo. Um presente roubado
 * `maxSteals` vezes fica trancado, e não vale roubar de volta na mesma hora
 * o presente que acabaram de tirar de você.
 */

export type LadraoGift = { id: string; holderId: string | null; steals: number };

export type LadraoState = {
  /** ids na ordem da fila */
  order: string[];
  turn: number;
  pendingId: string | null;
  lastStolenGiftId: string | null;
  gifts: LadraoGift[];
  maxSteals: number;
};

export function isOver(state: LadraoState): boolean {
  return state.pendingId === null && state.turn >= state.order.length;
}

export function currentPlayer(state: LadraoState): string | null {
  if (state.pendingId) return state.pendingId;
  return state.order[state.turn] ?? null;
}

export function isLocked(state: LadraoState, gift: LadraoGift): boolean {
  return gift.holderId !== null && gift.steals >= state.maxSteals;
}

export function canOpen(state: LadraoState, giftId: string): boolean {
  if (isOver(state)) return false;
  const gift = state.gifts.find((g) => g.id === giftId);
  return !!gift && gift.holderId === null;
}

export function canSteal(state: LadraoState, giftId: string): boolean {
  const player = currentPlayer(state);
  if (!player || isOver(state)) return false;
  const gift = state.gifts.find((g) => g.id === giftId);
  if (!gift || gift.holderId === null || gift.holderId === player) return false;
  if (isLocked(state, gift)) return false;
  return gift.id !== state.lastStolenGiftId;
}

export function open(state: LadraoState, giftId: string): LadraoState {
  const player = currentPlayer(state);
  if (!player || !canOpen(state, giftId)) {
    throw new Error("Esse presente não pode ser aberto agora.");
  }
  return {
    ...state,
    gifts: state.gifts.map((g) =>
      g.id === giftId ? { ...g, holderId: player } : g,
    ),
    turn: state.turn + 1,
    pendingId: null,
    lastStolenGiftId: null,
  };
}

export function steal(state: LadraoState, giftId: string): LadraoState {
  const player = currentPlayer(state);
  if (!player || !canSteal(state, giftId)) {
    throw new Error("Esse presente não pode ser roubado agora.");
  }
  const victim = state.gifts.find((g) => g.id === giftId)!.holderId!;
  return {
    ...state,
    gifts: state.gifts.map((g) =>
      g.id === giftId ? { ...g, holderId: player, steals: g.steals + 1 } : g,
    ),
    pendingId: victim,
    lastStolenGiftId: giftId,
  };
}
