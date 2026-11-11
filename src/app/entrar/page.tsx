import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/client/login-form";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { getUser } from "@/server/session";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <div className="min-h-dvh">
      <header className="wrap">
        <div className="mx-auto max-w-md px-5 py-4">
          <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Entrar" }]} />
        </div>
      </header>
      <main className="mx-auto max-w-md px-5 pb-16">
        <h1 className="mt-8 text-4xl">Entre na sua conta</h1>
        <p className="mt-3 text-ink-soft">
          Seus grupos, listas e papelzinhos ficam guardados na conta e aparecem em qualquer
          aparelho. Se for a sua primeira vez, a conta é criada na hora.
        </p>
        <div className="panel mt-6">
          <Suspense fallback={<div className="skeleton h-40" />}>
            <Form searchParams={searchParams} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const { next } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (await getUser()) redirect(target);
  return <LoginForm next={target} />;
}
