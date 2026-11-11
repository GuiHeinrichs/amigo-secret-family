import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { getDb } from "./db/client";
import { loginCodes, users } from "./db/schema";
import { emailConfigured, sendEmail } from "./email";
import { ActionError } from "./guard";
import { newId } from "./ids";
import { rateLimit } from "./ratelimit";
import { sessionSecret } from "./session";

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254 ? email : null;
}

function hashCode(email: string, code: string): string {
  return createHash("sha256")
    .update(email)
    .update(":")
    .update(code)
    .update(":")
    .update(sessionSecret())
    .digest("hex");
}

/**
 * Gera e envia um código de 6 dígitos. Devolve o próprio código só quando
 * não há envio de e-mail configurado fora de produção, para o dev local e os
 * testes conseguirem entrar.
 */
export async function requestLoginCode(
  email: string,
  ip: string,
): Promise<{ devCode: string | null }> {
  if (!(await rateLimit(`codigo:${email}`, 5, 3600)) || !(await rateLimit(`codigo-ip:${ip}`, 30, 3600))) {
    throw new ActionError("Muitos códigos pedidos em pouco tempo. Tente de novo mais tarde.");
  }
  const canShowCode = !emailConfigured() && process.env.NODE_ENV !== "production";
  if (!emailConfigured() && !canShowCode) {
    throw new ActionError("O envio de e-mail não está configurado neste site.");
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const db = await getDb();
  await db.transaction(async (tx) => {
    // Um código por vez: pedir outro invalida o anterior.
    await tx.delete(loginCodes).where(eq(loginCodes.email, email));
    await tx.delete(loginCodes).where(lt(loginCodes.expiresAt, new Date()));
    await tx.insert(loginCodes).values({
      id: newId(),
      email,
      codeHash: hashCode(email, code),
      expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000),
    });
  });

  await sendEmail({
    to: email,
    subject: `${code} é o seu código do Laço`,
    text: `Seu código para entrar no Laço é ${code}. Ele vale por ${CODE_MINUTES} minutos. Se não foi você que pediu, ignore este e-mail.`,
    html: `<p>Seu código para entrar no Laço é</p><p style="font-size:32px;font-weight:700;letter-spacing:6px">${code}</p><p>Ele vale por ${CODE_MINUTES} minutos. Se não foi você que pediu, ignore este e-mail.</p>`,
  });
  return { devCode: canShowCode ? code : null };
}

/** Confere o código e devolve o id da conta, criando-a no primeiro acesso. */
export async function verifyLoginCode(email: string, code: string): Promise<string> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(loginCodes)
    .where(and(eq(loginCodes.email, email), gt(loginCodes.expiresAt, new Date())))
    .orderBy(desc(loginCodes.createdAt))
    .limit(1);
  if (!row) {
    throw new ActionError("Esse código venceu. Peça um novo.");
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    await db.delete(loginCodes).where(eq(loginCodes.id, row.id));
    throw new ActionError("Muitas tentativas erradas. Peça um código novo.");
  }

  const expected = Buffer.from(row.codeHash, "hex");
  const given = Buffer.from(hashCode(email, code.replace(/\D/g, "")), "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    await db
      .update(loginCodes)
      .set({ attempts: row.attempts + 1 })
      .where(eq(loginCodes.id, row.id));
    throw new ActionError("Código incorreto. Confira os 6 dígitos e tente de novo.");
  }
  await db.delete(loginCodes).where(eq(loginCodes.id, row.id));
  return findOrCreateUser(email);
}

/**
 * A conta é identificada pelo e-mail, venha ele do código por e-mail ou do
 * Google. Devolve o id, criando a conta no primeiro acesso.
 */
export async function findOrCreateUser(email: string, name?: string | null): Promise<string> {
  const db = await getDb();
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    if (!existing.name && name) {
      await db.update(users).set({ name }).where(eq(users.id, existing.id));
    }
    return existing.id;
  }
  await db.insert(users).values({ id: newId(), email, name: name ?? null }).onConflictDoNothing();
  const [created] = await db.select().from(users).where(eq(users.email, email));
  return created.id;
}
