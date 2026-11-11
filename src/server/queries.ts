import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "./db/client";
import { exclusions, groups, participants, themes, wishes } from "./db/schema";
import type { Membership } from "./session";

export async function listPeople(groupId: string) {
  const db = await getDb();
  return db
    .select()
    .from(participants)
    .where(eq(participants.groupId, groupId))
    .orderBy(asc(participants.createdAt), asc(participants.id));
}

export async function listWishes(participantId: string) {
  const db = await getDb();
  return db
    .select()
    .from(wishes)
    .where(eq(wishes.participantId, participantId))
    .orderBy(asc(wishes.createdAt));
}

/** id do participante → quantos itens tem na lista */
export async function wishCounts(participantIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (participantIds.length === 0) return counts;
  const db = await getDb();
  const rows = await db
    .select({ participantId: wishes.participantId })
    .from(wishes)
    .where(inArray(wishes.participantId, participantIds));
  for (const row of rows) {
    counts.set(row.participantId, (counts.get(row.participantId) ?? 0) + 1);
  }
  return counts;
}

export async function listExclusions(groupId: string) {
  const db = await getDb();
  return db.select().from(exclusions).where(eq(exclusions.groupId, groupId));
}

export async function listThemes(groupId: string) {
  const db = await getDb();
  return db.select().from(themes).where(eq(themes.groupId, groupId));
}

/** Grupos guardados no cookie deste aparelho, na ordem do mais recente. */
export async function listMyGroups(memberships: Membership[]) {
  if (memberships.length === 0) return [];
  const db = await getDb();
  const rows = await db
    .select()
    .from(groups)
    .where(
      inArray(
        groups.id,
        memberships.map((m) => m.g),
      ),
    );
  return memberships.flatMap((membership) => {
    const group = rows.find((g) => g.id === membership.g);
    return group ? [{ group, isAdmin: membership.a === 1, participates: !!membership.p }] : [];
  });
}
