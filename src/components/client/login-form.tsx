"use client";

import { useState, useTransition } from "react";
import { requestCode, verifyCode } from "@/server/actions/account";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  /** E-mail para o qual o código foi enviado; enquanto vazio, estamos no 1º passo. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function askForCode() {
    setError(null);
    startTransition(async () => {
      const result = await requestCode(email);
      if (result.error || !result.email) {
        setError(result.error ?? "Não deu para enviar o código. Tente de novo.");
        return;
      }
      setSentTo(result.email);
      setDevCode(result.devCode ?? null);
      setCode("");
    });
  }

  function confirm() {
    if (!sentTo) return;
    setError(null);
    startTransition(async () => {
      const result = await verifyCode(sentTo, code, next);
      // Quando dá certo, a ação redireciona e não devolve nada.
      if (result?.error) setError(result.error);
    });
  }

  if (!sentTo) {
    return (
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          askForCode();
        }}
      >
        <div>
          <label className="label" htmlFor="email">
            Seu e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            className="input"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nome@exemplo.com"
          />
          <p className="hint mt-1">
            Mandamos um código de 6 dígitos. Não existe senha para decorar.
          </p>
        </div>
        {error && (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={pending}>
          {pending ? "Enviando…" : "Receber código"}
        </button>
      </form>
    );
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        confirm();
      }}
    >
      <p role="status">
        {devCode ? "Geramos um código para " : "Enviamos um código para "}
        <span className="font-bold">{sentTo}</span>. Ele vale por 10 minutos.
      </p>
      {devCode && (
        <p className="notice notice-ok">
          Este é um ambiente de desenvolvimento sem envio de e-mail configurado, então nada foi
          enviado. Seu código é{" "}
          <span className="font-extrabold tracking-widest" data-testid="dev-code">
            {devCode}
          </span>
          .
        </p>
      )}
      <div>
        <label className="label" htmlFor="code">
          Código de 6 dígitos
        </label>
        <input
          id="code"
          name="code"
          className="input text-center text-2xl font-extrabold tracking-[0.4em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        />
      </div>
      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block" disabled={pending || code.length < 6}>
        {pending ? "Conferindo…" : "Entrar"}
      </button>
      <div className="flex flex-wrap justify-between gap-2">
        <button type="button" className="btn btn-ghost btn-sm" disabled={pending} onClick={askForCode}>
          Enviar outro código
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={pending}
          onClick={() => {
            setSentTo(null);
            setError(null);
          }}
        >
          Usar outro e-mail
        </button>
      </div>
    </form>
  );
}
