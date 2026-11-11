import "server-only";
import { asc, eq } from "drizzle-orm";
import {
  canOpen,
  canSteal,
  currentPlayer,
  isLocked,
  isOver,
  type LadraoState,
} from "@/lib/ladrao";
import type { ClassicParty, LadraoParty, PartyState, Person } from "@/lib/party-types";
import type { Ctx } from "./context";
import { getDb } from "./db/client";
import {
  assignments,
  gifts,
  guesses,
  participants,
  parties,
  type Gift,
  type Participant,
  type Party,
} from "./db/schema";

const toPerson = (p: Participant): Person => ({
  id: p.id,
  name: p.name,
  emoji: p.emoji,
  color: p.color,
});

export async function loadPeople(groupId: string) {
  const db = await getDb();
  return db
    .select()
    .from(participants)
    .where(eq(participants.groupId, groupId))
    .orderBy(asc(participants.createdAt), asc(participants.id));
}

export function ladraoState(
  people: Participant[],
  party: Party | undefined,
  giftRows: Gift[],
  maxSteals: number,
): LadraoState {
  return {
    order: [...people]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((p) => p.id),
    turn: party?.turn ?? 0,
    pendingId: party?.pendingId ?? null,
    lastStolenGiftId: party?.lastStolenGiftId ?? null,
    gifts: giftRows.map((g) => ({ id: g.id, holderId: g.holderId, steals: g.steals })),
    maxSteals,
  };
}

export async function getPartyState(ctx: Ctx): Promise<PartyState> {
  const db = await getDb();
  const { group, me, isAdmin } = ctx;
  const people = await loadPeople(group.id);
  const [party] = await db.select().from(parties).where(eq(parties.groupId, group.id));
  const base = {
    version: party?.version ?? 0,
    people: people.map(toPerson),
    meId: me?.id ?? null,
    isAdmin,
  };

  if (group.mode === "ladrao") {
    const giftRows = await db
      .select()
      .from(gifts)
      .where(eq(gifts.groupId, group.id))
      .orderBy(asc(gifts.number));
    const state = ladraoState(people, party, giftRows, group.maxSteals);
    const playing = !!party && party.phase === "jogo" && !isOver(state);
    const current = playing ? currentPlayer(state) : null;
    const canAct = playing && (isAdmin || (!!me && me.id === current));
    const result: LadraoParty = {
      ...base,
      kind: "ladrao",
      phase: !party ? "antes" : playing ? "jogo" : "fim",
      order: state.order,
      turn: state.turn,
      currentId: current,
      wasRobbed: playing && state.pendingId !== null,
      maxSteals: group.maxSteals,
      canAct,
      gifts: giftRows.map((g) => {
        const view = state.gifts.find((s) => s.id === g.id)!;
        return {
          id: g.id,
          number: g.number,
          label: g.label,
          holderId: g.holderId,
          steals: g.steals,
          locked: isLocked(state, view),
          canOpen: canAct && canOpen(state, g.id),
          canSteal: canAct && canSteal(state, g.id),
          canLabel: g.holderId !== null && (isAdmin || g.holderId === me?.id),
        };
      }),
    };
    return result;
  }

  const rows = await db.select().from(assignments).where(eq(assignments.groupId, group.id));
  const guessRows = await db.select().from(guesses).where(eq(guesses.groupId, group.id));
  const revealed = rows
    .filter((a) => a.revealedAt)
    .sort((a, b) => (a.revealOrder ?? 0) - (b.revealOrder ?? 0));
  const phase = (party?.phase ?? "antes") as ClassicParty["phase"];
  const current =
    phase === "revelacao" ? rows.find((a) => a.giverId === party?.currentId) : undefined;
  const shown = !!party?.shown && !!current;

  let canAct = false;
  if (phase === "palpites") canAct = isAdmin;
  if (phase === "revelacao" && current) {
    canAct =
      isAdmin ||
      me?.id === current.giverId ||
      (shown && me?.id === current.receiverId);
  }

  const result: ClassicParty = {
    ...base,
    kind: "classico",
    phase,
    guessCount: guessRows.length,
    myGuessId: guessRows.find((g) => g.participantId === me?.id)?.guessId ?? null,
    currentId: current?.giverId ?? null,
    shown,
    hints: current?.hints ?? null,
    receiverId: shown ? current!.receiverId : null,
    revealed: revealed.map((a) => ({ giverId: a.giverId, receiverId: a.receiverId })),
    remaining: rows.length - revealed.length,
    canAct,
    score:
      phase === "placar"
        ? rows.map((a) => {
            const guess = guessRows.find((g) => g.participantId === a.receiverId);
            return {
              id: a.receiverId,
              guessId: guess?.guessId ?? null,
              giverId: a.giverId,
              correct: guess?.guessId === a.giverId,
            };
          })
        : null,
  };
  return result;
}
