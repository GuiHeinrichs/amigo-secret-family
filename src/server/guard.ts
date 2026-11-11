import "server-only";
import { getContext, type Ctx } from "./context";
import type { Participant } from "./db/schema";

export type ActionState = { error?: string; ok?: boolean; note?: string };

export class ActionError extends Error {}

export async function requireCtx(slug: unknown): Promise<Ctx> {
  if (typeof slug !== "string" || !slug) throw new ActionError("Grupo não encontrado.");
  const ctx = await getContext(slug);
  if (!ctx) throw new ActionError("Grupo não encontrado.");
  return ctx;
}

export async function requireAdmin(slug: unknown): Promise<Ctx> {
  const ctx = await requireCtx(slug);
  if (!ctx.isAdmin) throw new ActionError("Só quem organiza o grupo pode fazer isso.");
  return ctx;
}

export async function requireMember(
  slug: unknown,
): Promise<Ctx & { me: Participant }> {
  const ctx = await requireCtx(slug);
  if (!ctx.me) {
    throw new ActionError("Abra o seu link pessoal neste aparelho para continuar.");
  }
  return ctx as Ctx & { me: Participant };
}

/** Converte erros esperados em mensagem para a tela; o resto segue estourando. */
export async function run(
  fn: () => Promise<ActionState | void>,
): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (error) {
    if (error instanceof ActionError) return { error: error.message };
    throw error;
  }
}

export function text(form: FormData, key: string, max: number): string {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function optional(form: FormData, key: string, max: number): string | null {
  return text(form, key, max) || null;
}

export function wholeNumber(form: FormData, key: string, max: number): number | null {
  const raw = text(form, key, 12).replace(/[^\d]/g, "");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? Math.min(value, max) : null;
}
