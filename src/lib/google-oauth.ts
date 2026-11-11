/**
 * Partes puras do "Entrar com Google" (OAuth 2.0 + OpenID Connect, fluxo de
 * código de autorização com PKCE). Ficam fora de `server/` para poderem ser
 * testadas sem rede.
 */
export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
export const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

/** Precisa estar cadastrada, igualzinha, nas credenciais do Google Cloud. */
export function googleCallbackUrl(origin: string): string {
  return `${origin}/auth/google/callback`;
}

export function buildGoogleAuthUrl(options: {
  clientId: string;
  origin: string;
  state: string;
  codeChallenge: string;
  nonce: string;
}): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.search = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: googleCallbackUrl(options.origin),
    response_type: "code",
    scope: "openid email profile",
    state: options.state,
    nonce: options.nonce,
    code_challenge: options.codeChallenge,
    code_challenge_method: "S256",
    // Sempre deixa a pessoa escolher a conta: num celular de família é comum
    // haver mais de uma conta Google logada.
    prompt: "select_account",
  }).toString();
  return url.toString();
}

/** Só aceita caminhos internos, para o login não virar redirecionador aberto. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  return next;
}
