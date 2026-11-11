"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { getDb } from "../db/client";
import { wishes } from "../db/schema";
import {
  ActionError,
  optional,
  requireMember,
  run,
  text,
  wholeNumber,
  type ActionState,
} from "../guard";
import { newId } from "../ids";

const MAX_WISHES = 20;

function cleanUrl(raw: string | null): string | null {
  if (!raw) return null;
  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function addWish(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { me } = await requireMember(form.get("slug"));
    const title = text(form, "title", 80);
    if (title.length < 2) throw new ActionError("Escreva o que é o item.");
    const rawUrl = optional(form, "url", 500);
    const url = cleanUrl(rawUrl);
    if (rawUrl && !url) {
      throw new ActionError("Esse link não parece válido. Cole o endereço completo da página.");
    }
    const db = await getDb();
    const mine = await db.select({ id: wishes.id }).from(wishes).where(eq(wishes.participantId, me.id));
    if (mine.length >= MAX_WISHES) {
      throw new ActionError(`A lista aceita até ${MAX_WISHES} itens. Apague algum para incluir outro.`);
    }
    await db.insert(wishes).values({
      id: newId(),
      participantId: me.id,
      title,
      url,
      price: wholeNumber(form, "price", 100_000),
      note: optional(form, "note", 140),
    });
    refresh();
  });
}

export async function removeWish(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { me } = await requireMember(form.get("slug"));
    const db = await getDb();
    await db
      .delete(wishes)
      .where(and(eq(wishes.id, text(form, "wishId", 40)), eq(wishes.participantId, me.id)));
    refresh();
  });
}
