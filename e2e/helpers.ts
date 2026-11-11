import { expect, type Browser, type Page } from "@playwright/test";

/** Cada "celular" é um contexto isolado, com o próprio cookie. */
export async function newPhone(browser: Browser): Promise<Page> {
  const context = await browser.newContext();
  return context.newPage();
}

export async function createGroup(
  page: Page,
  options: { name: string; organizer?: string; mode?: string; themed?: boolean },
): Promise<string> {
  await page.goto("/criar");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Nome do grupo").fill(options.name);
  if (options.organizer) await page.getByLabel("Seu nome").fill(options.organizer);
  await page.getByRole("button", { name: "Continuar" }).click();
  if (options.mode) await page.getByText(options.mode, { exact: true }).click();
  if (options.themed) await page.getByText("Sortear também um tema de presente").click();
  await page.getByRole("button", { name: "Criar grupo" }).click();
  await page.waitForURL(/\/g\/[^/]+\/admin$/);
  return new URL(page.url()).pathname.split("/")[2];
}

export async function addPeople(admin: Page, names: string[]) {
  await admin.getByLabel("Incluir pessoas").fill(names.join("\n"));
  await admin.getByRole("button", { name: "Incluir", exact: true }).first().click();
  for (const name of names) {
    await expect(admin.getByText(name, { exact: true }).first()).toBeVisible();
  }
}

/** Lê o link pessoal de alguém a partir do botão de WhatsApp do painel. */
export async function personalLink(admin: Page, name: string): Promise<string> {
  const href = await admin
    .getByRole("link", { name: new RegExp(`(Mandar link|Cutucar) para ${name}$`) })
    .getAttribute("href");
  const match = decodeURIComponent(href ?? "").match(/\/k\/p[\w-]+/);
  if (!match) throw new Error(`Link pessoal de ${name} não encontrado`);
  return match[0];
}

export async function draw(admin: Page) {
  await admin.getByRole("button", { name: "Sortear agora" }).click();
  await expect(admin.getByRole("heading", { name: "Sorteio feito" })).toBeVisible();
}

/** Rompe o lacre pelo teclado e devolve o que está escrito no papelzinho. */
export async function openSlip(page: Page, slug: string): Promise<string> {
  await page.goto(`/g/${slug}/revelar`);
  const seal = page.locator("button.seal");
  const written = page.locator(".written");
  // A tecla pode chegar antes de a página hidratar; tenta de novo até abrir.
  await expect(async () => {
    if (!(await written.isVisible())) await seal.press("Enter");
    await expect(written).toBeVisible({ timeout: 2000 });
  }).toPass();
  return (await written.innerText()).trim();
}
