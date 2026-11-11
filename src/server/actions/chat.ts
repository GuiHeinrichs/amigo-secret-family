"use server";

import { eq } from "drizzle-orm";
import { chatAvailable, findThread, isChatSide } from "../chat";
import { getDb } from "../db/client";
import { assignments, messages } from "../db/schema";
import { ActionError, requireMember, run, type ActionState } from "../guard";
import { newId } from "../ids";
import { rateLimit } from "../ratelimit";

export async function sendMessage(
  slug: string,
  side: string,
  body: string,
): Promise<ActionState> {
  return run(async () => {
    const ctx = await requireMember(slug);
    if (!isChatSide(side) || !chatAvailable(ctx)) {
      throw new ActionError("Esta conversa ainda não está disponível.");
    }
    const clean = body.trim().slice(0, 500);
    if (!clean) throw new ActionError("Escreva uma mensagem.");
    if (!(await rateLimit(`chat:${ctx.me.id}`, 30, 60))) {
      throw new ActionError("Calma! Espere um minutinho antes de mandar mais mensagens.");
    }
    const thread = await findThread(ctx.me, side);
    if (!thread) throw new ActionError("Esta conversa ainda não está disponível.");

    const db = await getDb();
    const now = new Date();
    await db.insert(messages).values({
      id: newId(),
      assignmentId: thread.assignment.id,
      fromGiver: thread.iAmGiver,
      body: clean,
      createdAt: now,
    });
    await db
      .update(assignments)
      .set(thread.iAmGiver ? { giverReadAt: now } : { receiverReadAt: now })
      .where(eq(assignments.id, thread.assignment.id));
  });
}
