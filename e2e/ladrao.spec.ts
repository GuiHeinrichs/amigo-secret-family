import { expect, test, type Page } from "@playwright/test";
import { addPeople, createGroup, draw, newPhone, openSlip, personalLink } from "./helpers";

test("amigo ladrão: fila, abrir, roubar, trancar e fim de jogo", async ({ browser }) => {
  const admin = await newPhone(browser);
  const slug = await createGroup(admin, { name: "Ladrão de Teste", mode: "Amigo Ladrão" });
  const names = ["Lia", "Max", "Nina"];
  await addPeople(admin, names);

  const phones: Record<string, Page> = {};
  for (const name of names) {
    phones[name] = await newPhone(browser);
    await phones[name].goto(await personalLink(admin, name));
  }
  await draw(admin);

  // Cada um vê a própria posição; juntas formam 1º, 2º e 3º.
  const position: Record<string, string> = {};
  for (const name of names) position[name] = await openSlip(phones[name], slug);
  expect(Object.values(position).sort()).toEqual(["1º", "2º", "3º"]);
  const order = [...names].sort((a, b) => position[a].localeCompare(position[b]));
  const [first, second, third] = order;

  await admin.goto(`/g/${slug}/festa`);
  await admin.getByRole("button", { name: "Começar o jogo" }).click();
  await expect(admin.getByRole("heading", { name: `Vez de ${first}` })).toBeVisible();

  // Fora da vez não aparece nenhum botão de jogada.
  await phones[second].goto(`/g/${slug}/festa`);
  await expect(phones[second].getByRole("heading", { name: `Vez de ${first}` })).toBeVisible();
  await expect(phones[second].getByRole("button", { name: /^Abrir/ })).toHaveCount(0);

  // 1º abre o presente 1 e diz o que é.
  const p1 = phones[first];
  await p1.goto(`/g/${slug}/festa`);
  await expect(p1.getByRole("heading", { name: "É a sua vez" })).toBeVisible();
  await p1.getByRole("button", { name: "Abrir o presente 1" }).click();
  await p1.getByRole("button", { name: "dizer o que é" }).click();
  await p1.getByLabel("O que é o presente 1").fill("Caneca do Flamengo");
  await p1.getByLabel("O que é o presente 1").press("Enter");
  await expect(p1.getByText("Caneca do Flamengo")).toBeVisible();

  // 2º rouba o presente 1; o 1º joga de novo e não pode roubar de volta.
  const p2 = phones[second];
  await expect(p2.getByRole("heading", { name: "É a sua vez" })).toBeVisible();
  await p2.getByRole("button", { name: `Roubar o presente 1 de ${first}` }).click();
  await expect(p1.getByRole("heading", { name: "É a sua vez" })).toBeVisible();
  await expect(p1.getByText("Você foi roubado")).toBeVisible();
  await expect(p1.getByRole("button", { name: /^Roubar/ })).toHaveCount(0);
  await p1.getByRole("button", { name: "Abrir o presente 2" }).click();

  // 3º rouba o presente 1 de novo: com 2 roubos ele tranca.
  const p3 = phones[third];
  await p3.goto(`/g/${slug}/festa`);
  await expect(p3.getByRole("heading", { name: "É a sua vez" })).toBeVisible();
  await p3.getByRole("button", { name: `Roubar o presente 1 de ${second}` }).click();
  await expect(p2.getByRole("heading", { name: "É a sua vez" })).toBeVisible();
  await expect(p2.getByText("Trancado")).toBeVisible();
  await expect(p2.getByRole("button", { name: /^Roubar o presente 1/ })).toHaveCount(0);

  // 2º abre o último presente e o jogo termina.
  await p2.getByRole("button", { name: "Abrir o presente 3" }).click();
  await expect(p2.getByRole("heading", { name: "Fim de jogo" })).toBeVisible();
  await expect(admin.getByRole("heading", { name: "Fim de jogo" })).toBeVisible();

  const final = await (await admin.request.get(`/api/g/${slug}/festa`)).json();
  const holderOf = (n: number) =>
    final.people.find(
      (p: { id: string }) => p.id === final.gifts.find((g: { number: number }) => g.number === n).holderId,
    ).name;
  expect(holderOf(1)).toBe(third);
  expect(holderOf(2)).toBe(first);
  expect(holderOf(3)).toBe(second);
});
