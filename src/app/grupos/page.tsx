import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BackButton, Breadcrumbs } from "@/components/breadcrumbs";
import { Garland } from "@/components/client/effects/garland";
import { MobileMenu } from "@/components/client/mobile-menu";
import { ThemeSwitch } from "@/components/client/theme-switch";
import { GroupCard } from "@/components/group-card";
import { Icon } from "@/components/icons";
import { plural } from "@/lib/format";
import { listMyGroups } from "@/server/queries";
import { getUser } from "@/server/session";

export const metadata: Metadata = { title: "Meus grupos" };

/** Os grupos da conta, e só eles: é para cá que o "Meus grupos" do menu leva. */
export default function GroupsPage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <Groups />
    </Suspense>
  );
}

async function Groups() {
  const user = await getUser();
  if (!user) redirect("/entrar?next=/grupos");
  const mine = await listMyGroups(user.id);
  // Os encerrados vão para o fim, sem destaque: quem abre a página quer os de agora.
  const current = mine.filter(({ group }) => group.status !== "encerrado");
  const ended = mine.filter(({ group }) => group.status === "encerrado");

  return (
    <div className="min-h-dvh">
      <header className="wrap">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-5 pb-10 pt-3 md:max-w-4xl">
          <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Meus grupos" }]} />
          <ThemeSwitch className="hidden md:inline-flex" />
          <MobileMenu email={user.email} groupsCurrent />
        </div>
        <Garland />
      </header>

      <div className="mx-auto max-w-md px-5 md:max-w-4xl">
        <p className="slip -mt-6 inline-flex -rotate-1 items-center gap-2 rounded-lg px-4 py-2 text-lg font-extrabold leading-tight">
          <Icon name="bow" size={22} className="text-brand" />
          Laço
        </p>
      </div>

      <main className="mx-auto max-w-md px-5 pb-16 pt-6 md:max-w-4xl">
        <BackButton href="/" to="o início" />

        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div>
            <h1 className="text-4xl">Meus grupos</h1>
            {mine.length > 0 && (
              <p className="hint mt-2">{plural(mine.length, "grupo", "grupos")} na sua conta.</p>
            )}
          </div>
          {mine.length > 0 && (
            <Link href="/criar" className="btn btn-quiet btn-sm">
              <Icon name="plus" size={18} />
              Criar um grupo
            </Link>
          )}
        </div>

        {mine.length === 0 && (
          <div className="panel mt-8">
            <h2 className="text-xl">Você ainda não está em nenhum grupo</h2>
            <p className="mt-2 text-ink-soft">
              Crie um e mande o link para a turma. Se alguém já montou o seu, peça o convite a
              quem organiza: o grupo aparece aqui assim que você entrar por ele.
            </p>
            <Link href="/criar" className="btn btn-primary mt-5">
              Criar um grupo
            </Link>
          </div>
        )}

        {current.length > 0 && (
          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {current.map((entry) => (
              <li key={entry.group.id}>
                <GroupCard entry={entry} />
              </li>
            ))}
          </ul>
        )}

        {ended.length > 0 && (
          <section className="mt-10">
            <h2 className="text-2xl">Encerrados</h2>
            <ul className="mt-5 grid gap-5 md:grid-cols-2">
              {ended.map((entry) => (
                <li key={entry.group.id}>
                  <GroupCard entry={entry} quiet />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="min-h-dvh" aria-busy="true">
      <div className="wrap h-[4.75rem]" />
      <div className="mx-auto max-w-md px-5 md:max-w-4xl">
        <div className="skeleton -mt-6 h-11 w-28" />
        <div className="skeleton mt-16 h-10 w-56" />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div className="skeleton h-44 rounded-[22px]" />
          <div className="skeleton h-44 rounded-[22px]" />
        </div>
        <p className="sr-only">Carregando…</p>
      </div>
    </div>
  );
}
