import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/google-oauth";
import { getOrigin } from "@/server/context";
import { GOOGLE_FLOW_COOKIE, googleConfigured, startGoogleFlow } from "@/server/google";

/** Manda a pessoa para a tela de escolha de conta do Google. */
export async function GET(request: Request) {
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  if (!googleConfigured()) redirect("/entrar?erro=google-indisponivel");

  const flow = await startGoogleFlow(await getOrigin(), next);
  (await cookies()).set(GOOGLE_FLOW_COOKIE, flow.cookie, {
    httpOnly: true,
    // "lax" para o cookie voltar junto quando o Google redireciona para cá.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/auth/google",
    maxAge: flow.maxAge,
  });
  redirect(flow.url);
}
