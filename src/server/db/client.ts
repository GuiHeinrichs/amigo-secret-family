import "server-only";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

/**
 * Em produção usa Postgres de verdade (DATABASE_URL, ex.: Neon).
 * Sem DATABASE_URL, sobe um Postgres embutido (PGlite) em `.data/pglite`
 * e aplica as migrações sozinho — nada para instalar no dev local.
 * Os dois drivers expõem a mesma API de consulta do Drizzle.
 */
export type Db = PgliteDatabase<typeof schema>;

const store = globalThis as unknown as { __lacoDb?: Promise<Db> };

async function create(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url, max: 5 });
    return drizzle(pool, { schema }) as unknown as Db;
  }
  if (process.env.VERCEL) {
    throw new Error("DATABASE_URL não está configurada neste ambiente.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir =
    process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  if (!dir.startsWith("memory://")) await mkdir(dir, { recursive: true });
  const db = drizzle(new PGlite(dir), { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

export function getDb(): Promise<Db> {
  if (!store.__lacoDb) {
    store.__lacoDb = create().catch((error) => {
      store.__lacoDb = undefined;
      throw error;
    });
  }
  return store.__lacoDb;
}

export { schema };
