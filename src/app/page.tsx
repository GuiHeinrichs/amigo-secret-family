import Link from "next/link";
import { Suspense } from "react";
import { Garland } from "@/components/client/effects/garland";
import { Scene } from "@/components/client/effects/scene";
import { MobileMenu } from "@/components/client/mobile-menu";
import { Presentation } from "@/components/client/presentation";
import { ThemeSwitch } from "@/components/client/theme-switch";
import { GroupCard } from "@/components/group-card";
import { Icon, type IconName } from "@/components/icons";
import { signOutAction } from "@/server/actions/account";
import { listMyGroups } from "@/server/queries";
import { getUser } from "@/server/session";

const STEPS = [
  {
    title: "Monte o grupo",
    body: "Escolha a ocasião, o valor do presente e o dia da troca. Leva um minuto.",
  },
  {
    title: "Mande o link no WhatsApp",
    body: "Cada pessoa entra com a própria conta, em um toque. Criança sem conta entra pela de um responsável.",
  },
  {
    title: "Cada um abre o seu papelzinho",
    body: "O sorteio acontece com um toque e cada pessoa rompe o próprio lacre no celular.",
  },
];

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "lock",
    title: "Lacre que denuncia espiadinha",
    body: "Nem quem organiza vê os pares. E se alguém abrir o seu papelzinho antes de você, o lacre mostra quando foi.",
  },
  {
    icon: "chat",
    title: "Conversa anônima",
    body: "Pergunte o tamanho da camiseta para quem você tirou sem revelar quem é, e responda quem tirou você.",
  },
  {
    icon: "party",
    title: "Modo festa no telão",
    body: "Palpites de “quem me tirou?”, revelação em cadeia com as dicas de cada um e placar no final.",
  },
  {
    icon: "bow",
    title: "Três jeitos de jogar",
    body: "O clássico, o Amigo da Onça com presente zoeira e o Amigo Ladrão, com direito a roubar presente.",
  },
];

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <div className="min-h-dvh">
      <div className="wrap h-16" aria-hidden="true">
        <Garland />
      </div>

      <div className="mx-auto max-w-5xl px-5">
        <div className="flex items-start justify-between gap-3">
          <p className="slip -mt-6 inline-flex -rotate-1 items-center gap-2 rounded-lg px-4 py-2 text-xl font-extrabold">
            <Icon name="bow" size={24} className="text-brand" />
            Laço
          </p>
          <Suspense>
            <Account />
          </Suspense>
        </div>

        <Suspense>
          <LinkNotice searchParams={searchParams} />
        </Suspense>

        <section className="grid items-center gap-10 pb-6 pt-10 md:grid-cols-[1.15fr_0.85fr] md:pt-16">
          <div>
            <h1 className="text-[2.6rem] sm:text-6xl md:text-7xl">
              O papelzinho do amigo secreto agora chega pelo WhatsApp.
            </h1>
            <p className="mt-5 max-w-[34rem] text-lg text-ink-soft">
              Monte o grupo, mande o link e cada pessoa abre o seu papelzinho lacrado no
              celular. Ninguém precisa decorar senha nova, e nem quem organiza fica sabendo quem
              tirou quem.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link href="/criar" className="btn btn-primary text-lg">
                Criar um grupo
              </Link>
              <a href="#apresentacao" className="btn btn-ghost">
                Ver a apresentação
              </a>
            </div>
          </div>

          {/* Um monte de papelzinhos dobrados e um aberto por cima. */}
          <div className="relative mx-auto h-[21rem] w-72" aria-hidden="true">
            <div className="slip slip-folded absolute bottom-10 left-0 h-16 w-32 -rotate-12 rounded-sm" />
            <div className="slip slip-folded absolute bottom-14 right-0 h-16 w-32 rotate-[14deg] rounded-sm" />
            <div className="slip slip-folded absolute bottom-0 left-20 h-16 w-32 rotate-3 rounded-sm" />
            <div className="absolute left-1/2 top-0 w-60 -translate-x-1/2 rotate-2">
              <div className="hero-unfold slip slip-cut rounded-t-sm px-5 pb-10 pt-7 text-center">
                <p className="font-bold">Seu amigo secreto é</p>
                <p className="hand mt-4 text-6xl leading-none">Tia Neide</p>
                <p className="mt-5 text-sm font-semibold">Tema do presente: algo azul</p>
              </div>
            </div>
          </div>
        </section>

        <Suspense>
          <MyGroups />
        </Suspense>

        <hr className="cutline" />

        {/* Apresentação em vídeo, com player próprio dividido em capítulos. */}
        <Presentation />

        <hr className="cutline" />

        <section id="como-funciona" className="scroll-mt-8">
          <h2 className="text-3xl md:text-4xl">Como funciona</h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gold text-lg font-extrabold text-[#2a1420]">
                  {index + 1}
                </span>
                <h3 className="mt-3 text-xl">{step.title}</h3>
                <p className="mt-1 text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <hr className="cutline" />

        <section>
          <h2 className="text-3xl md:text-4xl">O que os outros sorteios não têm</h2>
          <ul className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="flex gap-4">
                <Icon name={feature.icon} size={28} className="mt-1 flex-none text-brand" />
                <div>
                  <h3 className="text-xl">{feature.title}</h3>
                  <p className="mt-1 text-ink-soft">{feature.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <Scene />

        <div className="py-14 text-center">
          <Link href="/criar" className="btn btn-primary text-lg">
            Criar um grupo
          </Link>
          <p className="hint mt-4">Grátis, sem senha e sem instalar nada.</p>
          <p className="hint mt-6">
            <Link href="/privacidade" className="underline underline-offset-4">
              Política de privacidade
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

async function LinkNotice({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const { link } = await searchParams;
  if (link !== "invalido") return null;
  return (
    <p role="alert" className="notice notice-error mt-6">
      Esse convite não vale mais. Peça um novo a quem organiza o grupo.
    </p>
  );
}

async function Account() {
  const user = await getUser();
  // No celular a conta fica no menu lateral; em telas maiores, aqui mesmo.
  return (
    <div className="mt-3 flex min-w-0 items-center gap-3">
      <ThemeSwitch className="hidden md:inline-flex" />
      {user ? (
        <form action={signOutAction} className="hidden min-w-0 items-center gap-3 md:flex">
          <span className="hint truncate">{user.email}</span>
          <button type="submit" className="btn btn-quiet btn-sm">
            Sair
          </button>
        </form>
      ) : (
        <Link href="/entrar" className="btn btn-quiet btn-sm hidden md:inline-flex">
          Entrar
        </Link>
      )}
      <MobileMenu email={user?.email ?? null} />
    </div>
  );
}

async function MyGroups() {
  const user = await getUser();
  if (!user) return null;
  const mine = await listMyGroups(user.id);
  if (mine.length === 0) return null;
  return (
    <section className="pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-3xl md:text-4xl">Meus grupos</h2>
        <Link href="/grupos" className="font-semibold underline decoration-2 underline-offset-4">
          Ver só os grupos
        </Link>
      </div>
      <ul className="mt-6 grid gap-6 md:grid-cols-2">
        {mine.map((entry) => (
          <li key={entry.group.id}>
            <GroupCard entry={entry} quiet={entry.group.status === "encerrado"} />
          </li>
        ))}
      </ul>
    </section>
  );
}
