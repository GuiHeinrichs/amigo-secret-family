import type { Metadata } from "next";
import Link from "next/link";
import { BackButton, Breadcrumbs } from "@/components/breadcrumbs";
import { Garland } from "@/components/client/effects/garland";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Quais dados o Laço guarda, para quê, quem vê cada coisa e como pedir a exclusão.",
};

/** Contato opcional; sem ele, a página aponta para quem organiza o grupo. */
const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh">
      <header className="wrap">
        <div className="mx-auto max-w-2xl px-5 pb-9 pt-4">
          <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Privacidade" }]} />
        </div>
        <Garland />
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-20 pt-6">
        <BackButton href="/" to="o início" />
        <h1 className="mt-5 text-4xl">Política de privacidade</h1>
        <p className="hint mt-2">Atualizada em 11 de novembro de 2026.</p>
        <p className="mt-5 text-lg text-ink-soft">
          O Laço é um app de amigo secreto, sem fins comerciais e sem anúncios. Ele guarda só o
          que precisa para o sorteio funcionar, e esta página conta o que é.
        </p>

        <Section title="O que guardamos">
          <List>
            <li>
              <strong>Da sua conta:</strong> o e-mail e o nome pelo qual você quer ser chamado.
            </li>
            <li>
              <strong>Do grupo:</strong> nome do grupo, data, local, valor combinado, recado de quem
              organiza e os nomes dos participantes.
            </li>
            <li>
              <strong>Do que você escreve:</strong> lista de desejos, tamanhos, gostos, dicas para a
              festa, palpites e as mensagens das conversas anônimas.
            </li>
            <li>
              <strong>Do sorteio:</strong> quem tirou quem e o momento em que cada papelzinho foi
              aberto pela primeira vez.
            </li>
            <li>
              <strong>Para evitar abuso:</strong> o endereço IP, por pouco tempo, quando alguém cria
              grupos ou pede códigos de acesso em excesso.
            </li>
          </List>
          <p className="mt-3">
            De crianças e de pessoas incluídas por um responsável guardamos só o nome e o que o
            responsável escrever por elas.
          </p>
        </Section>

        <Section title="Entrar com Google">
          <p>
            Quando você entra com o Google, recebemos apenas o seu nome e o seu e-mail, para
            identificar a sua conta. Não recebemos a sua senha, não temos acesso ao seu Gmail, aos
            seus contatos ou aos seus arquivos, e não guardamos nenhuma chave de acesso do Google.
            Nada é publicado em seu nome.
          </p>
        </Section>

        <Section title="Quem vê o quê">
          <List>
            <li>Os participantes de um grupo veem os nomes uns dos outros.</li>
            <li>
              Quem organiza vê quem entrou e quem já abriu o papelzinho, mas não vê quem tirou quem.
            </li>
            <li>Só quem tirou você vê a sua lista de desejos, os seus tamanhos e os seus gostos.</li>
            <li>
              Nas conversas anônimas, as mensagens são vistas pelas duas pessoas da conversa; o nome
              de quem tirou não aparece para quem foi tirado.
            </li>
            <li>
              Quem cuida de outra pessoa no grupo, como um responsável por uma criança, vê o que é
              dela.
            </li>
            <li>Na festa, os pares aparecem para o grupo à medida que são revelados.</li>
          </List>
        </Section>

        <Section title="Com quem os dados ficam">
          <p>
            Não vendemos nem compartilhamos dados para publicidade. Para o app existir, usamos
            alguns serviços que processam os dados por nós:
          </p>
          <List>
            <li>
              <strong>Vercel</strong>, que hospeda o site. Os servidores podem ficar fora do Brasil.
            </li>
            <li>
              <strong>Neon</strong>, onde fica o banco de dados.
            </li>
            <li>
              <strong>Google</strong>, quando você escolhe entrar com a sua conta Google.
            </li>
            <li>
              <strong>Resend</strong>, quando o acesso é por código enviado ao seu e-mail.
            </li>
          </List>
        </Section>

        <Section title="Cookies">
          <p>
            Usamos só cookies necessários: um para manter você conectado, um para lembrar qual
            pessoa do grupo você está vendo e um, que dura alguns minutos, para concluir a entrada
            com o Google. Não há cookies de publicidade nem ferramentas de rastreamento.
          </p>
        </Section>

        <Section title="Por quanto tempo">
          <p>
            Os dados de um grupo ficam guardados até quem organiza excluir o grupo, o que apaga
            participantes, listas, conversas e o sorteio. Os códigos de acesso por e-mail valem por
            10 minutos e são apagados depois de usados.
          </p>
        </Section>

        <Section title="Seus direitos">
          <p>
            Você pode pedir para ver, corrigir ou apagar os seus dados, como prevê a Lei Geral de
            Proteção de Dados. Nome, lista e perfil você mesmo altera dentro do grupo.{" "}
            {contact ? (
              <>
                Para apagar a sua conta ou tirar dúvidas, escreva para{" "}
                <a href={`mailto:${contact}`} className="font-semibold underline underline-offset-4">
                  {contact}
                </a>
                .
              </>
            ) : (
              <>
                Para apagar a sua conta ou tirar dúvidas, fale com quem organiza o seu grupo ou use
                o e-mail de suporte que o Google mostra na tela de entrada.
              </>
            )}
          </p>
        </Section>

        <p className="mt-10">
          <Link href="/" className="btn btn-quiet">
            Voltar ao início
          </Link>
        </p>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-2xl">{title}</h2>
      <div className="mt-3 text-ink">{children}</div>
    </section>
  );
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="mt-2 list-disc space-y-2 pl-5 marker:text-brand">{children}</ul>;
}
