import "server-only";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

/**
 * Sem contas: o aparelho guarda, num cookie assinado, de quais grupos a
 * pessoa participa. Ele é preenchido quando ela cria um grupo, entra pelo
 * convite ou abre o próprio link pessoal (/k/[token]).
 */
export type Membership = {
  /** id do grupo */
  g: string;
  /** id do participante neste grupo, se participa */
  p?: string;
  /** organizador */
  a?: 1;
};

const COOKIE = "laco";
const MAX_AGE = 60 * 60 * 24 * 365;
const MAX_GROUPS = 30;

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    if (process.env.VERCEL) {
      throw new Error("SESSION_SECRET não está configurada neste ambiente.");
    }
    return new TextEncoder().encode("laco-dev-secret-apenas-para-uso-local");
  }
  return new TextEncoder().encode(value);
}

export async function getMemberships(): Promise<Membership[]> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return [];
  try {
    const { payload } = await jwtVerify(raw, secret());
    return Array.isArray(payload.m) ? (payload.m as Membership[]) : [];
  } catch {
    return [];
  }
}

async function write(memberships: Membership[]) {
  const token = await new SignJWT({ m: memberships.slice(0, MAX_GROUPS) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

/** Junta com o que o aparelho já sabia sobre o grupo; o mais recente vai para o topo. */
export async function addMembership(next: Membership) {
  const current = await getMemberships();
  const previous = current.find((m) => m.g === next.g);
  const merged: Membership = {
    g: next.g,
    p: next.p ?? previous?.p,
    ...(next.a || previous?.a ? { a: 1 as const } : {}),
  };
  await write([merged, ...current.filter((m) => m.g !== next.g)]);
}

export async function removeMembership(groupId: string) {
  const current = await getMemberships();
  await write(current.filter((m) => m.g !== groupId));
}
