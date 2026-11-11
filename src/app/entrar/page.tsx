import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { LoginForm } from "@/components/client/login-form";
import { GoogleLogo } from "@/components/icons";
import { safeNext } from "@/lib/google-oauth";
import { emailConfigured } from "@/server/email";
import { googleConfigured } from "@/server/google";
import { getUser } from "@/server/session";

export const metadata: Metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  google: "Não deu para entrar com o Google. Tente de novo.",
  "google-email": "Essa conta Google não tem um e-mail confirmado. Tente com outra conta.",
  "google-indisponivel": "A entrada com Google não está configurada neste site.",
};

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
        <p className="hint mt-4">
          Criança ou alguém sem conta? Um responsável entra e inclui a pessoa dentro do grupo.
        </p>
        <p className="hint mt-3">
          <Link href="/privacidade" className="underline underline-offset-4">
            Política de privacidade
          </Link>
        </p>
      </main>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/entrar">["searchParams"] }) {
  const { next, erro } = await searchParams;
  const target = safeNext(typeof next === "string" ? next : null);
  if (await getUser()) redirect(target);

  const google = googleConfigured();
  // O código por e-mail só aparece onde funciona de verdade: no dev (o código
  // vai para a tela), com remetente próprio configurado, ou quando não há
  // outra forma de entrar.
  const codeOnScreen = !emailConfigured() && process.env.NODE_ENV !== "production";
  const email = codeOnScreen || !!process.env.EMAIL_FROM?.trim() || !google;
  const error = typeof erro === "string" ? ERRORS[erro] : undefined;

  return (
    <div className="grid gap-5">
      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}
      {google && (
        <div>
          {/* <a> comum, e não <Link>: é uma rota que redireciona para fora do site. */}
          <a
            href={`/auth/google?next=${encodeURIComponent(target)}`}
            className="btn btn-quiet btn-block"
          >
            <GoogleLogo />
            Entrar com Google
          </a>
          <p className="hint mt-2">
            Usamos só o seu nome e o seu e-mail. Nada é publicado em seu nome.
          </p>
        </div>
      )}
      {google && email && (
        <p className="hint flex items-center gap-3 font-semibold" aria-hidden="true">
          <span className="h-0.5 flex-1 bg-line" />
          ou
          <span className="h-0.5 flex-1 bg-line" />
        </p>
      )}
      {email && <LoginForm next={target} />}
    </div>
  );
}
