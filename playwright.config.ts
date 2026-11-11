import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);

// Os testes criam dezenas de contas e grupos de mentira e dependem de o login
// mostrar o código na tela. Com um banco de verdade no .env.local eles
// sujariam esse banco, então a suíte se recusa a rodar.
if (
  !process.env.E2E_ALLOW_REAL_DB &&
  existsSync(".env.local") &&
  /^DATABASE_URL=.+/m.test(readFileSync(".env.local", "utf8"))
) {
  throw new Error(
    "O .env.local aponta para um banco de verdade (DATABASE_URL). Os testes ponta a ponta " +
      "gravariam dados de teste nele. Comente DATABASE_URL e RESEND_API_KEY no .env.local, " +
      "reinicie o servidor de desenvolvimento e rode de novo.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Pixel 7"],
    locale: "pt-BR",
  },
  // Reaproveita o `npm run dev` que já estiver aberto; senão, sobe um.
  webServer: {
    command: "npm run dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
