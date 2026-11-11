import type { Metadata } from "next";
import { CreateWizard } from "@/components/client/create-wizard";

export const metadata: Metadata = { title: "Criar grupo" };

export default function CreatePage() {
  return <CreateWizard />;
}
