"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatDateTime, ordinal } from "@/lib/format";
import { openSlip, type SlipResult } from "@/server/actions/draw";
import { Icon } from "../icons";
import { celebrate } from "./confetti";

const HOLD_MS = 900;

export function Reveal({
  slug,
  alreadyOpened,
  friendLabel,
}: {
  slug: string;
  /** O lacre já tinha sido rompido antes desta visita. */
  alreadyOpened: boolean;
  /** "amigo secreto" / "amigo da onça" */
  friendLabel: string;
}) {
  const [result, setResult] = useState<Exclude<SlipResult, { kind: "erro" }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrated = useRef(false);
  const root = useRef<HTMLDivElement>(null);
  const needsHold = !alreadyOpened && !result;

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  async function breakSeal() {
    if (busy) return;
    setHolding(false);
    setBusy(true);
    setError(null);
    try {
      const data = result ?? (await openSlip(slug));
      if (data.kind === "erro") {
        setError(data.error);
        return;
      }
      setResult(data);
      setOpen(true);
      if (data.firstOpen && !celebrated.current) {
        celebrated.current = true;
        setTimeout(() => celebrate(root.current), 700);
      }
    } catch {
      setError("Não deu para abrir agora. Confira a internet e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  function startHold() {
    if (!needsHold || busy) return;
    setNudge(false);
    setHolding(true);
    timer.current = setTimeout(breakSeal, HOLD_MS);
  }

  function cancelHold() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (holding) {
      setHolding(false);
      setNudge(true);
    }
  }

  return (
    <div ref={root} className="flex flex-col items-center text-center">
      <h1 className="text-3xl">Seu papelzinho</h1>
      <p className="hint mt-2 max-w-xs" aria-live="polite">
        {open
          ? "Guarde segredo até o dia da festa."
          : needsHold
            ? "Confira se ninguém está olhando. Depois, segure o selo até ele romper."
            : "Você já abriu este papelzinho. Toque no selo para ver de novo."}
      </p>

      <div className="mt-6" style={{ "--hold-ms": `${HOLD_MS}ms` } as React.CSSProperties}>
        <div className="fold" data-open={open}>
          <div className="fold-half fold-bottom grid place-items-center px-4">
            {open && result?.kind === "amigo" && (
              <div>
                <p className="hand written text-5xl leading-none">{result.name}</p>
                {result.theme && (
                  <p className="mt-3 text-sm font-semibold">Tema do presente: {result.theme}</p>
                )}
              </div>
            )}
            {open && result?.kind === "posicao" && (
              <div>
                <p className="hand written text-6xl leading-none">{ordinal(result.position)}</p>
                <p className="mt-2 text-sm font-semibold">de {result.total} na fila</p>
              </div>
            )}
          </div>

          <div className="fold-half fold-top">
            <div className="fold-face grid place-items-center px-4">
              {result?.kind === "amigo" && (
                <div className="flex flex-col items-center gap-2">
                  <span className="avatar avatar-lg" style={{ background: result.color }}>
                    {result.emoji}
                  </span>
                  <p className="font-bold">Seu {friendLabel} é</p>
                </div>
              )}
              {result?.kind === "posicao" && (
                <p className="font-bold">Sua vez de escolher é a</p>
              )}
            </div>
            <div className="fold-face fold-face-back grid place-items-center">
              <button
                type="button"
                className="seal"
                data-holding={holding}
                disabled={busy}
                aria-label={
                  needsHold
                    ? "Romper o selo e abrir o papelzinho. Segure, ou pressione Enter."
                    : "Abrir o papelzinho de novo"
                }
                onPointerDown={startHold}
                onPointerUp={cancelHold}
                onPointerLeave={cancelHold}
                onPointerCancel={cancelHold}
                onContextMenu={(event) => event.preventDefault()}
                onClick={(event) => {
                  // Teclado (detail === 0) ou papelzinho já aberto antes: um toque basta.
                  if (!needsHold || event.detail === 0) void breakSeal();
                }}
              >
                <svg className="seal-ring" viewBox="0 0 36 36" aria-hidden="true">
                  <circle cx="18" cy="18" r="15.9" pathLength={100} />
                </svg>
                <Icon name={needsHold ? "bow" : "slip"} size={44} strokeWidth={1.6} />
              </button>
            </div>
          </div>
          {open && <div className="fold-crease" aria-hidden="true" />}
        </div>
      </div>

      <div className="mt-6 min-h-24 w-full max-w-xs">
        {error && (
          <p role="alert" className="notice notice-error">
            {error}
          </p>
        )}
        {!open && nudge && !error && (
          <p className="hint" role="status">
            Continue segurando até o anel dar a volta inteira.
          </p>
        )}
        {open && result && (
          <div className="pop-in grid gap-3">
            <p className={`notice ${result.firstOpen ? "notice-ok" : ""}`} role="status">
              {result.firstOpen
                ? "Lacre rompido agora. Só você viu este papelzinho."
                : `Este papelzinho foi aberto pela primeira vez em ${formatDateTime(result.openedAt)}. Se não foi você, avise quem organiza.`}
            </p>
            {result.kind === "amigo" ? (
              <Link href={`/g/${slug}/amigo`} className="btn btn-primary btn-block">
                Ver a lista de {result.name}
              </Link>
            ) : (
              <Link href={`/g/${slug}/festa`} className="btn btn-primary btn-block">
                Ver a fila e as regras
              </Link>
            )}
            <button type="button" className="btn btn-quiet btn-block" onClick={() => setOpen(false)}>
              <Icon name="eyeOff" size={18} />
              Esconder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
