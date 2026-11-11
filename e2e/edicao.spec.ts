import { expect, test, type Page } from "@playwright/test";
import { addPeople, claimPhone, createGroup, draw, newPhone, openSlip, testEmail } from "./helpers";

test("próxima edição leva as contas, não repete os pares, e o grupo pode ser excluído", async ({
  browser,
}) => {
  const admin = await newPhone(browser, testEmail("org"));
  const names = ["Olga", "Paulo", "Quitéria"];
  const slug = await createGroup(admin, { name: "Edição Um" });
  await addPeople(admin, names);
  const phones: Record<string, Page> = {};
  for (const name of names) phones[name] = await claimPhone(browser, admin, name);
  await admin.reload();
  await draw(admin);
  const first: Record<string, string> = {};
  for (const name of names) first[name] = await openSlip(phones[name], slug);

  // Nova edição: mesmas pessoas, grupo novo, pares anteriores viram restrição leve.
  await admin.getByText("Nova edição e exclusão").click();
  await admin.getByRole("button", { name: "Criar próxima edição" }).click();
  await admin.waitForURL((url) => /\/admin$/.test(url.pathname) && !url.pathname.includes(slug));
  const nextSlug = new URL(admin.url()).pathname.split("/")[2];
  for (const name of names) {
    await expect(admin.getByText(name, { exact: true }).first()).toBeVisible();
  }
  await expect(admin.getByText("par da edição passada").first()).toBeVisible();
  // As contas vieram junto: ninguém precisa de convite de novo.
  await expect(admin.getByRole("link", { name: /^Mandar convite/ })).toHaveCount(0);

  await draw(admin);
  const second: Record<string, string> = {};
  for (const name of names) second[name] = await openSlip(phones[name], nextSlug);
  expect(Object.values(second).sort()).toEqual([...names].sort());
  for (const name of names) {
    expect(second[name]).not.toBe(name);
    expect(second[name]).not.toBe(first[name]);
  }

  // As duas edições aparecem na conta de quem participa.
  await phones.Olga.goto("/");
  await expect(phones.Olga.getByRole("link", { name: /Edição Um/ })).toHaveCount(2);

  // A edição antiga continua lá, intacta.
  await admin.goto(`/g/${slug}/admin`);
  await expect(admin.getByRole("heading", { name: "Sorteio feito" })).toBeVisible();

  // Só quem organiza entra no painel.
  await phones.Paulo.goto(`/g/${slug}/admin`);
  await expect(phones.Paulo.getByRole("heading", { name: "Oi, Paulo" })).toBeVisible();

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
