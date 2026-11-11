import { expect, test, type Page } from "@playwright/test";
import { addPeople, createGroup, draw, newPhone, openSlip, personalLink } from "./helpers";

test("fluxo clássico: convite, sorteio, lacre, chat anônimo, lista e festa", async ({ browser }) => {
  const ana = await newPhone(browser);
  const slug = await createGroup(ana, {
    name: "Natal de Teste",
    organizer: "Ana",
    themed: true,
  });

  // Bia e Caio são incluídos por quem organiza; Duda entra pelo convite.
  await addPeople(ana, ["Bia", "Caio"]);
  const phones: Record<string, Page> = { Ana: ana };
  for (const name of ["Bia", "Caio"]) {
    const link = await personalLink(ana, name);
    phones[name] = await newPhone(browser);
    await phones[name].goto(link);
    await expect(phones[name].getByRole("heading", { name: `Oi, ${name}` })).toBeVisible();
  }
  phones.Duda = await newPhone(browser);
  await phones.Duda.goto(`/g/${slug}`);
  await phones.Duda.getByLabel("Como a turma chama você?").fill("Duda");
  await phones.Duda.getByRole("button", { name: "Entrar no sorteio" }).click();
  await expect(phones.Duda.getByRole("heading", { name: "Oi, Duda" })).toBeVisible();

  // Nome repetido é recusado.
  const intruso = await newPhone(browser);
  await intruso.goto(`/g/${slug}`);
  await intruso.getByLabel("Como a turma chama você?").fill("duda");
  await intruso.getByRole("button", { name: "Entrar no sorteio" }).click();
  await expect(intruso.getByText("Já tem alguém com esse nome")).toBeVisible();

  // Ana e Bia são um casal: não podem se tirar.
  await ana.reload();
  await ana.getByLabel("Esta pessoa").selectOption({ label: "Ana" });
  await ana.getByLabel("não tira").selectOption({ label: "Bia" });
  await ana.getByRole("button", { name: "Adicionar restrição" }).click();
  await expect(ana.getByText("não tira").nth(1)).toBeVisible();

  await draw(ana);

  // Quem organiza não recebe par nenhum, nem pela API do telão.
  const before = await (await ana.request.get(`/api/g/${slug}/festa`)).json();
  expect(before.revealed).toEqual([]);
  expect(before.receiverId).toBeNull();
  expect(before.score).toBeNull();
  expect(JSON.stringify(before)).not.toContain("giverId");

  // Depois do sorteio o convite não aceita mais ninguém.
  await intruso.goto(`/g/${slug}`);
  await expect(intruso.getByRole("heading", { name: "O sorteio já aconteceu" })).toBeVisible();

  // Cada pessoa rompe o próprio lacre.
  const names = Object.keys(phones);
  const pairs: Record<string, string> = {};
  for (const name of names) {
    pairs[name] = await openSlip(phones[name], slug);
    await expect(phones[name].getByText("Lacre rompido agora")).toBeVisible();
    await expect(phones[name].getByText("Tema do presente:")).toBeVisible();
  }
  expect(Object.values(pairs).sort()).toEqual([...names].sort());
  for (const name of names) expect(pairs[name]).not.toBe(name);
  expect(pairs.Ana).not.toBe("Bia");
  expect(pairs.Bia).not.toBe("Ana");

  // Reabrir mostra quando o lacre foi rompido pela primeira vez.
  await ana.goto(`/g/${slug}/revelar`);
  await expect(ana.getByText("Você já abriu este papelzinho")).toBeVisible();
  await ana.locator("button.seal").click();
  await expect(ana.getByText("foi aberto pela primeira vez em")).toBeVisible();

  // Lista de desejos: quem Ana tirou escreve, Ana vê.
  const friend = pairs.Ana;
  const friendPhone = phones[friend];
  await friendPhone.goto(`/g/${slug}/lista`);
  await friendPhone.getByLabel("Novo item").fill("Caneca gigante");
  await friendPhone.getByRole("button", { name: "Incluir na lista" }).click();
  await expect(friendPhone.getByText("Caneca gigante", { exact: true })).toBeVisible();
  await ana.goto(`/g/${slug}/amigo`);
  await expect(ana.getByRole("heading", { name: friend, exact: true })).toBeVisible();
  await expect(ana.getByText("Caneca gigante")).toBeVisible();

  // Dicas para a festa.
  await ana.getByLabel(`Dicas sobre ${friend}`).fill("Faz o melhor pudim da família.");
  await ana.getByRole("button", { name: "Guardar dicas" }).click();
  await expect(ana.getByText("Dicas guardadas")).toBeVisible();

  // Chat anônimo: Ana pergunta; do outro lado o nome dela não aparece.
  await ana.goto(`/g/${slug}/chat/amigo`);
  await ana.getByLabel("Sua mensagem").fill("Qual é o seu número de calçado?");
  await ana.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(ana.getByRole("listitem").getByText("Qual é o seu número de calçado?")).toBeVisible();

  await friendPhone.goto(`/g/${slug}/chat`);
  await expect(friendPhone.getByText("1 nova")).toBeVisible();
  await friendPhone.goto(`/g/${slug}/chat/misterio`);
  await expect(
    friendPhone.getByRole("listitem").getByText("Qual é o seu número de calçado?"),
  ).toBeVisible();
  await expect(friendPhone.locator("main")).not.toContainText("Ana");
  const thread = await (await friendPhone.request.get(`/api/g/${slug}/chat?lado=misterio`)).json();
  expect(thread.peer).toBeNull();
  expect(Object.keys(thread.messages[0]).sort()).toEqual(["at", "body", "id", "mine"]);

  await friendPhone.getByLabel("Sua mensagem").fill("Calço 38!");
  await friendPhone.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(ana.getByRole("listitem").getByText("Calço 38!")).toBeVisible();

  // Festa: palpites, revelação em cadeia e placar.
  await phones.Bia.goto(`/g/${slug}/festa`);
  const bidGiver = names.find((n) => pairs[n] === "Bia")!;
  await phones.Bia.getByLabel("Quem tirou você?").selectOption({ label: bidGiver });
  await phones.Bia.getByRole("button", { name: "Guardar palpite" }).click();
  await expect(phones.Bia.getByText("Palpite guardado")).toBeVisible();

  await ana.goto(`/g/${slug}/festa`);
  await ana.getByRole("button", { name: "Começar a festa" }).click();
  await expect(ana.getByRole("heading", { name: "Hora dos palpites" })).toBeVisible();
  await expect(ana.getByText("1 de 4 pessoas já palpitaram")).toBeVisible();
  await ana.getByRole("button", { name: "Começar a revelação" }).click();

  for (let i = 0; i < names.length; i++) {
    const heading = ana.getByRole("heading", { name: /entrega o presente$/ });
    await expect(heading).toBeVisible();
    const giver = (await heading.innerText()).replace(" entrega o presente", "").trim();
    if (giver === "Ana") await expect(ana.getByText("Faz o melhor pudim da família.")).toBeVisible();
    await ana.getByRole("button", { name: "Revelar" }).click();
    await expect(ana.locator(".slip .hand")).toHaveText(pairs[giver]);
    await ana.getByRole("button", { name: /^(Passar a vez|Ver o placar)/ }).click();
    if (i < names.length - 1) {
      await expect(ana.getByRole("heading", { name: `${giver} entrega o presente` })).toBeHidden();
    }
  }

  await expect(ana.getByRole("heading", { name: "Placar dos palpites" })).toBeVisible();
  await expect(ana.getByText("1 detetive da noite: Bia.")).toBeVisible();
  // O celular da Bia acompanha o telão sozinho.
  await expect(phones.Bia.getByRole("heading", { name: "Placar dos palpites" })).toBeVisible();
});

test("alguém sai depois do sorteio e só uma pessoa muda de amigo", async ({ browser }) => {
  const admin = await newPhone(browser);
  const slug = await createGroup(admin, { name: "Saída sem refazer" });
  const names = ["Eva", "Fábio", "Gil", "Hugo", "Iara"];
  await addPeople(admin, names);

  const phones: Record<string, Page> = {};
  for (const name of names) {
    phones[name] = await newPhone(browser);
    await phones[name].goto(await personalLink(admin, name));
  }
  await draw(admin);

  const pairs: Record<string, string> = {};
  for (const name of names) pairs[name] = await openSlip(phones[name], slug);

  const leaving = "Gil";
  const heir = names.find((n) => pairs[n] === leaving)!;
  const remove = admin.getByRole("button", { name: `Tirar ${leaving} do grupo` });
  await remove.click();
  await admin.getByRole("button", { name: `Tirar ${leaving}?` }).click();
  await expect(admin.getByText(`Só ${heir} mudou de amigo`)).toBeVisible();

  for (const name of names.filter((n) => n !== leaving)) {
    const now = await openSlip(phones[name], slug);
    expect(now).toBe(name === heir ? pairs[leaving] : pairs[name]);
  }
  // Quem herdou tem um lacre novo; os outros já tinham aberto.
  await phones[heir].goto(`/g/${slug}`);
  await expect(phones[heir].getByRole("heading", { name: "Você já sabe quem tirou" })).toBeVisible();
});
