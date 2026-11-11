/**
 * Aplica as migrações em um Postgres de verdade (produção/preview).
 * Uso: DATABASE_URL=postgres://... npm run db:migrate
 * No dev local não é preciso: o PGlite migra sozinho ao subir.
 */
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("Defina DATABASE_URL antes de rodar as migrações.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url, max: 1 });
  await migrate(drizzle(pool), {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  await pool.end();
  console.log("Migrações aplicadas.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
