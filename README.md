# Laço — amigo secreto no papelzinho

Web app de amigo secreto para famílias e grupos de amigos. Quem organiza monta o grupo e manda um link no WhatsApp; cada pessoa abre o próprio papelzinho no celular. Ninguém cria conta.

## O que ele faz

- **Sem cadastro.** Entrada pelo link de convite (só o nome) ou por um link pessoal secreto. O aparelho lembra os grupos num cookie assinado.
- **Sorteio com restrições.** "Casal não se tira", pares da edição anterior evitados quando possível, e preferência por um ciclo único para a revelação em cadeia da festa.
- **Lacre.** Nem quem organiza vê os pares. A primeira abertura de cada papelzinho fica registrada: se alguém espiou antes, o dono fica sabendo quando.
- **Lista de desejos e perfil** (tamanhos, gostos), visíveis só para quem tirou a pessoa.
- **Conversa anônima** nos dois sentidos: com quem você tirou e com quem tirou você.
- **Modo festa**: palpites de "quem me tirou?", revelação em cadeia com dicas no telão e placar.
- **Três jeitos de jogar**: Clássico, Amigo da Onça e Amigo Ladrão (abrir ou roubar presentes), além de temas de presente sorteados.
- **Saída sem refazer**: se alguém desiste depois do sorteio, só uma pessoa muda de amigo.
- **Próxima edição**: clona o grupo e evita repetir os pares.
- Tema visual por ocasião (Natal, Páscoa, festa junina, aniversário, firma), claro e escuro, instalável como PWA.

## Rodar no seu computador

Precisa de Node.js 22 ou mais novo.

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Não há banco para instalar: sem `DATABASE_URL`, o app sobe um Postgres embutido (PGlite) em `.data/pglite` e aplica as migrações sozinho. Para zerar os dados locais, apague a pasta `.data`.

## Testes

```bash
npm run test       # sorteio e regras do Amigo Ladrão (Vitest)
npm run test:e2e   # fluxos completos com vários "celulares" (Playwright)
npm run lint
npm run build
```

Os testes ponta a ponta usam o `npm run dev` que estiver aberto na porta 3000 (ou sobem um). Na primeira vez, instale o navegador com `npx playwright install chromium`.

## Como está organizado

```
src/
  app/                    rotas (App Router)
    page.tsx              capa e "seus grupos neste aparelho"
    criar/                assistente de criação
    k/[token]/route.ts    link mágico: grava o cookie e redireciona
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
    session.ts            cookie de sessão
    context.ts            "quem é este aparelho neste grupo"
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
   - `NEXT_PUBLIC_SITE_URL` — opcional na Vercel.
3. Aplique as migrações: `DATABASE_URL=... npm run db:migrate`.
4. Faça o deploy.

## Limites conhecidos

- O limite de uso (criar grupos, entrar, mensagens) só vale em produção e é uma janela fixa simples guardada no Postgres.
- Chat e festa atualizam por polling (3 s e 2 s), não por WebSocket.
- Quem perde o link pessoal precisa pedir de novo a quem organiza; quem organiza deve guardar o link de organizador.
- O caminho com Postgres de verdade (`pg`) ainda não foi exercitado: todo o desenvolvimento e os testes rodaram no PGlite.
