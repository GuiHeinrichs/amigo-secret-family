import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CreateWizard } from "@/components/client/create-wizard";
import { getUser } from "@/server/session";

export const metadata: Metadata = { title: "Criar grupo" };

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh" aria-busy="true">
          <div className="wrap h-16" />
        </div>
      }
    >
      <Gate />
    </Suspense>
  );
}

/** Só quem tem conta cria grupo: é a conta que fica como organizadora. */
async function Gate() {
  const user = await getUser();
  if (!user) redirect("/entrar?next=/criar");
  return <CreateWizard organizerName={user.name ?? ""} email={user.email} />;
}
