import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-dvh">
      <div className="wrap h-16" aria-hidden="true" />
      <main className="mx-auto max-w-md px-5 py-14 text-center">
        <h1 className="text-4xl">Esta página não existe</h1>
        <p className="mt-3 text-ink-soft">
          O link pode estar incompleto, ou o grupo foi excluído por quem organizava. Confira o
          endereço ou peça o link de novo.
        </p>
        <Link href="/" className="btn btn-primary mt-7">
          Ir para o início
        </Link>
      </main>
    </div>
  );
}
