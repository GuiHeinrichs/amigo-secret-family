import "server-only";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { getDb } from "./db/client";
import { groups, participants, type Group, type Participant } from "./db/schema";
import { getMemberships } from "./session";

export type Ctx = {
  group: Group;
  /** Participante deste aparelho no grupo, se houver. */
  me: Participant | null;
  isAdmin: boolean;
};

/** Quem é este aparelho dentro do grupo `slug`. `null` se o grupo não existe. */
export const getContext = cache(async (slug: string): Promise<Ctx | null> => {
  // O cookie vem primeiro: ler um dado da requisição avisa o Next de que tudo
  // daqui em diante (banco, relógio) só existe em tempo de requisição.
  const memberships = await getMemberships();
  const db = await getDb();
  const [group] = await db.select().from(groups).where(eq(groups.slug, slug));
  if (!group) return null;

  const membership = memberships.find((m) => m.g === group.id);
  let me: Participant | null = null;
  if (membership?.p) {
    const [row] = await db
      .select()
      .from(participants)
      .where(
        and(eq(participants.id, membership.p), eq(participants.groupId, group.id)),
      );
    me = row ?? null;
  }
  return { group, me, isAdmin: membership?.a === 1 };
});

export async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
