import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

/*
 * Os testes criam dezenas de contas e grupos de mentira e dependem de o login
 * mostrar o código na tela. Por isso rodam sempre num servidor próprio, com
 * banco embutido (PGlite) zerado a cada execução e sem nenhum serviço externo,
 * mesmo que o .env.local aponte para o banco e o e-mail de verdade: variáveis
 * definidas aqui, ainda que vazias, têm prioridade sobre as do .env.local.
 */
export default defineConfig({
  testDir: "./e2e",
  // O fluxo completo passa por dezenas de páginas, e a primeira compilação de cada uma é lenta.
  timeout: 300_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices["Pixel 7"],
    locale: "pt-BR",
  },
  webServer: {
    command: `node scripts/e2e-server.mjs ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      DATABASE_URL: "",
      RESEND_API_KEY: "",
      EMAIL_FROM: "",
      GOOGLE_CLIENT_ID: "",
      GOOGLE_CLIENT_SECRET: "",
      NEXT_DIST_DIR: ".next-e2e",
      PGLITE_DIR: ".data/e2e",
    },
  },
});
