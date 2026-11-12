# Laço — amigo secreto no papelzinho

Web app de amigo secreto para famílias e grupos de amigos. Quem organiza monta o grupo e manda um link no WhatsApp; cada pessoa abre o próprio papelzinho no celular. Para entrar basta a conta Google, sem senha nova.

## O que ele faz

- **Conta sem senha.** A pessoa entra com o Google. O login por e-mail com código de 6 dígitos continua no código e aparece quando há um remetente próprio configurado (`EMAIL_FROM`) ou no desenvolvimento local. Grupos, listas e papelzinhos ficam na conta e aparecem em qualquer aparelho.
- **Crianças e quem não tem e-mail.** Uma conta pode cuidar de várias pessoas no mesmo grupo: o responsável inclui a criança, troca de perfil e abre o papelzinho dela. Quem organiza também pode assumir um nome que incluiu. O sorteio evita, quando dá, que pessoas da mesma conta se tirem.
- **Convites.** Link do grupo (a pessoa entra e escolhe o nome) ou convite pessoal para um nome já incluído, que vale uma única vez.
- **Sorteio com restrições.** "Casal não se tira", pares da edição anterior evitados quando possível, e preferência por um ciclo único para a revelação em cadeia da festa.
- **Lacre.** Nem quem organiza vê os pares. A primeira abertura de cada papelzinho fica registrada: se alguém espiou antes, o dono fica sabendo quando.
- **Lista de desejos e perfil** (tamanhos, gostos), visíveis só para quem tirou a pessoa.
- **Conversa anônima** nos dois sentidos: com quem você tirou e com quem tirou você.
- **Modo festa**: palpites de "quem me tirou?", revelação em cadeia com dicas no telão e placar.
- **Três jeitos de jogar**: Clássico, Amigo da Onça e Amigo Ladrão (abrir ou roubar presentes), além de temas de presente sorteados.
- **Saída sem refazer**: se alguém desiste depois do sorteio, só uma pessoa muda de amigo.
- **Próxima edição**: clona o grupo e evita repetir os pares.
- Amigo secreto tradicional como ocasião principal; Páscoa, festa junina, aniversário e firma continuam disponíveis, cada uma com as suas cores. Tema claro e escuro, instalável como PWA.

## Rodar no seu computador

Precisa de Node.js 22 ou mais novo.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Não há banco para instalar: sem `DATABASE_URL`, o app sobe um Postgres embutido (PGlite) em `.data/pglite` e aplica as migrações sozinho. Para zerar os dados locais, apague a pasta `.data`.

Também não é preciso configurar e-mail no dev: sem `RESEND_API_KEY`, a tela de login mostra o código em vez de enviá-lo. Isso só acontece fora de produção.

## Testes

```bash
npm run test       # sorteio e regras do Amigo Ladrão (Vitest)
npm run test:e2e   # fluxos completos com vários "celulares" (Playwright)
npm run lint
npm run build
```

Os testes ponta a ponta sobem um servidor próprio na porta 3100, com banco embutido zerado a cada execução e sem serviços externos. Eles nunca usam o banco nem o e-mail configurados no `.env.local`, então podem rodar mesmo com o dev apontando para produção. Na primeira vez, instale o navegador com `npx playwright install chromium`.

## Como está organizado

```
src/
  app/                    rotas (App Router)
    page.tsx              capa e "seus grupos neste aparelho"
    criar/                assistente de criação
    entrar/               tela de login
    auth/google/          ida e volta do "Entrar com Google"
    k/[token]/route.ts    convite pessoal: liga um nome do grupo à conta
    g/[slug]/             convite/painel, revelar, amigo, lista, chat, festa, admin
    api/g/[slug]/         leituras para o polling do chat e da festa
  components/             moldura do grupo, ícones, componentes de cliente
  lib/
    draw/                 algoritmo do sorteio (puro, testado)
    ladrao.ts             regras do Amigo Ladrão (puro, testado)
    occasions.ts          ocasiões, modos de jogo e textos
  server/
    db/                   schema Drizzle e cliente (Postgres ou PGlite)
    actions/              Server Actions por assunto
    google.ts             OAuth do Google (código de autorização + PKCE)
    auth.ts, email.ts     contas, códigos de login e envio de e-mail
    session.ts            cookie de sessão e perfil ativo
    context.ts            "quem é esta conta neste grupo"
drizzle/                  migrações SQL
e2e/                      testes Playwright
```

O projeto usa Next.js 16 com Cache Components: cada página é uma casca estática com o conteúdo do grupo chegando por streaming dentro de um `<Suspense>`. Antes de mexer em rotas, vale ler `AGENTS.md`.

Depois de alterar `src/server/db/schema.ts`, gere a migração com `npm run db:generate`.

## Publicar

O app foi feito para a Vercel com um Postgres do Marketplace (Neon), mas roda em qualquer host Node com Postgres.

1. Crie o projeto e provisione o banco (na Vercel: `vercel link` e a integração Neon pelo Marketplace).
2. Configure as variáveis de ambiente (veja `.env.example`):
   - `DATABASE_URL` — conexão do Postgres;
   - `SESSION_SECRET` — segredo do cookie de sessão; obrigatório em produção;
   - `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` — credenciais OAuth do Google Cloud (tipo "Aplicativo da Web"). Cadastre nelas o endereço de retorno `https://SEU-SITE/auth/google/callback` (e `http://localhost:3000/auth/google/callback` para o dev);
   - `RESEND_API_KEY` e `EMAIL_FROM` — opcionais: login por código de e-mail pelo [Resend](https://resend.com). Só serve para outras pessoas com um domínio verificado, informado em `EMAIL_FROM`;
   - `NEXT_PUBLIC_SITE_URL` — opcional na Vercel.
3. Aplique as migrações: `DATABASE_URL=... npm run db:migrate`.
4. Faça o deploy.

## Limites conhecidos

- O limite de uso (criar grupos, entrar, mensagens) só vale em produção e é uma janela fixa simples guardada no Postgres.
- Chat e festa atualizam por polling (3 s e 2 s), não por WebSocket.
- Sem domínio próprio, o Resend só entrega para o e-mail da conta dele; por isso o login de produção é pelo Google.
- Deploys de preview da Vercel têm outro endereço, que não está cadastrado no Google: neles o login com Google não funciona.
- Um responsável vê o papelzinho de quem está na conta dele. Em grupos muito pequenos pode não dar para evitar que duas pessoas da mesma conta se tirem.
- Cada grupo tem uma única conta organizadora.
- O caminho com Postgres de verdade (`pg`) ainda não foi exercitado: todo o desenvolvimento e os testes rodaram no PGlite.
