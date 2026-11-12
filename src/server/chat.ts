import "server-only";
import { and, asc, count, eq, gt } from "drizzle-orm";
import type { ChatSide } from "@/lib/occasions";
import type { Ctx } from "./context";
import { getDb } from "./db/client";
import { assignments, messages, participants, type Participant } from "./db/schema";

export type ChatMessage = { id: string; mine: boolean; body: string; at: string };

export type ChatThread = {
  /** Só existe no lado "amigo": do outro lado a pessoa é um mistério. */
  peer: { name: string; emoji: string; color: string } | null;
  messages: ChatMessage[];
};

export function isChatSide(value: unknown): value is ChatSide {
  return value === "amigo" || value === "misterio";
}

/**
 * As conversas só abrem com o sorteio completo. Com o sorteio individual ainda
 * aberto, uma mensagem chegando diria "alguém já tirou você", e cruzando isso
 * com a lista de quem já sorteou daria para adivinhar quem foi.
 */
export function chatAvailable(ctx: Ctx): ctx is Ctx & { me: Participant } {
  return (
    !!ctx.me &&
    ctx.group.mode !== "ladrao" &&
    ctx.group.status !== "montando" &&
    ctx.group.status !== "sorteando"
  );
}

/**
 * "amigo": conversa com quem eu tirei (eu sou o anônimo).
 * "misterio": conversa com quem me tirou (o outro é o anônimo).
 */
export async function findThread(me: Participant, side: ChatSide) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(assignments)
    .where(
      side === "amigo"
        ? eq(assignments.giverId, me.id)
        : eq(assignments.receiverId, me.id),
    );
  if (!row) return null;
  // Sem abrir o papelzinho a pessoa ainda não sabe com quem falaria.
  if (side === "amigo" && !me.openedAt) return null;
  return { assignment: row, iAmGiver: side === "amigo" };
}

export async function readThread(me: Participant, side: ChatSide): Promise<ChatThread | null> {
  const thread = await findThread(me, side);
  if (!thread) return null;
  const db = await getDb();
  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.assignmentId, thread.assignment.id))
    .orderBy(asc(messages.createdAt));

  await db
    .update(assignments)
    .set(thread.iAmGiver ? { giverReadAt: new Date() } : { receiverReadAt: new Date() })
    .where(eq(assignments.id, thread.assignment.id));

  let peer: ChatThread["peer"] = null;
  if (thread.iAmGiver) {
    const [friend] = await db
      .select({ name: participants.name, emoji: participants.emoji, color: participants.color })
      .from(participants)
      .where(eq(participants.id, thread.assignment.receiverId));
    peer = friend ?? null;
  }
  return {
    peer,
    // Nunca mandamos ids de remetente: só "é minha" ou "não é".
    messages: rows.map((m) => ({
      id: m.id,
      mine: m.fromGiver === thread.iAmGiver,
      body: m.body,
      at: m.createdAt.toISOString(),
    })),
  };
}

export async function unreadCount(me: Participant, side: ChatSide): Promise<number> {
  const thread = await findThread(me, side);
  if (!thread) return 0;
  const db = await getDb();
  const since = thread.iAmGiver
    ? thread.assignment.giverReadAt
    : thread.assignment.receiverReadAt;
  const [row] = await db
    .select({ n: count() })
    .from(messages)
    .where(
      and(
        eq(messages.assignmentId, thread.assignment.id),
        eq(messages.fromGiver, !thread.iAmGiver),
        since ? gt(messages.createdAt, since) : undefined,
      ),
    );
  return row?.n ?? 0;
}
