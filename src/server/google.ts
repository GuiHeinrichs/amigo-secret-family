import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import {
  buildGoogleAuthUrl,
  GOOGLE_ISSUERS,
  GOOGLE_JWKS_URL,
  GOOGLE_TOKEN_URL,
  googleCallbackUrl,
  safeNext,
} from "@/lib/google-oauth";
import { sessionSecret } from "./session";

/**
 * "Entrar com Google". O app só pede identidade e e-mail (openid email
 * profile) e não guarda nenhum token do Google: depois de conferir o
 * e-mail, vale a sessão do próprio app.
 */
export const GOOGLE_FLOW_COOKIE = "laco_google";
const FLOW_MINUTES = 10;

function credentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export function googleConfigured(): boolean {
  return credentials() !== null;
}

export class GoogleAuthError extends Error {
  constructor(public readonly reason: "google" | "google-email") {
    super(reason);
  }
}

const random = () => randomBytes(32).toString("base64url");

/**
 * Começa o fluxo: devolve o endereço do Google e o conteúdo do cookie que
 * guarda, assinado, o que precisamos conferir na volta.
 */
export async function startGoogleFlow(origin: string, next: string) {
  const creds = credentials();
  if (!creds) throw new GoogleAuthError("google");

  const state = random();
  const verifier = random();
  const nonce = random();
  const cookie = await new SignJWT({ state, verifier, nonce, next: safeNext(next) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${FLOW_MINUTES}m`)
    .sign(sessionSecret());

  return {
    url: buildGoogleAuthUrl({
      clientId: creds.clientId,
      origin,
      state,
      nonce,
      codeChallenge: createHash("sha256").update(verifier).digest("base64url"),
    }),
    cookie,
    maxAge: FLOW_MINUTES * 60,
  };
}

const jwks = createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));

/** Termina o fluxo: confere a volta do Google e devolve o e-mail confirmado. */
export async function finishGoogleFlow(
  origin: string,
  params: URLSearchParams,
  cookie: string | undefined,
): Promise<{ email: string; name: string | null; next: string }> {
  const creds = credentials();
  const code = params.get("code");
  if (!creds || !cookie || !code || params.get("error")) throw new GoogleAuthError("google");

  let flow: Record<string, unknown>;
  try {
    flow = (await jwtVerify(cookie, sessionSecret())).payload;
  } catch {
    throw new GoogleAuthError("google");
  }
  if (typeof flow.state !== "string" || flow.state !== params.get("state")) {
    throw new GoogleAuthError("google");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: googleCallbackUrl(origin),
      code_verifier: String(flow.verifier),
    }),
  });
  if (!response.ok) {
    console.error("Google recusou a troca do código:", response.status, await response.text());
    throw new GoogleAuthError("google");
  }
  const tokens = (await response.json()) as { id_token?: string };
  if (!tokens.id_token) throw new GoogleAuthError("google");

  let claims: Record<string, unknown>;
  try {
    claims = (
      await jwtVerify(tokens.id_token, jwks, {
        issuer: GOOGLE_ISSUERS,
        audience: creds.clientId,
      })
    ).payload;
  } catch {
    throw new GoogleAuthError("google");
  }
  if (claims.nonce !== flow.nonce) throw new GoogleAuthError("google");
  if (typeof claims.email !== "string" || claims.email_verified !== true) {
    throw new GoogleAuthError("google-email");
  }

  const name =
    typeof claims.given_name === "string"
      ? claims.given_name
      : typeof claims.name === "string"
        ? claims.name
        : null;
  return {
    email: claims.email.trim().toLowerCase(),
    name: name ? name.trim().slice(0, 40) || null : null,
    next: safeNext(typeof flow.next === "string" ? flow.next : "/"),
  };
}
