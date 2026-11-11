import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { cache } from "react";
import { getDb } from "./db/client";
import { groups, participants, type Group, type Participant, type User } from "./db/schema";
import { getActiveProfiles, getUser } from "./session";

export type Ctx = {
  group: Group;
  /** Conta logada, se houver. */
  user: User | null;
  /** Participantes deste grupo sob responsabilidade da conta (ela e dependentes). */
  profiles: Participant[];
  /** O perfil que está "na tela" agora. */
  me: Participant | null;
  /** A conta é a de quem organiza. */
  isAdmin: boolean;
};

/** Quem é a conta logada dentro do grupo `slug`. `null` se o grupo não existe. */
export const getContext = cache(async (slug: string): Promise<Ctx | null> => {
  // A sessão vem primeiro: ler um dado da requisição avisa o Next de que tudo
  // daqui em diante (banco, relógio) só existe em tempo de requisição.
  const user = await getUser();
  const active = await getActiveProfiles();
  const db = await getDb();
  const [group] = await db.select().from(groups).where(eq(groups.slug, slug));
  if (!group) return null;

  const profiles = user
    ? await db
        .select()
        .from(participants)
        .where(and(eq(participants.groupId, group.id), eq(participants.userId, user.id)))
        .orderBy(asc(participants.createdAt), asc(participants.id))
    : [];
  const me = profiles.find((p) => p.id === active[group.id]) ?? profiles[0] ?? null;
  return { group, user, profiles, me, isAdmin: !!user && group.ownerId === user.id };
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
