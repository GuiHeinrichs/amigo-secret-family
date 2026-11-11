import { describe, expect, it } from "vitest";
import { buildGoogleAuthUrl, googleCallbackUrl, safeNext } from "./google-oauth";

describe("buildGoogleAuthUrl", () => {
  const url = new URL(
    buildGoogleAuthUrl({
      clientId: "abc.apps.googleusercontent.com",
      origin: "https://amigo-secret.vercel.app",
      state: "estado",
      codeChallenge: "desafio",
      nonce: "nonce",
    }),
  );

  it("aponta para o Google com o fluxo de código e PKCE", () => {
    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).toBe("desafio");
    expect(url.searchParams.get("state")).toBe("estado");
    expect(url.searchParams.get("nonce")).toBe("nonce");
  });

  it("pede só identidade e e-mail, e volta para o callback do próprio site", () => {
    expect(url.searchParams.get("scope")).toBe("openid email profile");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://amigo-secret.vercel.app/auth/google/callback",
    );
    expect(url.searchParams.get("client_id")).toBe("abc.apps.googleusercontent.com");
  });

  it("monta o callback a partir da origem", () => {
    expect(googleCallbackUrl("http://localhost:3000")).toBe(
      "http://localhost:3000/auth/google/callback",
    );
  });
});

describe("safeNext", () => {
  it("mantém caminhos internos", () => {
    expect(safeNext("/g/natal/admin")).toBe("/g/natal/admin");
    expect(safeNext("/k/pabc")).toBe("/k/pabc");
  });

  it("recusa endereços externos e formas disfarçadas", () => {
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "evil", "", null, undefined]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});
