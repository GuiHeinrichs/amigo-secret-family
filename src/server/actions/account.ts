"use server";

import { and, eq, isNull } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/google-oauth";
import { AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/occasions";
import { normalizeEmail, requestLoginCode, verifyLoginCode } from "../auth";
import { clientIp } from "../context";
import { getDb } from "../db/client";
import { participants } from "../db/schema";
import {
  ActionError,
  requireAdmin,
  requireCtx,
  run,
  text,
  type ActionState,
} from "../guard";
import { newId, newParticipantToken } from "../ids";
import { setActiveProfile, signIn, signOut } from "../session";

export type CodeRequest = { error?: string; email?: string; devCode?: string | null };

export async function requestCode(rawEmail: string): Promise<CodeRequest> {
  try {
    const email = normalizeEmail(rawEmail);
    if (!email) throw new ActionError("Confira o e-mail: ele precisa ser como nome@exemplo.com.");
    const { devCode } = await requestLoginCode(email, await clientIp());
    return { email, devCode };
  } catch (error) {
    if (error instanceof ActionError) return { error: error.message };
    throw error;
  }
}

export async function verifyCode(
  rawEmail: string,
  code: string,
  next: string,
): Promise<{ error?: string }> {
  try {
    const email = normalizeEmail(rawEmail);
    if (!email) throw new ActionError("Peça um código novo.");
    await signIn(await verifyLoginCode(email, code));
  } catch (error) {
    if (error instanceof ActionError) return { error: error.message };
    throw error;
  }
  redirect(safeNext(next));
}

export async function signOutAction() {
  await signOut();
  redirect("/");
}

/** Troca o perfil "na tela" quando a conta cuida de mais de uma pessoa no grupo. */
export async function switchProfile(slug: string, participantId: string) {
  const ctx = await requireCtx(slug).catch(() => null);
  if (ctx?.profiles.some((p) => p.id === participantId)) {
    await setActiveProfile(ctx.group.id, participantId);
  }
  refresh();
}

const sameName = (a: string, b: string) =>
  a.localeCompare(b, "pt-BR", { sensitivity: "base" }) === 0;

/** Inclui no sorteio alguém que fica sob responsabilidade da conta (uma criança, por exemplo). */
export async function addDependent(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const ctx = await requireCtx(form.get("slug"));
    if (!ctx.user) throw new ActionError("Entre na sua conta para continuar.");
    if (ctx.profiles.length === 0 && !ctx.isAdmin) {
      throw new ActionError("Entre você no sorteio antes de incluir outra pessoa.");
    }
    if (ctx.group.status !== "montando") {
      throw new ActionError(
        ctx.group.status === "sorteando"
          ? "Com o sorteio liberado não dá para incluir gente nova."
          : "Depois do sorteio não dá para incluir gente nova.",
      );
    }
    const name = text(form, "name", 40);
    if (name.length < 2) throw new ActionError("Escreva o nome da pessoa.");

    const db = await getDb();
    const people = await db
      .select({ name: participants.name })
      .from(participants)
      .where(eq(participants.groupId, ctx.group.id));
    if (people.length >= 100) throw new ActionError("Este grupo está cheio.");
    if (people.some((p) => sameName(p.name, name))) {
      throw new ActionError("Já tem alguém com esse nome no grupo. Use um apelido ou o sobrenome.");
    }
    await db.insert(participants).values({
      id: newId(),
      groupId: ctx.group.id,
      userId: ctx.user.id,
      name,
      emoji: AVATAR_EMOJIS[people.length % AVATAR_EMOJIS.length],
      color: AVATAR_COLORS[people.length % AVATAR_COLORS.length],
      token: newParticipantToken(),
    });
    refresh();
    return { ok: true, note: `${name} entrou no sorteio sob a sua responsabilidade.` };
  });
}

/** Quem organiza assume um nome que ninguém reivindicou (alguém sem e-mail, por exemplo). */
export async function adoptParticipant(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group, user } = await requireAdmin(form.get("slug"));
    const id = text(form, "participantId", 40);
    const db = await getDb();
    const updated = await db
      .update(participants)
      .set({ userId: user!.id })
      .where(
        and(
          eq(participants.id, id),
          eq(participants.groupId, group.id),
          isNull(participants.userId),
        ),
      )
      .returning({ name: participants.name });
    if (updated.length === 0) {
      throw new ActionError("Essa pessoa já entrou com a própria conta.");
    }
    refresh();
    return {
      ok: true,
      note: `${updated[0].name} agora está na sua conta. Troque de perfil no topo da página para ver o papelzinho.`,
    };
  });
}
