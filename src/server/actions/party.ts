"use server";

import { and, asc, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { nextGiver } from "@/lib/draw";
import { currentPlayer, isOver, open, steal } from "@/lib/ladrao";
import { getDb } from "../db/client";
import {
  assignments,
  gifts,
  groups,
  guesses,
  participants,
  parties,
} from "../db/schema";
import {
  ActionError,
  requireAdmin,
  requireCtx,
  requireMember,
  run,
  text,
  type ActionState,
} from "../guard";
import { newId } from "../ids";
import { ladraoState, loadPeople } from "../party";

export async function saveGuess(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group, me } = await requireMember(form.get("slug"));
    if (group.mode === "ladrao" || group.status === "montando") {
      throw new ActionError("Ainda não dá para palpitar.");
    }
    const db = await getDb();
    const [party] = await db.select().from(parties).where(eq(parties.groupId, group.id));
    if (party && party.phase !== "palpites") {
      throw new ActionError("A revelação já começou; os palpites estão fechados.");
    }
    const guessId = text(form, "guessId", 40);
    const [target] = await db
      .select({ id: participants.id })
      .from(participants)
      .where(and(eq(participants.id, guessId), eq(participants.groupId, group.id)));
    if (!target || target.id === me.id) throw new ActionError("Escolha outra pessoa do grupo.");

    await db
      .insert(guesses)
      .values({ participantId: me.id, groupId: group.id, guessId })
      .onConflictDoUpdate({ target: guesses.participantId, set: { guessId } });
    refresh();
    return { ok: true, note: "Palpite guardado. Dá para trocar até a revelação começar." };
  });
}

export async function startParty(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    if (group.status !== "sorteado") {
      throw new ActionError(
        group.status === "montando"
          ? "Faça o sorteio antes de começar a festa."
          : "A festa já começou.",
      );
    }
    const db = await getDb();
    const people = await loadPeople(group.id);
    await db.transaction(async (tx) => {
      await tx.insert(parties).values({
        groupId: group.id,
        phase: group.mode === "ladrao" ? "jogo" : "palpites",
      });
      if (group.mode === "ladrao") {
        await tx.insert(gifts).values(
          people.map((_, i) => ({ id: newId(), groupId: group.id, number: i + 1 })),
        );
      }
      await tx.update(groups).set({ status: "festa" }).where(eq(groups.id, group.id));
    });
    refresh();
  });
}

/** Avança a revelação em cadeia. `version` evita que dois toques avancem duas vezes. */
export async function advanceParty(slug: string, version: number): Promise<ActionState> {
  return run(async () => {
    const { group, me, isAdmin } = await requireCtx(slug);
    const db = await getDb();
    const [party] = await db.select().from(parties).where(eq(parties.groupId, group.id));
    if (!party || group.mode === "ladrao") throw new ActionError("A festa ainda não começou.");
    if (party.version !== version) return { ok: true };

    const rows = await db.select().from(assignments).where(eq(assignments.groupId, group.id));
    const pairs = Object.fromEntries(rows.map((a) => [a.giverId, a.receiverId]));
    const gave = new Set(rows.filter((a) => a.revealedAt).map((a) => a.giverId));
    const bump = { version: party.version + 1, updatedAt: new Date() };
    const guard = and(eq(parties.groupId, group.id), eq(parties.version, party.version));

    if (party.phase === "palpites") {
      if (!isAdmin) throw new ActionError("Só quem organiza começa a revelação.");
      await db
        .update(parties)
        .set({ ...bump, phase: "revelacao", currentId: nextGiver(pairs, gave, null), shown: false })
        .where(guard);
      return;
    }

    if (party.phase !== "revelacao") return { ok: true };
    const current = rows.find((a) => a.giverId === party.currentId);
    if (!current) throw new ActionError("Não achamos quem é a pessoa da vez.");

    if (!party.shown) {
      if (!isAdmin && me?.id !== current.giverId) {
        throw new ActionError("Quem revela é a pessoa da vez.");
      }
      await db.transaction(async (tx) => {
        const updated = await tx
          .update(parties)
          .set({ ...bump, shown: true })
          .where(guard)
          .returning({ groupId: parties.groupId });
        if (updated.length === 0) return;
        await tx
          .update(assignments)
          .set({ revealedAt: new Date(), revealOrder: gave.size + 1 })
          .where(eq(assignments.id, current.id));
      });
      return;
    }

    if (!isAdmin && me?.id !== current.giverId && me?.id !== current.receiverId) {
      throw new ActionError("Quem passa a vez é quem acabou de receber.");
    }
    const next = nextGiver(pairs, gave, current.receiverId);
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(parties)
        .set(
          next
            ? { ...bump, currentId: next, shown: false }
            : { ...bump, phase: "placar", currentId: null, shown: false },
        )
        .where(guard)
        .returning({ groupId: parties.groupId });
      if (updated.length > 0 && !next) {
        await tx.update(groups).set({ status: "encerrado" }).where(eq(groups.id, group.id));
      }
    });
  });
}

export async function playLadrao(
  slug: string,
  giftId: string,
  move: "abrir" | "roubar",
  version: number,
): Promise<ActionState> {
  return run(async () => {
    const { group, me, isAdmin } = await requireCtx(slug);
    const db = await getDb();
    const [party] = await db.select().from(parties).where(eq(parties.groupId, group.id));
    if (!party || group.mode !== "ladrao" || party.phase !== "jogo") {
      throw new ActionError("O jogo não está rolando agora.");
    }
    if (party.version !== version) return { ok: true };

    const people = await loadPeople(group.id);
    const giftRows = await db
      .select()
      .from(gifts)
      .where(eq(gifts.groupId, group.id))
      .orderBy(asc(gifts.number));
    const state = ladraoState(people, party, giftRows, group.maxSteals);
    if (!isAdmin && me?.id !== currentPlayer(state)) {
      throw new ActionError("Espere a sua vez.");
    }

    let next;
    try {
      next = move === "abrir" ? open(state, giftId) : steal(state, giftId);
    } catch (error) {
      throw new ActionError(error instanceof Error ? error.message : "Jogada inválida.");
    }
    const gift = next.gifts.find((g) => g.id === giftId)!;
    const over = isOver(next);

    await db.transaction(async (tx) => {
      const updated = await tx
        .update(parties)
        .set({
          version: party.version + 1,
          updatedAt: new Date(),
          turn: next.turn,
          pendingId: next.pendingId,
          lastStolenGiftId: next.lastStolenGiftId,
          phase: over ? "fim" : "jogo",
        })
        .where(and(eq(parties.groupId, group.id), eq(parties.version, party.version)))
        .returning({ groupId: parties.groupId });
      if (updated.length === 0) return;
      await tx
        .update(gifts)
        .set({ holderId: gift.holderId, steals: gift.steals })
        .where(eq(gifts.id, giftId));
      if (over) {
        await tx.update(groups).set({ status: "encerrado" }).where(eq(groups.id, group.id));
      }
    });
  });
}

export async function labelGift(
  slug: string,
  giftId: string,
  label: string,
): Promise<ActionState> {
  return run(async () => {
    const { group, me, isAdmin } = await requireCtx(slug);
    const db = await getDb();
    const [gift] = await db
      .select()
      .from(gifts)
      .where(and(eq(gifts.id, giftId), eq(gifts.groupId, group.id)));
    if (!gift || gift.holderId === null) throw new ActionError("Esse presente ainda está fechado.");
    if (!isAdmin && gift.holderId !== me?.id) {
      throw new ActionError("Só quem está com o presente pode dizer o que ele é.");
    }
    await db
      .update(gifts)
      .set({ label: label.trim().slice(0, 40) || null })
      .where(eq(gifts.id, giftId));
  });
}
