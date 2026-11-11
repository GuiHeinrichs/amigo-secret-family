import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "./db/client";
import { exclusions, groups, participants, themes, wishes } from "./db/schema";

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

/** Grupos da conta: os que ela organiza e os em que cuida de algum participante. */
export async function listMyGroups(userId: string) {
  const db = await getDb();
  const owned = await db.select().from(groups).where(eq(groups.ownerId, userId));
  const joined = await db
    .select({ group: groups, name: participants.name })
    .from(participants)
    .innerJoin(groups, eq(groups.id, participants.groupId))
    .where(eq(participants.userId, userId))
    .orderBy(asc(participants.createdAt));

  const byId = new Map<string, { group: (typeof owned)[number]; isAdmin: boolean; names: string[] }>();
  for (const group of owned) byId.set(group.id, { group, isAdmin: true, names: [] });
  for (const row of joined) {
    const entry = byId.get(row.group.id) ?? { group: row.group, isAdmin: false, names: [] };
    entry.names.push(row.name);
    byId.set(row.group.id, entry);
  }
  return [...byId.values()].sort(
    (a, b) => b.group.createdAt.getTime() - a.group.createdAt.getTime(),
  );
}
