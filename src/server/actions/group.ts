"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  MODE_KEYS,
  OCCASION_KEYS,
  THEME_PRESETS,
} from "@/lib/occasions";
import { clientIp } from "../context";
import { getDb } from "../db/client";
import {
  assignments,
  exclusions,
  groups,
  participants,
  themes,
  users,
} from "../db/schema";
import {
  ActionError,
  optional,
  requireAdmin,
  requireUser,
  run,
  text,
  wholeNumber,
  type ActionState,
} from "../guard";
import { newId, newParticipantToken, newSlug } from "../ids";
import { rateLimit } from "../ratelimit";

const detailsSchema = z.object({
  name: z.string().min(2, "Dê um nome ao grupo.").max(60),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  eventTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .nullable(),
});

function readDetails(form: FormData) {
  const parsed = detailsSchema.safeParse({
    name: text(form, "name", 60),
    eventDate: optional(form, "eventDate", 10),
    eventTime: optional(form, "eventTime", 5),
  });
  if (!parsed.success) {
    throw new ActionError(parsed.error.issues[0]?.message ?? "Confira os dados do grupo.");
  }
  let budgetMin = wholeNumber(form, "budgetMin", 100_000);
  let budgetMax = wholeNumber(form, "budgetMax", 100_000);
  if (budgetMin && budgetMax && budgetMin > budgetMax) {
    [budgetMin, budgetMax] = [budgetMax, budgetMin];
  }
  return {
    ...parsed.data,
    budgetMin,
    budgetMax,
    place: optional(form, "place", 120),
    message: optional(form, "message", 400),
  };
}

function pick<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export async function createGroup(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  let slug = "";
  const result = await run(async () => {
    const user = await requireUser();
    if (!(await rateLimit(`criar:${user.id}:${await clientIp()}`, 10, 3600))) {
      throw new ActionError("Muitos grupos criados em pouco tempo. Tente de novo mais tarde.");
    }
    const details = readDetails(form);
    const mode = pick(text(form, "mode", 20), MODE_KEYS, "classico");
    const occasion = pick(text(form, "occasion", 20), OCCASION_KEYS, "natal");
    const themed = mode !== "ladrao" && form.get("themed") === "on";
    const organizer = text(form, "organizer", 40);

    const db = await getDb();
    const groupId = newId();
    slug = newSlug(details.name);

    await db.transaction(async (tx) => {
      await tx.insert(groups).values({
        id: groupId,
        slug,
        ownerId: user.id,
        ...details,
        mode,
        occasion,
        themed,
      });
      if (organizer) {
        await tx.insert(participants).values({
          id: newId(),
          groupId,
          userId: user.id,
          name: organizer,
          emoji: AVATAR_EMOJIS[0],
          color: AVATAR_COLORS[0],
          token: newParticipantToken(),
        });
      }
      if (themed) {
        await tx
          .insert(themes)
          .values(THEME_PRESETS.map((label) => ({ id: newId(), groupId, label })));
      }
      // Guarda o nome na conta para preencher os próximos formulários.
      if (organizer && !user.name) {
        await tx.update(users).set({ name: organizer }).where(eq(users.id, user.id));
      }
    });
  });
  if (result.error) return result;
  redirect(`/g/${slug}/admin`);
}

export async function updateGroup(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    const details = readDetails(form);
    const db = await getDb();
    const editable = group.status === "montando";
    const mode = editable
      ? pick(text(form, "mode", 20), MODE_KEYS, "classico")
      : group.mode;
    const themed = editable
      ? mode !== "ladrao" && form.get("themed") === "on"
      : group.themed;
    const maxSteals = wholeNumber(form, "maxSteals", 5) ?? group.maxSteals;

    await db.transaction(async (tx) => {
      await tx
        .update(groups)
        .set({
          ...details,
          occasion: pick(text(form, "occasion", 20), OCCASION_KEYS, "outro"),
          mode,
          themed,
          maxSteals,
        })
        .where(eq(groups.id, group.id));
      if (themed && !group.themed) {
        const existing = await tx
          .select({ id: themes.id })
          .from(themes)
          .where(eq(themes.groupId, group.id));
        if (existing.length === 0) {
          await tx.insert(themes).values(
            THEME_PRESETS.map((label) => ({ id: newId(), groupId: group.id, label })),
          );
        }
      }
    });
    refresh();
    return { ok: true, note: "Alterações salvas." };
  });
}

/** Clona o grupo para a próxima edição; o novo sorteio evita repetir os pares deste. */
export async function newEdition(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  let slug = "";
  const result = await run(async () => {
    const { group, user } = await requireAdmin(form.get("slug"));
    const db = await getDb();
    const people = await db
      .select()
      .from(participants)
      .where(eq(participants.groupId, group.id));
    const oldExclusions = await db
      .select()
      .from(exclusions)
      .where(eq(exclusions.groupId, group.id));
    const oldPairs = await db
      .select()
      .from(assignments)
      .where(eq(assignments.groupId, group.id));
    const oldThemes = await db.select().from(themes).where(eq(themes.groupId, group.id));

    const groupId = newId();
    slug = newSlug(group.name);
    const idMap = new Map(people.map((p) => [p.id, newId()]));

    await db.transaction(async (tx) => {
      await tx.insert(groups).values({
        id: groupId,
        slug,
        name: group.name,
        occasion: group.occasion,
        mode: group.mode,
        themed: group.themed,
        budgetMin: group.budgetMin,
        budgetMax: group.budgetMax,
        place: group.place,
        maxSteals: group.maxSteals,
        ownerId: user!.id,
        previousGroupId: group.id,
      });
      if (people.length > 0) {
        await tx.insert(participants).values(
          people.map((p) => ({
            id: idMap.get(p.id)!,
            groupId,
            // As contas acompanham: ninguém precisa entrar de novo.
            userId: p.userId,
            name: p.name,
            emoji: p.emoji,
            color: p.color,
            likes: p.likes,
            dislikes: p.dislikes,
            sizes: p.sizes,
            token: newParticipantToken(),
          })),
        );
      }
      const pairs = new Map<string, { giverId: string; receiverId: string; soft: boolean }>();
      for (const e of oldExclusions.filter((e) => !e.soft)) {
        pairs.set(`${e.giverId}>${e.receiverId}`, { ...e, soft: false });
      }
      for (const a of oldPairs) {
        const key = `${a.giverId}>${a.receiverId}`;
        if (!pairs.has(key)) pairs.set(key, { ...a, soft: true });
      }
      const rows = [...pairs.values()]
        .filter((p) => idMap.has(p.giverId) && idMap.has(p.receiverId))
        .map((p) => ({
          id: newId(),
          groupId,
          giverId: idMap.get(p.giverId)!,
          receiverId: idMap.get(p.receiverId)!,
          soft: p.soft,
        }));
      if (rows.length > 0) await tx.insert(exclusions).values(rows);
      if (oldThemes.length > 0) {
        await tx
          .insert(themes)
          .values(oldThemes.map((t) => ({ id: newId(), groupId, label: t.label })));
      }
    });
  });
  if (result.error) return result;
  redirect(`/g/${slug}/admin`);
}

export async function deleteGroup(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const result = await run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    if (text(form, "confirm", 60) !== group.name) {
      throw new ActionError("Digite o nome do grupo exatamente como aparece para confirmar.");
    }
    const db = await getDb();
    await db.delete(groups).where(eq(groups.id, group.id));
  });
  if (result.error) return result;
  redirect("/");
}
