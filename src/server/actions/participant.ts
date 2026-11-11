"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { stitch, type Pair } from "@/lib/draw";
import { AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/occasions";
import { clientIp } from "../context";
import { getDb } from "../db/client";
import {
  assignments,
  exclusions,
  messages,
  participants,
  themes,
  users,
} from "../db/schema";
import {
  ActionError,
  optional,
  requireAdmin,
  requireCtx,
  requireMember,
  run,
  text,
  type ActionState,
} from "../guard";
import { newId, newParticipantToken } from "../ids";
import { rateLimit } from "../ratelimit";
import { setActiveProfile } from "../session";

const MAX_PEOPLE = 100;

const sameName = (a: string, b: string) =>
  a.localeCompare(b, "pt-BR", { sensitivity: "base" }) === 0;

function pickAvatar(index: number) {
  return {
    emoji: AVATAR_EMOJIS[index % AVATAR_EMOJIS.length],
    color: AVATAR_COLORS[index % AVATAR_COLORS.length],
  };
}

function avatarFrom(form: FormData, fallbackIndex: number) {
  const emoji = text(form, "emoji", 8);
  const color = text(form, "color", 9);
  const fallback = pickAvatar(fallbackIndex);
  return {
    emoji: AVATAR_EMOJIS.includes(emoji) ? emoji : fallback.emoji,
    color: AVATAR_COLORS.includes(color) ? color : fallback.color,
  };
}

export async function joinGroup(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  let slug = "";
  const result = await run(async () => {
    const ctx = await requireCtx(form.get("slug"));
    slug = ctx.group.slug;
    const user = ctx.user;
    if (!user) throw new ActionError("Entre na sua conta para participar.");
    if (ctx.me) return;
    if (ctx.group.status !== "montando") {
      throw new ActionError(
        "O sorteio deste grupo já aconteceu. Peça a quem organiza o convite com o seu nome.",
      );
    }
    if (!(await rateLimit(`entrar:${user.id}:${await clientIp()}`, 30, 3600))) {
      throw new ActionError("Muitas tentativas em pouco tempo. Tente de novo mais tarde.");
    }
    const name = text(form, "name", 40);
    if (name.length < 2) throw new ActionError("Escreva como a turma chama você.");

    const db = await getDb();
    const people = await db
      .select({ name: participants.name })
      .from(participants)
      .where(eq(participants.groupId, ctx.group.id));
    if (people.length >= MAX_PEOPLE) throw new ActionError("Este grupo está cheio.");
    if (people.some((p) => sameName(p.name, name))) {
      throw new ActionError(
        "Já tem alguém com esse nome no grupo. Use um apelido ou acrescente o sobrenome.",
      );
    }
    const id = newId();
    await db.insert(participants).values({
      id,
      groupId: ctx.group.id,
      userId: user.id,
      name,
      ...avatarFrom(form, people.length),
      token: newParticipantToken(),
    });
    if (!user.name) await db.update(users).set({ name }).where(eq(users.id, user.id));
    await setActiveProfile(ctx.group.id, id);
  });
  if (result.error) return result;
  redirect(`/g/${slug}`);
}

/** O organizador pode colar vários nomes de uma vez, um por linha ou separados por vírgula. */
export async function addParticipants(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    if (group.status !== "montando") {
      throw new ActionError("Depois do sorteio não dá para incluir gente nova. Refaça o sorteio para incluir.");
    }
    const names = text(form, "names", 4000)
      .split(/[\n,;]+/)
      .map((n) => n.trim().slice(0, 40))
      .filter((n) => n.length >= 2);
    if (names.length === 0) throw new ActionError("Escreva pelo menos um nome.");

    const db = await getDb();
    const people = await db
      .select({ name: participants.name })
      .from(participants)
      .where(eq(participants.groupId, group.id));
    const taken = people.map((p) => p.name);
    const fresh: string[] = [];
    const skipped: string[] = [];
    for (const name of names) {
      if ([...taken, ...fresh].some((t) => sameName(t, name))) skipped.push(name);
      else fresh.push(name);
    }
    if (people.length + fresh.length > MAX_PEOPLE) {
      throw new ActionError(`O grupo aceita no máximo ${MAX_PEOPLE} pessoas.`);
    }
    if (fresh.length > 0) {
      const now = Date.now();
      await db.insert(participants).values(
        fresh.map((name, i) => ({
          id: newId(),
          groupId: group.id,
          name,
          ...pickAvatar(people.length + i),
          token: newParticipantToken(),
          // Um milissegundo de diferença mantém a ordem em que foram digitados.
          createdAt: new Date(now + i),
        })),
      );
    }
    refresh();
    if (skipped.length > 0) {
      return {
        ok: fresh.length > 0,
        error:
          fresh.length === 0
            ? `${skipped.join(", ")} já está no grupo.`
            : undefined,
        note: `Já estava no grupo e não foi repetido: ${skipped.join(", ")}.`,
      };
    }
  });
}

export async function removeParticipant(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    const id = text(form, "participantId", 40);
    const db = await getDb();
    const [person] = await db
      .select()
      .from(participants)
      .where(and(eq(participants.id, id), eq(participants.groupId, group.id)));
    if (!person) throw new ActionError("Essa pessoa já não está no grupo.");

    if (group.status === "festa" || group.status === "encerrado") {
      throw new ActionError("A festa já começou; não dá mais para tirar ninguém.");
    }

    if (group.status === "montando" || group.mode === "ladrao") {
      await db.transaction(async (tx) => {
        await tx.delete(participants).where(eq(participants.id, id));
        if (group.mode === "ladrao" && group.status === "sorteado") {
          const rest = await tx
            .select()
            .from(participants)
            .where(eq(participants.groupId, group.id));
          const ordered = rest.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
          for (const [i, p] of ordered.entries()) {
            await tx
              .update(participants)
              .set({ position: i + 1 })
              .where(eq(participants.id, p.id));
          }
        }
      });
      refresh();
      return { ok: true, note: `${person.name} saiu do grupo.` };
    }

    // Sorteio já feito: costura o ciclo em vez de refazer tudo.
    const rows = await db
      .select()
      .from(assignments)
      .where(eq(assignments.groupId, group.id));
    const pairs = Object.fromEntries(rows.map((a) => [a.giverId, a.receiverId]));
    const forbidden: Pair[] = (
      await db
        .select()
        .from(exclusions)
        .where(and(eq(exclusions.groupId, group.id), eq(exclusions.soft, false)))
    ).map((e) => [e.giverId, e.receiverId]);

    const result = stitch(pairs, id, forbidden);
    if (!result.ok) {
      const why = {
        poucos: "sobrariam menos de 3 pessoas",
        sozinho: "quem tirou essa pessoa ficaria tirando a si mesmo",
        restricao: "quem tirou essa pessoa herdaria alguém que não pode tirar",
      }[result.reason];
      throw new ActionError(
        `Não dá para tirar ${person.name} sem mexer no resto: ${why}. Refaça o sorteio para remover.`,
      );
    }

    const inheritor = rows.find((a) => a.giverId === result.giver)!;
    await db.transaction(async (tx) => {
      await tx.delete(assignments).where(eq(assignments.giverId, id));
      await tx.delete(messages).where(eq(messages.assignmentId, inheritor.id));
      await tx
        .update(assignments)
        .set({
          receiverId: result.receiver,
          hints: null,
          giverReadAt: null,
          receiverReadAt: null,
        })
        .where(eq(assignments.id, inheritor.id));
      // Quem herdou tem um papelzinho novo para abrir.
      await tx
        .update(participants)
        .set({ openedAt: null })
        .where(eq(participants.id, result.giver));
      await tx.delete(participants).where(eq(participants.id, id));
    });
    const [heir] = await db
      .select({ name: participants.name })
      .from(participants)
      .where(eq(participants.id, result.giver));
    refresh();
    return {
      ok: true,
      note: `${person.name} saiu. Só ${heir?.name ?? "uma pessoa"} mudou de amigo — avise para abrir o papelzinho de novo.`,
    };
  });
}

export async function updateProfile(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group, me } = await requireMember(form.get("slug"));
    const name = text(form, "name", 40);
    if (name.length < 2) throw new ActionError("Escreva como a turma chama você.");
    const db = await getDb();
    const others = await db
      .select({ id: participants.id, name: participants.name })
      .from(participants)
      .where(eq(participants.groupId, group.id));
    if (others.some((p) => p.id !== me.id && sameName(p.name, name))) {
      throw new ActionError("Já tem alguém com esse nome no grupo.");
    }
    await db
      .update(participants)
      .set({
        name,
        ...avatarFrom(form, 0),
        sizes: optional(form, "sizes", 200),
        likes: optional(form, "likes", 300),
        dislikes: optional(form, "dislikes", 300),
      })
      .where(eq(participants.id, me.id));
    refresh();
    return { ok: true, note: "Perfil salvo." };
  });
}

export async function addExclusion(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    if (group.status !== "montando") {
      throw new ActionError("As restrições só valem antes do sorteio.");
    }
    const a = text(form, "a", 40);
    const b = text(form, "b", 40);
    if (!a || !b || a === b) throw new ActionError("Escolha duas pessoas diferentes.");
    const db = await getDb();
    const people = await db
      .select({ id: participants.id })
      .from(participants)
      .where(eq(participants.groupId, group.id));
    const ids = new Set(people.map((p) => p.id));
    if (!ids.has(a) || !ids.has(b)) throw new ActionError("Essas pessoas não estão no grupo.");

    const pairs = form.get("mutual") === "on" ? [[a, b], [b, a]] : [[a, b]];
    for (const [giverId, receiverId] of pairs) {
      await db
        .insert(exclusions)
        .values({ id: newId(), groupId: group.id, giverId, receiverId, soft: false })
        .onConflictDoUpdate({
          target: [exclusions.giverId, exclusions.receiverId],
          set: { soft: false },
        });
    }
    refresh();
  });
}

export async function removeExclusion(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    const db = await getDb();
    await db
      .delete(exclusions)
      .where(
        and(
          eq(exclusions.id, text(form, "exclusionId", 40)),
          eq(exclusions.groupId, group.id),
        ),
      );
    refresh();
  });
}

export async function addTheme(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    const label = text(form, "label", 60);
    if (label.length < 2) throw new ActionError("Escreva o tema.");
    const db = await getDb();
    const existing = await db.select().from(themes).where(eq(themes.groupId, group.id));
    if (existing.length >= 40) throw new ActionError("Já tem tema de sobra.");
    await db.insert(themes).values({ id: newId(), groupId: group.id, label });
    refresh();
  });
}

export async function removeTheme(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  return run(async () => {
    const { group } = await requireAdmin(form.get("slug"));
    const db = await getDb();
    await db
      .delete(themes)
      .where(and(eq(themes.id, text(form, "themeId", 40)), eq(themes.groupId, group.id)));
    refresh();
  });
}
