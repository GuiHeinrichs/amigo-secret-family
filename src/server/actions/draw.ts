"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { draw, MIN_PARTICIPANTS, shuffle, type Pair } from "@/lib/draw";
import { getDb, type Db } from "../db/client";
import {
  assignments,
  exclusions,
  gifts,
  groups,
  guesses,
  participants,
  parties,
  themes,
} from "../db/schema";
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

export async function runDraw(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    if (group.status === "festa" || group.status === "encerrado") {
      throw new ActionError("A festa já começou; o sorteio não pode mais mudar.");
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

    const rules = await db.select().from(exclusions).where(eq(exclusions.groupId, group.id));
    const forbidden: Pair[] = rules.filter((r) => !r.soft).map((r) => [r.giverId, r.receiverId]);
    const soft: Pair[] = rules.filter((r) => r.soft).map((r) => [r.giverId, r.receiverId]);
    // Quem cuida de mais de um participante (ex.: mãe e filho) veria o par
    // inteiro se um tirasse o outro; evitamos sempre que o grupo permitir.
    for (const a of people) {
      for (const b of people) {
        if (a.id !== b.id && a.userId && a.userId === b.userId) soft.push([a.id, b.id]);
      }
    }
    const result = draw(ids, { forbidden, soft });

    if (!result.ok) {
      const names = result.stuck
        .map((id) => people.find((p) => p.id === id)?.name)
        .filter(Boolean);
      throw new ActionError(
        names.length > 0
          ? `As restrições deixam ${names.join(", ")} sem opção. Remova alguma restrição e sorteie de novo.`
          : "Com essas restrições não existe sorteio possível. Remova alguma e tente de novo.",
      );
    }

    const labels = group.themed
      ? shuffle(
          (await db.select().from(themes).where(eq(themes.groupId, group.id))).map(
            (t) => t.label,
          ),
        )
      : [];

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

    const [mine] = await db.select().from(assignments).where(eq(assignments.giverId, me.id));
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
