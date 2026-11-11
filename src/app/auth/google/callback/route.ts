import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { findOrCreateUser } from "@/server/auth";
import { getOrigin } from "@/server/context";
import { finishGoogleFlow, GOOGLE_FLOW_COOKIE, GoogleAuthError } from "@/server/google";
import { signIn } from "@/server/session";

/** Volta do Google: confere a resposta, abre a sessão e segue para onde a pessoa ia. */
export async function GET(request: Request) {
  const store = await cookies();
  const flowCookie = store.get(GOOGLE_FLOW_COOKIE)?.value;
  // O cookie do fluxo vale uma vez só.
  store.set(GOOGLE_FLOW_COOKIE, "", { path: "/auth/google", maxAge: 0 });

  let target: string;
  try {
    const { email, name, next } = await finishGoogleFlow(
      await getOrigin(),
      new URL(request.url).searchParams,
      flowCookie,
    );
    await signIn(await findOrCreateUser(email, name));
    target = next;
  } catch (error) {
    if (!(error instanceof GoogleAuthError)) throw error;
    target = `/entrar?erro=${error.reason}`;
  }
  redirect(target);
}
