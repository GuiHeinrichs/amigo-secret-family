import { expect, test, type Page } from "@playwright/test";
import {
  addPeople,
  claimPhone,
  createGroup,
  draw,
  newPhone,
  openSlip,
  personalInvite,
  switchTo,
  testEmail,
} from "./helpers";

test("fluxo clássico com contas: convite, dependente, sorteio, lacre, chat, lista e festa", async ({
  browser,
}) => {
  const anaEmail = testEmail("ana");
  const ana = await newPhone(browser, anaEmail);

  // Criar grupo exige conta.
  const anonimo = await (await browser.newContext()).newPage();
  await anonimo.goto("/criar");
  await expect(anonimo.getByRole("heading", { name: "Entre na sua conta" })).toBeVisible();

  const slug = await createGroup(ana, {
    name: "Natal de Teste",
    organizer: "Ana",
    themed: true,
  });

  // Bia e Caio são incluídos por quem organiza e assumem o nome pelo convite pessoal.
  await addPeople(ana, ["Bia", "Caio"]);
  const biaInvite = await personalInvite(ana, "Bia");
  const phones: Record<string, Page> = { Ana: ana };
  phones.Bia = await claimPhone(browser, ana, "Bia");
  phones.Caio = await claimPhone(browser, ana, "Caio");

  // Duda entra pelo convite do grupo e inclui o filho, que não tem e-mail.
  phones.Duda = await newPhone(browser, testEmail("duda"));
  await phones.Duda.goto(`/g/${slug}`);
  await phones.Duda.getByLabel("Como a turma chama você?").fill("Duda");
  await phones.Duda.getByRole("button", { name: "Entrar no sorteio" }).click();
  await expect(phones.Duda.getByRole("heading", { name: "Oi, Duda" })).toBeVisible();
  await phones.Duda.getByLabel("Nome da pessoa").fill("Pedrinho");
  await phones.Duda.getByRole("button", { name: "Incluir", exact: true }).click();
  await expect(phones.Duda.getByText("Pedrinho entrou no sorteio")).toBeVisible();
  phones.Pedrinho = phones.Duda;

  // Lista e perfil da Duda: cada salvamento mostra um aviso de sucesso.
  const duda = phones.Duda;
  const sections = duda.getByRole("navigation", { name: "Seções do grupo" });
  const toast = duda.getByRole("status");
  await sections.getByRole("link", { name: "Minha lista" }).click();
  await expect(duda.getByRole("heading", { name: "Lista de desejos de Duda" })).toBeVisible();
  await duda.getByLabel("Novo item").fill("Livro de receitas");
  await duda.getByRole("button", { name: "Incluir na lista" }).click();
  await expect(toast.filter({ hasText: "entrou na lista" })).toBeVisible();
  await duda.getByLabel("Tamanhos").fill("Camiseta M, calçado 37");
  await duda.getByLabel("Gosto de", { exact: true }).fill("Café e plantas");
  await duda.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(toast.filter({ hasText: "Perfil salvo." })).toBeVisible();

  // O botão de voltar leva ao nível de cima.
  await duda.getByRole("link", { name: "Voltar para Natal de Teste" }).click();
  await expect(duda.getByRole("heading", { name: "Oi, Duda" })).toBeVisible();

  // Trocando para o filho pela própria navegação do app (sem recarregar a
  // página), a lista dele abre vazia, sem os dados da mãe.
  await duda
    .getByRole("group", { name: "Perfis desta conta no grupo" })
    .getByRole("button", { name: "Pedrinho" })
    .click();
  // Durante a troca a página dá lugar a um esqueleto; ao terminar, um aviso confirma.
  await expect(duda.getByText("Trocando para Pedrinho…")).toBeVisible();
  await expect(duda.getByRole("heading", { name: "Oi, Duda" })).toBeHidden();
  await expect(duda.getByRole("heading", { name: "Oi, Pedrinho" })).toBeVisible();
  await expect(duda.getByText("Trocando para Pedrinho…")).toHaveCount(0);
  await expect(toast.filter({ hasText: "agora você está vendo como Pedrinho" })).toBeVisible();
  await sections.getByRole("link", { name: "Minha lista" }).click();
  await expect(duda.getByRole("heading", { name: "Lista de desejos de Pedrinho" })).toBeVisible();
  await expect(duda.getByRole("heading", { name: "Sobre Pedrinho" })).toBeVisible();
  await expect(duda.getByLabel("Nome no grupo")).toHaveValue("Pedrinho");
  await expect(duda.getByLabel("Tamanhos")).toHaveValue("");
  await expect(duda.getByLabel("Gosto de", { exact: true })).toHaveValue("");
  await expect(duda.getByLabel("Não gosto de")).toHaveValue("");
  await expect(duda.getByText("Livro de receitas")).toHaveCount(0);

  // E voltando para a mãe, os dados dela continuam lá.
  await duda.getByRole("link", { name: "Voltar para Natal de Teste" }).click();
  await duda
    .getByRole("group", { name: "Perfis desta conta no grupo" })
    .getByRole("button", { name: "Duda" })
    .click();
  await expect(duda.getByRole("heading", { name: "Oi, Duda" })).toBeVisible();
  await sections.getByRole("link", { name: "Minha lista" }).click();
  await expect(duda.getByLabel("Tamanhos")).toHaveValue("Camiseta M, calçado 37");
  await expect(duda.getByText("Livro de receitas", { exact: true })).toBeVisible();

  // Sem conta, o convite do grupo pede login; com conta, nome repetido é recusado.
  await anonimo.goto(`/g/${slug}`);
  await expect(anonimo.getByRole("link", { name: "Entrar para participar" })).toBeVisible();
  const intruso = await newPhone(browser, testEmail("intruso"));
  await intruso.goto(`/g/${slug}`);
  await intruso.getByLabel("Como a turma chama você?").fill("duda");
  await intruso.getByRole("button", { name: "Entrar no sorteio" }).click();
  await expect(intruso.getByText("Já tem alguém com esse nome")).toBeVisible();

  // Convite pessoal vale uma vez: outra conta não entra pelo link da Bia.
  await intruso.goto(biaInvite);
  await expect(intruso.getByText("Esse convite já foi usado por outra conta")).toBeVisible();

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

  // Depois do sorteio o convite do grupo não aceita mais ninguém.
  await intruso.goto(`/g/${slug}`);
  await expect(intruso.getByRole("heading", { name: "O sorteio já aconteceu" })).toBeVisible();

  // Cada pessoa rompe o próprio lacre; Duda abre o dela e o do Pedrinho.
  const names = ["Ana", "Bia", "Caio", "Duda", "Pedrinho"];
  const phoneAs = async (name: string) => {
    if (name === "Duda" || name === "Pedrinho") await switchTo(phones.Duda, slug, name);
    return phones[name];
  };
  const pairs: Record<string, string> = {};
  for (const name of names) {
    const phone = await phoneAs(name);
    pairs[name] = await openSlip(phone, slug);
    await expect(phone.getByText("Lacre rompido agora")).toBeVisible();
    await expect(phone.getByText("Tema do presente:")).toBeVisible();
  }
  expect(Object.values(pairs).sort()).toEqual([...names].sort());
  for (const name of names) expect(pairs[name]).not.toBe(name);
  expect(pairs.Ana).not.toBe("Bia");
  expect(pairs.Bia).not.toBe("Ana");
  // Mãe e filho na mesma conta não se tiram: um veria o par do outro.
  expect(pairs.Duda).not.toBe("Pedrinho");
  expect(pairs.Pedrinho).not.toBe("Duda");

  // Reabrir mostra quando o lacre foi rompido pela primeira vez.
  await ana.goto(`/g/${slug}/revelar`);
  await expect(ana.getByText("Você já abriu este papelzinho")).toBeVisible();
  await ana.locator("button.seal").click();
  await expect(ana.getByText("foi aberto pela primeira vez em")).toBeVisible();

  // A conta acompanha a pessoa: outro aparelho com o mesmo e-mail já vê o grupo e o amigo.
  const anaTablet = await newPhone(browser, anaEmail);
  await expect(anaTablet.getByRole("link", { name: /Natal de Teste/ })).toBeVisible();
  await anaTablet.goto(`/g/${slug}/amigo`);
  await expect(anaTablet.getByRole("heading", { name: pairs.Ana, exact: true })).toBeVisible();
  await anaTablet.context().close();

  // Lista de desejos: quem Ana tirou escreve, Ana vê.
  const friend = pairs.Ana;
  const friendPhone = await phoneAs(friend);
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
  const biaGiver = names.find((n) => pairs[n] === "Bia")!;
  await phones.Bia.getByLabel("Quem tirou você?").selectOption({ label: biaGiver });
  await phones.Bia.getByRole("button", { name: "Guardar palpite" }).click();
  await expect(phones.Bia.getByText("Palpite guardado")).toBeVisible();

  await ana.goto(`/g/${slug}/festa`);
  await ana.getByRole("button", { name: "Começar a festa" }).click();
  await expect(ana.getByRole("heading", { name: "Hora dos palpites" })).toBeVisible();
  await expect(ana.getByText("1 de 5 pessoas já palpitaram")).toBeVisible();
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

  // Sair da conta tira o acesso ao grupo neste aparelho.
  await phones.Caio.goto("/");
  await phones.Caio.getByRole("button", { name: "Abrir menu" }).click();
  await phones.Caio.getByRole("button", { name: "Sair da conta" }).click();
  await phones.Caio.getByRole("button", { name: "Abrir menu" }).click();
  await expect(
    phones.Caio.getByRole("dialog", { name: "Menu" }).getByRole("link", { name: "Entrar" }),
  ).toBeVisible();
  await phones.Caio.goto(`/g/${slug}/amigo`);
  await expect(phones.Caio.getByRole("heading", { name: "O sorteio já aconteceu" })).toBeVisible();
});

test("quem organiza cuida de quem não tem e-mail", async ({ browser }) => {
  const admin = await newPhone(browser, testEmail("org"));
  const slug = await createGroup(admin, {
    name: "Com a vó",
    organizer: "Rita",
    date: "24122026",
    time: "2030",
  });

  // Data e hora digitadas no formato brasileiro chegam certas ao grupo.
  await admin.goto(`/g/${slug}`);
  await expect(admin.getByText("quinta-feira, 24 de dezembro, às 20h30")).toBeVisible();
  // No painel, os campos voltam preenchidos e o calendário troca o dia.
  await admin.goto(`/g/${slug}/admin`);
  await admin.getByText("Detalhes do grupo").click();
  await expect(admin.getByLabel("Dia da troca", { exact: true })).toHaveValue("24/12/2026");
  await expect(admin.getByLabel("Hora", { exact: true })).toHaveValue("20:30");
  await admin.getByRole("button", { name: /^Abrir calendário/ }).click();
  await admin.getByRole("button", { name: "sexta-feira, 25 de dezembro de 2026" }).click();
  await admin.getByRole("button", { name: /^Abrir seletor de hora/ }).click();
  await admin.getByRole("button", { name: "21 horas", exact: true }).click();
  await admin.getByRole("button", { name: "0 minutos", exact: true }).click();
  await admin.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(admin.getByText("Alterações salvas.")).toBeVisible();

  // A trilha leva de volta ao grupo e ao início.
  const trail = admin.getByRole("navigation", { name: "Você está em" });
  await trail.getByRole("link", { name: "Com a vó" }).click();
  await expect(admin.getByText("sexta-feira, 25 de dezembro, às 21h")).toBeVisible();
  await admin.goto(`/g/${slug}/admin`);

  await addPeople(admin, ["Vó Lourdes", "Saulo"]);
  await claimPhone(browser, admin, "Saulo");

  await admin.reload();
  await admin.getByRole("button", { name: "Cuidar eu mesmo de Vó Lourdes" }).click();
  await expect(admin.getByText("Vó Lourdes agora está na sua conta")).toBeVisible();
  await draw(admin);

  await switchTo(admin, slug, "Vó Lourdes");
  const grandma = await openSlip(admin, slug);
  await switchTo(admin, slug, "Rita");
  const mine = await openSlip(admin, slug);
  // Com 3 pessoas não há como evitar que Rita e a vó se cruzem; o sorteio acontece mesmo assim.
  expect(["Rita", "Saulo"]).toContain(grandma);
  expect(["Vó Lourdes", "Saulo"]).toContain(mine);
});

test("alguém sai depois do sorteio e só uma pessoa muda de amigo", async ({ browser }) => {
  const admin = await newPhone(browser, testEmail("org"));
  const slug = await createGroup(admin, { name: "Saída sem refazer" });
  const names = ["Eva", "Fábio", "Gil", "Hugo", "Iara"];
  await addPeople(admin, names);

  const phones: Record<string, Page> = {};
  for (const name of names) phones[name] = await claimPhone(browser, admin, name);
  await admin.reload();
  await draw(admin);

  const pairs: Record<string, string> = {};
  for (const name of names) pairs[name] = await openSlip(phones[name], slug);

  const leaving = "Gil";
  const heir = names.find((n) => pairs[n] === leaving)!;
  await admin.getByRole("button", { name: `Tirar ${leaving} do grupo` }).click();
  await admin.getByRole("button", { name: `Tirar ${leaving}?` }).click();
  await expect(admin.getByText(`Só ${heir} mudou de amigo`)).toBeVisible();

  for (const name of names.filter((n) => n !== leaving)) {
    const now = await openSlip(phones[name], slug);
    expect(now).toBe(name === heir ? pairs[leaving] : pairs[name]);
  }
  await phones[heir].goto(`/g/${slug}`);
  await expect(phones[heir].getByRole("heading", { name: "Você já sabe quem tirou" })).toBeVisible();

  // Quem saiu perde o acesso, mesmo logado.
  await phones[leaving].goto(`/g/${slug}/amigo`);
  await expect(phones[leaving].getByRole("heading", { name: "O sorteio já aconteceu" })).toBeVisible();
});
