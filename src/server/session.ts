import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { getDb } from "./db/client";
import { groups, participants, users, type User } from "./db/schema";

/**
 * Sessão: um cookie assinado que guarda só o id da conta. Tudo o mais
 * (grupos, participantes sob responsabilidade da conta) vive no banco,
 * então a pessoa encontra os mesmos dados em qualquer aparelho.
 */
const SESSION_COOKIE = "laco_s";
const PROFILE_COOKIE = "laco_perfil";
/** Cookie da versão sem contas: lista de grupos guardada no aparelho. */
const LEGACY_COOKIE = "laco";
const MAX_AGE = 60 * 60 * 24 * 365;

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};

export function sessionSecret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    if (process.env.VERCEL) {
      throw new Error("SESSION_SECRET não está configurada neste ambiente.");
    }
    return new TextEncoder().encode("laco-dev-secret-apenas-para-uso-local");
  }
  return new TextEncoder().encode(value);
}

async function readToken(name: string): Promise<Record<string, unknown> | null> {
  const raw = (await cookies()).get(name)?.value;
  if (!raw) return null;
  try {
    return (await jwtVerify(raw, sessionSecret())).payload;
  } catch {
    return null;
  }
}

/** Conta logada neste aparelho, ou `null`. */
export const getUser = cache(async (): Promise<User | null> => {
  const payload = await readToken(SESSION_COOKIE);
  if (typeof payload?.u !== "string") return null;
  const db = await getDb();
  const [user] = await db.select().from(users).where(eq(users.id, payload.u));
  return user ?? null;
});

export async function signIn(userId: string) {
  const token = await new SignJWT({ u: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(sessionSecret());
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions);
  await adoptLegacyMemberships(userId);
}

export async function signOut() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(PROFILE_COOKIE);
}

/**
 * Antes das contas, o aparelho guardava seus grupos num cookie. No primeiro
 * login, o que ainda não tem dono passa para a conta e o cookie é apagado.
 */
async function adoptLegacyMemberships(userId: string) {
  const payload = await readToken(LEGACY_COOKIE);
  const store = await cookies();
  if (!payload) return;
  store.delete(LEGACY_COOKIE);
  const memberships = Array.isArray(payload.m)
    ? (payload.m as { g?: string; p?: string; a?: 1 }[])
    : [];
  const owned = memberships.filter((m) => m.a === 1 && m.g).map((m) => m.g!);
  const mine = memberships.filter((m) => m.p).map((m) => m.p!);
  const db = await getDb();
  if (owned.length > 0) {
    await db
      .update(groups)
      .set({ ownerId: userId })
      .where(and(inArray(groups.id, owned), isNull(groups.ownerId)));
  }
  if (mine.length > 0) {
    await db
      .update(participants)
      .set({ userId })
      .where(and(inArray(participants.id, mine), isNull(participants.userId)));
  }
}

/**
 * Quando a conta cuida de mais de um participante no mesmo grupo, este
 * cookie lembra qual deles está "na tela": { idDoGrupo: idDoParticipante }.
 * Não é assinado porque é sempre conferido contra o banco.
 */
export async function getActiveProfiles(): Promise<Record<string, string>> {
  const raw = (await cookies()).get(PROFILE_COOKIE)?.value;
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export async function setActiveProfile(groupId: string, participantId: string) {
  const current = await getActiveProfiles();
  const entries = Object.entries({ ...current, [groupId]: participantId }).slice(-40);
  (await cookies()).set(PROFILE_COOKIE, JSON.stringify(Object.fromEntries(entries)), cookieOptions);
}
