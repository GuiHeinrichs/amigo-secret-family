"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { completeDraw, draw, drawOne, MIN_PARTICIPANTS, shuffle } from "@/lib/draw";
import { plural } from "@/lib/format";
import { getDb, type Db } from "../db/client";
import {
  assignments,
  gifts,
  groups,
  guesses,
  participants,
  parties,
  themes,
  type Assignment,
  type Group,
} from "../db/schema";
import { drawFailureMessage, loadDrawRules, pickTheme } from "../draw-rules";
import {
  ActionError,
  requireAdmin,
  requireMember,
  run,
  text,
  type ActionState,
} from "../guard";
import { newId } from "../ids";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

async function clearDraw(tx: Tx, groupId: string) {
  await tx.delete(assignments).where(eq(assignments.groupId, groupId));
  await tx.delete(guesses).where(eq(guesses.groupId, groupId));
  await tx.delete(parties).where(eq(parties.groupId, groupId));
  await tx.delete(gifts).where(eq(gifts.groupId, groupId));
  await tx
    .update(participants)
    .set({ openedAt: null, position: null })
    .where(eq(participants.groupId, groupId));
}

async function themeLabels(db: Pick<Db, "select">, group: Group): Promise<string[]> {
  if (!group.themed) return [];
  return (await db.select().from(themes).where(eq(themes.groupId, group.id))).map((t) => t.label);
}

/** Sorteia todo mundo de uma vez (ou a fila, no Amigo Ladrão). */
export async function runDraw(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    if (group.status === "festa" || group.status === "encerrado") {
      throw new ActionError("A festa já começou; o sorteio não pode mais mudar.");
    }
    if (group.status === "sorteando") {
      throw new ActionError(
        "O sorteio individual está aberto. Cancele-o antes de sortear todo mundo de uma vez.",
      );
    }
    const db = await getDb();
    const people = await db
      .select()
      .from(participants)
      .where(eq(participants.groupId, group.id));
    if (people.length < MIN_PARTICIPANTS) {
      throw new ActionError(`Precisa de pelo menos ${MIN_PARTICIPANTS} pessoas para sortear.`);
    }
    const ids = people.map((p) => p.id);

    if (group.mode === "ladrao") {
      const order = shuffle(ids);
      await db.transaction(async (tx) => {
        await clearDraw(tx, group.id);
        for (const [i, id] of order.entries()) {
          await tx
            .update(participants)
            .set({ position: i + 1 })
            .where(eq(participants.id, id));
        }
        await tx
          .update(groups)
          .set({ status: "sorteado", drawnAt: new Date() })
          .where(eq(groups.id, group.id));
      });
      refresh();
      return { ok: true, note: "Fila sorteada. Cada pessoa já pode ver a sua posição." };
    }

    const result = draw(ids, await loadDrawRules(db, group.id, people));
    if (!result.ok) throw new ActionError(drawFailureMessage(result, people));
    const labels = shuffle(await themeLabels(db, group));

    await db.transaction(async (tx) => {
      await clearDraw(tx, group.id);
      await tx.insert(assignments).values(
        Object.entries(result.pairs).map(([giverId, receiverId], i) => ({
          id: newId(),
          groupId: group.id,
          giverId,
          receiverId,
          theme: labels.length > 0 ? labels[i % labels.length] : null,
        })),
      );
      await tx
        .update(groups)
        .set({ status: "sorteado", drawnAt: new Date() })
        .where(eq(groups.id, group.id));
    });
    refresh();
    return {
      ok: true,
      note: result.softDropped
        ? "Sorteio feito. Não deu para evitar todos os pares que o app tenta evitar (edição anterior e pessoas da mesma conta)."
        : "Sorteio feito. Nem você consegue ver quem tirou quem.",
    };
  });
}

/**
 * Sorteio individual: em vez de sortear todo mundo, libera para cada pessoa
 * sortear o próprio amigo. O grupo fica em "sorteando" até a última sortear
 * ou até quem organiza completar por quem falta.
 */
export async function openSelfDraw(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    if (group.status !== "montando") {
      throw new ActionError("O sorteio deste grupo já foi liberado ou feito.");
    }
    if (group.mode === "ladrao") {
      throw new ActionError("No Amigo Ladrão quem é sorteada é a fila; use “Sortear a fila”.");
    }
    const db = await getDb();
    const people = await db
      .select()
      .from(participants)
      .where(eq(participants.groupId, group.id));
    if (people.length < MIN_PARTICIPANTS) {
      throw new ActionError(`Precisa de pelo menos ${MIN_PARTICIPANTS} pessoas para sortear.`);
    }
    // Só libera se existir algum sorteio possível; depois disso cada sorteio
    // individual preserva essa garantia.
    const check = draw(
      people.map((p) => p.id),
      { forbidden: (await loadDrawRules(db, group.id, people)).forbidden },
    );
    if (!check.ok) throw new ActionError(drawFailureMessage(check, people));

    await db.transaction(async (tx) => {
      await clearDraw(tx, group.id);
      await tx
        .update(groups)
        .set({ status: "sorteando", drawnAt: null })
        .where(eq(groups.id, group.id));
    });
    refresh();
    return {
      ok: true,
      note: "Sorteio liberado. Cada pessoa, inclusive você, já pode sortear o próprio amigo.",
    };
  });
}

/** Marca o grupo como sorteado quando o último par é criado. */
async function closeIfComplete(tx: Tx, groupId: string, pairCount: number, peopleCount: number) {
  if (pairCount < peopleCount) return;
  await tx
    .update(groups)
    .set({ status: "sorteado", drawnAt: new Date() })
    .where(eq(groups.id, groupId));
}

/** Sorteia o par de uma pessoa durante o sorteio individual. */
async function drawFor(group: Group, giverId: string, openedAt: Date): Promise<Assignment> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    // Trava o grupo: dois sorteios simultâneos não podem pegar o mesmo nome.
    const [locked] = await tx.select().from(groups).where(eq(groups.id, group.id)).for("update");
    const rows = await tx.select().from(assignments).where(eq(assignments.groupId, group.id));
    const existing = rows.find((a) => a.giverId === giverId);
    if (existing) return existing;
    if (locked?.status !== "sorteando") {
      throw new ActionError("O sorteio não está aberto agora. Atualize a página.");
    }

    const people = await tx
      .select()
      .from(participants)
      .where(eq(participants.groupId, group.id));
    const result = drawOne({
      ids: people.map((p) => p.id),
      taken: Object.fromEntries(rows.map((a) => [a.giverId, a.receiverId])),
      giver: giverId,
      ...(await loadDrawRules(tx, group.id, people)),
    });
    if (!result.ok) {
      throw new ActionError("Não deu para sortear agora. Avise quem organiza o grupo.");
    }

    const [created] = await tx
      .insert(assignments)
      .values({
        id: newId(),
        groupId: group.id,
        giverId,
        receiverId: result.receiver,
        theme: pickTheme(
          await themeLabels(tx, group),
          rows.map((a) => a.theme),
        ),
      })
      .returning();
    // Sortear e abrir são um gesto só: enquanto o sorteio está aberto,
    // "abriu o papelzinho" e "já sorteou" querem dizer a mesma coisa.
    await tx.update(participants).set({ openedAt }).where(eq(participants.id, giverId));
    await closeIfComplete(tx, group.id, rows.length + 1, people.length);
    return created;
  });
}

/** Quem organiza sorteia de uma vez por todo mundo que ainda não sorteou. */
export async function completeSelfDraw(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    if (group.status !== "sorteando") {
      throw new ActionError("Não há sorteio individual aberto neste grupo.");
    }
    const db = await getDb();
    const added = await db.transaction(async (tx) => {
      await tx.select().from(groups).where(eq(groups.id, group.id)).for("update");
      const people = await tx
        .select()
        .from(participants)
        .where(eq(participants.groupId, group.id));
      const rows = await tx.select().from(assignments).where(eq(assignments.groupId, group.id));
      const result = completeDraw({
        ids: people.map((p) => p.id),
        taken: Object.fromEntries(rows.map((a) => [a.giverId, a.receiverId])),
        ...(await loadDrawRules(tx, group.id, people)),
      });
      if (!result.ok) {
        throw new ActionError(
          "Não deu para completar o sorteio com as restrições atuais. Cancele o sorteio e libere de novo.",
        );
      }
      const labels = await themeLabels(tx, group);
      const used = rows.map((a) => a.theme);
      const fresh = Object.entries(result.pairs).map(([giverId, receiverId]) => {
        const theme = pickTheme(labels, used);
        used.push(theme);
        return { id: newId(), groupId: group.id, giverId, receiverId, theme };
      });
      if (fresh.length > 0) await tx.insert(assignments).values(fresh);
      await closeIfComplete(tx, group.id, rows.length + fresh.length, people.length);
      return fresh.length;
    });
    refresh();
    return {
      ok: true,
      note:
        added === 0
          ? "Todo mundo já tinha sorteado."
          : `Sorteio completo. ${plural(added, "pessoa recebeu", "pessoas receberam")} o papelzinho lacrado para abrir quando entrar.`,
    };
  });
}

export async function resetDraw(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    const db = await getDb();
    await db.transaction(async (tx) => {
      await clearDraw(tx, group.id);
      await tx
        .update(groups)
        .set({ status: "montando", drawnAt: null })
        .where(eq(groups.id, group.id));
    });
    refresh();
    return { ok: true, note: "Sorteio desfeito. As conversas e os palpites foram apagados." };
  });
}

export type SlipResult =
  | {
      kind: "amigo";
      name: string;
      emoji: string;
      color: string;
      theme: string | null;
      firstOpen: boolean;
      /** O par foi sorteado agora, neste mesmo gesto (sorteio individual). */
      drawnNow: boolean;
      openedAt: string;
    }
  | {
      kind: "posicao";
      position: number;
      total: number;
      firstOpen: boolean;
      openedAt: string;
    }
  | { kind: "erro"; error: string };

/**
 * Rompe o lacre. O nome só sai do servidor aqui, numa ação explícita —
 * nunca num GET — para que o preview de link do WhatsApp não "abra" nada.
 * No sorteio individual, é também aqui que a pessoa sorteia o próprio par.
 */
export async function openSlip(slug: string): Promise<SlipResult> {
  try {
    const { group, me } = await requireMember(slug);
    if (group.status === "montando") {
      return { kind: "erro", error: "O sorteio ainda não aconteceu." };
    }
    const db = await getDb();
    const firstOpen = !me.openedAt;
    const openedAt = me.openedAt ?? new Date();

    if (group.mode === "ladrao") {
      const people = await db
        .select({ id: participants.id })
        .from(participants)
        .where(eq(participants.groupId, group.id));
      if (firstOpen) {
        await db.update(participants).set({ openedAt }).where(eq(participants.id, me.id));
      }
      return {
        kind: "posicao",
        position: me.position ?? 0,
        total: people.length,
        firstOpen,
        openedAt: openedAt.toISOString(),
      };
    }

    let [mine] = await db.select().from(assignments).where(eq(assignments.giverId, me.id));
    let drawnNow = false;
    if (!mine && group.status === "sorteando") {
      mine = await drawFor(group, me.id, openedAt);
      drawnNow = true;
    }
    if (!mine) return { kind: "erro", error: "Não achamos o seu papelzinho. Fale com quem organiza." };
    const [friend] = await db
      .select()
      .from(participants)
      .where(eq(participants.id, mine.receiverId));
    if (firstOpen) {
      await db.update(participants).set({ openedAt }).where(eq(participants.id, me.id));
    }
    return {
      kind: "amigo",
      name: friend.name,
      emoji: friend.emoji,
      color: friend.color,
      theme: mine.theme,
      firstOpen,
      drawnNow,
      openedAt: openedAt.toISOString(),
    };
  } catch (error) {
    if (error instanceof ActionError) return { kind: "erro", error: error.message };
    throw error;
  }
}

export async function saveHints(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { me } = await requireMember(form.get("slug"));
    if (!me.openedAt) throw new ActionError("Abra o seu papelzinho primeiro.");
    const db = await getDb();
    await db
      .update(assignments)
      .set({ hints: text(form, "hints", 300) || null })
      .where(eq(assignments.giverId, me.id));
    refresh();
    return { ok: true, note: "Dicas guardadas para a hora da festa." };
  });
}
