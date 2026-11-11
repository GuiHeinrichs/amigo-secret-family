import { expect, test, type Page } from "@playwright/test";
import { addPeople, createGroup, draw, newPhone, openSlip, personalLink } from "./helpers";

async function openAll(browser: Parameters<typeof newPhone>[0], admin: Page, slug: string, names: string[]) {
  const pairs: Record<string, string> = {};
  for (const name of names) {
    const phone = await newPhone(browser);
    await phone.goto(await personalLink(admin, name));
    pairs[name] = await openSlip(phone, slug);
    await phone.context().close();
  }
  return pairs;
}

test("próxima edição não repete os pares e o grupo pode ser excluído", async ({ browser }) => {
  const admin = await newPhone(browser);
  const names = ["Olga", "Paulo", "Quitéria"];
  const slug = await createGroup(admin, { name: "Edição Um" });
  await addPeople(admin, names);
  await draw(admin);
  const first = await openAll(browser, admin, slug, names);

  // Nova edição: mesmas pessoas, grupo novo, pares anteriores viram restrição leve.
  await admin.getByText("Nova edição e exclusão").click();
  await admin.getByRole("button", { name: "Criar próxima edição" }).click();
  await admin.waitForURL((url) => /\/admin$/.test(url.pathname) && !url.pathname.includes(slug));
  const nextSlug = new URL(admin.url()).pathname.split("/")[2];
  for (const name of names) {
    await expect(admin.getByText(name, { exact: true }).first()).toBeVisible();
  }
  await expect(admin.getByText("par da edição passada").first()).toBeVisible();

  await draw(admin);
  const second = await openAll(browser, admin, nextSlug, names);
  expect(Object.values(second).sort()).toEqual([...names].sort());
  for (const name of names) {
    expect(second[name]).not.toBe(name);
    expect(second[name]).not.toBe(first[name]);
  }

  // A edição antiga continua lá, intacta.
  await admin.goto(`/g/${slug}/admin`);
  await expect(admin.getByRole("heading", { name: "Sorteio feito" })).toBeVisible();

  // Excluir pede o nome do grupo.
  await admin.getByText("Nova edição e exclusão").click();
  await admin.getByRole("button", { name: "Excluir grupo" }).click();
  await expect(admin.getByText("Digite o nome do grupo exatamente")).toBeVisible();
  await admin.getByLabel(/para confirmar$/).fill("Edição Um");
  await admin.getByRole("button", { name: "Excluir grupo" }).click();
  await admin.waitForURL((url) => url.pathname === "/");
  await admin.goto(`/g/${slug}`);
  await expect(admin.getByRole("heading", { name: "Esta página não existe" })).toBeVisible();
});
