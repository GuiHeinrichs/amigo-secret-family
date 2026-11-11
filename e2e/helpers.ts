import { expect, type Browser, type Page } from "@playwright/test";

const run = Date.now().toString(36);
let counter = 0;

/** E-mail único por execução, para os testes não esbarrarem em contas antigas. */
export function testEmail(label: string): string {
  counter += 1;
  return `${label.toLowerCase().replace(/[^a-z]/g, "")}.${run}.${counter}@teste.local`;
}

/** Entra com e-mail + código. Sem envio de e-mail configurado, o dev mostra o código na tela. */
export async function login(page: Page, email: string) {
  await page.goto("/entrar");
  await page.getByLabel("Seu e-mail").fill(email);
  await page.getByRole("button", { name: "Receber código" }).click();
  const code = (await page.getByTestId("dev-code").innerText()).trim();
  await page.getByLabel("Código de 6 dígitos").fill(code);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.waitForURL((url) => url.pathname === "/");
}

/** Cada "celular" é um contexto isolado, já logado na conta de `email`. */
export async function newPhone(browser: Browser, email: string): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await login(page, email);
  return page;
}

export async function createGroup(
  page: Page,
  options: {
    name: string;
    organizer?: string;
    mode?: string;
    themed?: boolean;
    /** Só os números, como a pessoa digitaria: "24122026" e "2030". */
    date?: string;
    time?: string;
  },
): Promise<string> {
  await page.goto("/criar");
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Nome do grupo").fill(options.name);
  await page.getByLabel("Seu nome").fill(options.organizer ?? "");
  if (options.date) await page.getByLabel("Dia da troca", { exact: true }).fill(options.date);
  if (options.time) await page.getByLabel("Hora", { exact: true }).fill(options.time);
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

/** Lê o convite pessoal de alguém a partir do botão de WhatsApp do painel. */
export async function personalInvite(admin: Page, name: string): Promise<string> {
  const href = await admin
    .getByRole("link", { name: `Mandar convite para ${name}`, exact: true })
    .getAttribute("href");
  const match = decodeURIComponent(href ?? "").match(/\/k\/p[\w-]+/);
  if (!match) throw new Error(`Convite pessoal de ${name} não encontrado`);
  return match[0];
}

/** Um celular novo, logado, que assume o nome incluído por quem organiza. */
export async function claimPhone(browser: Browser, admin: Page, name: string): Promise<Page> {
  const invite = await personalInvite(admin, name);
  const phone = await newPhone(browser, testEmail(name));
  await phone.goto(invite);
  await expect(phone.getByRole("heading", { name: `Oi, ${name}` })).toBeVisible();
  return phone;
}

export async function draw(admin: Page) {
  await admin.getByRole("button", { name: "Sortear agora" }).click();
  await expect(admin.getByRole("heading", { name: "Sorteio feito" })).toBeVisible();
}

/** Na conta que cuida de mais de uma pessoa, põe o perfil `name` na tela. */
export async function switchTo(page: Page, slug: string, name: string) {
  await page.goto(`/g/${slug}`);
  await page
    .getByRole("group", { name: "Perfis desta conta no grupo" })
    .getByRole("button", { name })
    .click();
  await expect(page.getByRole("heading", { name: `Oi, ${name}` })).toBeVisible();
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
