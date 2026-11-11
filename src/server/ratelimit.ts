import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "./db/client";
import { rateLimits } from "./db/schema";

/**
 * Janela fixa guardada no Postgres. É um freio simples contra abuso
 * (criar grupos em massa, floodar o chat), não um limitador de precisão.
 * Devolve `false` quando o limite estourou.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  // No dev e nos testes ponta a ponta tudo vem do mesmo "IP"; o freio só atrapalharia.
  if (process.env.NODE_ENV !== "production") return true;
  const db = await getDb();
  const now = new Date();
  const [row] = await db.select().from(rateLimits).where(eq(rateLimits.key, key));

  if (!row || now.getTime() - row.windowStart.getTime() > windowSeconds * 1000) {
    await db
      .insert(rateLimits)
      .values({ key, count: 1, windowStart: now })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: { count: 1, windowStart: now },
      });
    return true;
  }
  if (row.count >= limit) return false;
  await db
    .update(rateLimits)
    .set({ count: row.count + 1 })
    .where(eq(rateLimits.key, key));
  return true;
}
