import "server-only";
import { eq } from "drizzle-orm";
import type { DrawFail, Pair } from "@/lib/draw";
import type { Db } from "./db/client";
import { exclusions, type Participant } from "./db/schema";

/** Aceita tanto a conexão quanto uma transação em andamento. */
type Queryable = Pick<Db, "select">;

/**
 * Restrições do sorteio de um grupo, só entre as pessoas informadas.
 * - rígidas: "quem não pode tirar quem", definidas por quem organiza;
 * - leves: pares da edição anterior e pessoas da mesma conta. Quem cuida de
 *   mais de um participante (mãe e filho, por exemplo) veria o par inteiro se
 *   um tirasse o outro, então evitamos sempre que o grupo permitir.
 */
export async function loadDrawRules(
  db: Queryable,
  groupId: string,
  people: Pick<Participant, "id" | "userId">[],
): Promise<{ forbidden: Pair[]; soft: Pair[] }> {
  const present = new Set(people.map((p) => p.id));
  const rules = (await db.select().from(exclusions).where(eq(exclusions.groupId, groupId))).filter(
    (rule) => present.has(rule.giverId) && present.has(rule.receiverId),
  );
  const forbidden: Pair[] = rules.filter((r) => !r.soft).map((r) => [r.giverId, r.receiverId]);
  const soft: Pair[] = rules.filter((r) => r.soft).map((r) => [r.giverId, r.receiverId]);
  for (const a of people) {
    for (const b of people) {
      if (a.id !== b.id && a.userId && a.userId === b.userId) soft.push([a.id, b.id]);
    }
  }
  return { forbidden, soft };
}

export function drawFailureMessage(
  result: DrawFail,
  people: Pick<Participant, "id" | "name">[],
): string {
  const names = result.stuck.map((id) => people.find((p) => p.id === id)?.name).filter(Boolean);
  return names.length > 0
    ? `As restrições deixam ${names.join(", ")} sem opção. Remova alguma restrição e sorteie de novo.`
    : "Com essas restrições não existe sorteio possível. Remova alguma e tente de novo.";
}

/** Tema de presente para um par novo: o menos usado até agora, ao acaso entre os empatados. */
export function pickTheme(labels: string[], used: (string | null)[]): string | null {
  if (labels.length === 0) return null;
  const count = (label: string) => used.filter((theme) => theme === label).length;
  const fewest = Math.min(...labels.map(count));
  const options = labels.filter((label) => count(label) === fewest);
  return options[Math.floor(Math.random() * options.length)];
}
