import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BackButton, Breadcrumbs } from "@/components/breadcrumbs";
import { Garland } from "@/components/client/effects/garland";
import { LoginForm } from "@/components/client/login-form";
import { GoogleLogo, Icon } from "@/components/icons";
import { safeNext } from "@/lib/google-oauth";
import { AVATAR_COLORS, AVATAR_EMOJIS } from "@/lib/occasions";
import { emailConfigured } from "@/server/email";
import { googleConfigured } from "@/server/google";
import { getUser } from "@/server/session";

export const metadata: Metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  google: "Não deu para entrar com o Google. Tente de novo.",
  "google-email": "Essa conta Google não tem um e-mail confirmado. Tente com outra conta.",
  "google-indisponivel": "A entrada com Google não está configurada neste site.",
};

/** A turma que já está no grupo, esperando quem vai entrar. */
const CREW = AVATAR_EMOJIS.slice(0, 5).map((emoji, index) => ({
  emoji,
  color: AVATAR_COLORS[index % AVATAR_COLORS.length],
}));

export default function LoginPage({ searchParams }: PageProps<"/entrar">) {
  return (
    <div className="min-h-dvh">
      <header className="wrap">
        <div className="mx-auto max-w-md px-5 pb-9 pt-4">
          <Breadcrumbs items={[{ label: "Início", href: "/" }, { label: "Entrar" }]} />
        </div>
        <Garland />
      </header>
      <main className="mx-auto max-w-md px-5 pb-16">
        <div className="mt-6">
          <BackButton href="/" to="o início" />
        </div>
        {/* A turma chega pulando; o último lugar da fila é de quem está entrando. */}
        <div className="crew mt-7" aria-hidden="true">
          {CREW.map((face, index) => (
            <span
              key={face.emoji}
              className="avatar crew-face"
              style={{ background: face.color, "--i": index } as React.CSSProperties}
            >
              {face.emoji}
            </span>
          ))}
          <span className="crew-you" style={{ "--i": CREW.length } as React.CSSProperties}>
            você
          </span>
        </div>
        <h1 className="rise mt-5 text-4xl" style={{ "--i": 1 } as React.CSSProperties}>
          Entre na sua conta
        </h1>
        <p className="rise mt-3 text-ink-soft" style={{ "--i": 2 } as React.CSSProperties}>
          Seus grupos, listas e papelzinhos ficam guardados na conta e aparecem em qualquer
          aparelho. Se for a sua primeira vez, a conta é criada na hora.
        </p>
        {/* O cartão chega balançando, como uma etiqueta pendurada, e ganha o selo. */}
        <div className="login-card panel mt-9">
          <span className="login-seal" aria-hidden="true">
            <Icon name="bow" size={28} />
          </span>
          <Suspense fallback={<div className="skeleton h-40" />}>
            <Form searchParams={searchParams} />
          </Suspense>
        </div>
        <p className="hint mt-5">
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
            className="btn btn-quiet btn-block login-google"
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
