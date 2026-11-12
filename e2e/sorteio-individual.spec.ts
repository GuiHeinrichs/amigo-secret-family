import { expect, test, type Page } from "@playwright/test";
import {
  addPeople,
  claimPhone,
  createGroup,
  newPhone,
  openSlip,
  switchTo,
  testEmail,
} from "./helpers";

test("sorteio individual: cada pessoa sorteia o próprio amigo depois que quem organiza libera", async ({
  browser,
}) => {
  const ana = await newPhone(browser, testEmail("ana"));
  const slug = await createGroup(ana, { name: "Chapéu de Teste", organizer: "Ana" });

  // Bia e Caio entram pelo convite pessoal; Edu é incluído mas não entra a tempo.
  await addPeople(ana, ["Bia", "Caio", "Edu"]);
  const phones: Record<string, Page> = { Ana: ana };
  phones.Bia = await claimPhone(browser, ana, "Bia");
  phones.Caio = await claimPhone(browser, ana, "Caio");

  // Duda entra pelo convite do grupo e inclui o filho, que não tem conta.
  phones.Duda = await newPhone(browser, testEmail("duda"));
  await phones.Duda.goto(`/g/${slug}`);
  await phones.Duda.getByLabel("Como a turma chama você?").fill("Duda");
  await phones.Duda.getByRole("button", { name: "Entrar no sorteio" }).click();
  await expect(phones.Duda.getByRole("heading", { name: "Oi, Duda" })).toBeVisible();
  await phones.Duda.getByLabel("Nome da pessoa").fill("Pedrinho");
  await phones.Duda.getByRole("button", { name: "Incluir", exact: true }).click();
  await expect(phones.Duda.getByText("Pedrinho entrou no sorteio")).toBeVisible();
  phones.Pedrinho = phones.Duda;

  // Quem organiza escolhe entre sortear tudo e liberar para cada um.
  await ana.goto(`/g/${slug}/admin`);
  await expect(ana.getByRole("button", { name: "Sortear tudo agora" })).toBeVisible();
  await ana.getByRole("button", { name: "Liberar para cada um sortear" }).click();
  await expect(ana.getByRole("heading", { name: "Sorteio aberto" })).toBeVisible();
  await expect(ana.getByText("0 de 6 pessoas já sortearam.")).toBeVisible();

  // Com o sorteio liberado, o convite do grupo não aceita mais ninguém.
  const intruso = await newPhone(browser, testEmail("intruso"));
  await intruso.goto(`/g/${slug}`);
  await expect(intruso.getByRole("heading", { name: "O sorteio já foi liberado" })).toBeVisible();

  const pairs: Record<string, string> = {};
  const phoneAs = async (name: string) => {
    if (name === "Duda" || name === "Pedrinho") await switchTo(phones.Duda, slug, name);
    return phones[name];
  };

  // Bia vê o botão na página do grupo, sorteia e abre num gesto só.
  const bia = phones.Bia;
  await bia.goto(`/g/${slug}`);
  await expect(bia.getByRole("heading", { name: "O sorteio está aberto" })).toBeVisible();
  await bia.getByRole("link", { name: "Sortear meu amigo secreto" }).click();
  await expect(bia.getByRole("heading", { name: "Sortear meu amigo secreto" })).toBeVisible();
  pairs.Bia = await openSlip(bia, slug);
  await expect(bia.getByText("Sorteado agora, só para você")).toBeVisible();

  // Depois de sortear: progresso do grupo, e nada de conversas ou festa ainda.
  await bia.goto(`/g/${slug}`);
  await expect(bia.getByRole("heading", { name: "Você já sorteou" })).toBeVisible();
  await expect(bia.getByText("1 de 6 pessoas já sortearam.")).toBeVisible();
  const biaNav = bia.getByRole("navigation", { name: "Seções do grupo" });
  await expect(biaNav.getByRole("link", { name: "Meu amigo" })).toBeVisible();
  await expect(biaNav.getByRole("link", { name: "Conversas" })).toHaveCount(0);
  await expect(biaNav.getByRole("link", { name: "Festa" })).toHaveCount(0);
  await bia.goto(`/g/${slug}/festa`);
  await expect(bia.getByRole("heading", { name: "Oi, Bia" })).toBeVisible();
  await bia.goto(`/g/${slug}/chat`);
  await expect(bia.getByRole("heading", { name: "Oi, Bia" })).toBeVisible();
  expect((await bia.request.get(`/api/g/${slug}/festa`)).status()).toBe(404);
  expect((await ana.request.get(`/api/g/${slug}/festa`)).status()).toBe(404);

  // Reabrir não sorteia de novo: é o mesmo papelzinho.
  expect(await openSlip(bia, slug)).toBe(pairs.Bia);

  // Caio sorteia; Duda sorteia por ela e, trocando de perfil, pelo filho.
  pairs.Caio = await openSlip(phones.Caio, slug);
  const duda = await phoneAs("Duda");
  await expect(duda.getByRole("link", { name: "Sortear meu amigo secreto" })).toBeVisible();
  pairs.Duda = await openSlip(duda, slug);
  await duda.goto(`/g/${slug}`);
  await expect(duda.getByText("Falta sortear por Pedrinho")).toBeVisible();
  await phoneAs("Pedrinho");
  await expect(
    phones.Duda.getByRole("navigation", { name: "Seções do grupo" }).getByRole("link", {
      name: "Sortear",
    }),
  ).toBeVisible();
  pairs.Pedrinho = await openSlip(phones.Duda, slug);

  // O painel mostra quem falta, sem mostrar par nenhum; a festa ainda não começa.
  await ana.goto(`/g/${slug}/admin`);
  await expect(ana.getByText("4 de 6 pessoas já sortearam. Falta: Ana, Edu.")).toBeVisible();
  await expect(ana.getByRole("link", { name: "Cutucar para Bia" })).toHaveCount(0);

  // A organizadora também sorteia pelo próprio botão.
  await ana.getByRole("link", { name: "Sortear meu amigo secreto" }).click();
  await expect(ana.getByRole("heading", { name: "Sortear meu amigo secreto" })).toBeVisible();
  pairs.Ana = await openSlip(ana, slug);
  await ana.goto(`/g/${slug}/admin`);
  await expect(ana.getByText("5 de 6 pessoas já sortearam. Falta: Edu.")).toBeVisible();

  // Edu não apareceu: a organizadora sorteia por quem falta e o grupo fecha.
  await ana.getByRole("button", { name: "Sortear por quem falta" }).click();
  await ana.getByRole("button", { name: "Sortear por 1 pessoa?" }).click();
  await expect(ana.getByRole("heading", { name: "Sorteio feito" })).toBeVisible();

  // Edu entra depois e encontra o papelzinho lacrado, como no sorteio comum.
  phones.Edu = await claimPhone(browser, ana, "Edu");
  await expect(phones.Edu.getByRole("heading", { name: "Seu papelzinho chegou" })).toBeVisible();
  pairs.Edu = await openSlip(phones.Edu, slug);
  await expect(phones.Edu.getByText("Lacre rompido agora")).toBeVisible();

  // O resultado é um sorteio válido: todo mundo tirou alguém diferente, ninguém a si mesmo.
  const names = ["Ana", "Bia", "Caio", "Edu", "Duda", "Pedrinho"];
  expect(Object.values(pairs).sort()).toEqual([...names].sort());
  for (const name of names) expect(pairs[name]).not.toBe(name);

  // Com o sorteio completo, conversas e festa abrem; quem organiza segue sem ver pares.
  await bia.goto(`/g/${slug}`);
  await expect(biaNav.getByRole("link", { name: "Conversas" })).toBeVisible();
  await expect(biaNav.getByRole("link", { name: "Festa" })).toBeVisible();
  const party = await (await ana.request.get(`/api/g/${slug}/festa`)).json();
  expect(party.revealed).toEqual([]);
  expect(JSON.stringify(party)).not.toContain("giverId");
});

test("sorteio individual: remover alguém devolve o sorteio a quem tinha tirado a pessoa, e cancelar zera tudo", async ({
  browser,
}) => {
  const admin = await newPhone(browser, testEmail("rita"));
  const slug = await createGroup(admin, { name: "Chapéu Pequeno", organizer: "Rita" });
  const others = ["Gil", "Hugo", "Iara"];
  await addPeople(admin, others);
  // Rita cuida de todo mundo na própria conta: dá para sortear por cada perfil.
  for (const name of others) {
    await admin.getByRole("button", { name: `Cuidar eu mesmo de ${name}` }).click();
    await expect(admin.getByText(`${name} agora está na sua conta`)).toBeVisible();
  }

  await admin.getByRole("button", { name: "Liberar para cada um sortear" }).click();
  await expect(admin.getByRole("heading", { name: "Sorteio aberto" })).toBeVisible();

  await switchTo(admin, slug, "Rita");
  const first = await openSlip(admin, slug);

  // Quem Rita tirou desiste: Rita volta a ficar sem par e sorteia de novo.
  await admin.goto(`/g/${slug}/admin`);
  await expect(admin.getByText("1 de 4 pessoas já sortearam.")).toBeVisible();
  await admin.getByRole("button", { name: `Tirar ${first} do grupo` }).click();
  await admin.getByRole("button", { name: `Tirar ${first}?` }).click();
  await expect(
    admin.getByText(`${first} saiu. Rita tinha tirado essa pessoa e vai sortear de novo.`),
  ).toBeVisible();
  await expect(admin.getByText("0 de 3 pessoas já sortearam.")).toBeVisible();

  const rest = ["Rita", ...others.filter((name) => name !== first)];
  const pairs: Record<string, string> = {};
  for (const name of rest) {
    await switchTo(admin, slug, name);
    pairs[name] = await openSlip(admin, slug);
  }
  // Com três pessoas o app nunca deixa a última sobrar com o próprio nome.
  expect(Object.values(pairs).sort()).toEqual([...rest].sort());
  for (const name of rest) expect(pairs[name]).not.toBe(name);

  // A última pessoa sorteando fecha o grupo sozinha.
  await admin.goto(`/g/${slug}/admin`);
  await expect(admin.getByRole("heading", { name: "Sorteio feito" })).toBeVisible();

  // Refazer: desfaz, libera de novo e cancela antes de alguém sortear.
  await admin.locator("summary", { hasText: "Refazer o sorteio" }).click();
  await admin.getByRole("button", { name: "Desfazer o sorteio" }).click();
  await admin.getByRole("button", { name: "Desfazer mesmo?" }).click();
  await expect(admin.getByRole("button", { name: "Liberar para cada um sortear" })).toBeVisible();
  await admin.getByRole("button", { name: "Liberar para cada um sortear" }).click();
  await expect(admin.getByRole("heading", { name: "Sorteio aberto" })).toBeVisible();
  await admin.locator("summary", { hasText: "Cancelar o sorteio" }).click();
  await admin.locator("button", { hasText: "Cancelar o sorteio" }).click();
  await admin.getByRole("button", { name: "Cancelar mesmo?" }).click();
  await expect(admin.getByRole("button", { name: "Sortear tudo agora" })).toBeVisible();
});
