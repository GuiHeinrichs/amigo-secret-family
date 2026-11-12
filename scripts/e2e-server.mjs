/**
 * Servidor usado só pelos testes ponta a ponta (veja playwright.config.ts).
 * Apaga o banco embutido da execução anterior e sobe o Next em outra porta.
 */
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";

const port = process.argv[2] ?? "3100";

if (process.env.DATABASE_URL) {
  console.error("Recusando subir o servidor de testes: DATABASE_URL está definida.");
  process.exit(1);
}
rmSync(process.env.PGLITE_DIR ?? ".data/e2e", { recursive: true, force: true });

const child = spawn("npx", ["next", "dev", "-p", port], { stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
