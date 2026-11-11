"use client";

import { useRef, useState, type CSSProperties } from "react";
import {
  MODE_KEYS,
  MODES,
  OCCASION_KEYS,
  OCCASIONS,
  type ModeKey,
  type OccasionKey,
} from "@/lib/occasions";
import { createGroup } from "@/server/actions/group";
import { ActionForm, SubmitButton } from "./forms";

const STEPS = ["Ocasião", "Detalhes", "Jeito de jogar"] as const;

export function CreateWizard() {
  const [step, setStep] = useState(0);
  const [occasion, setOccasion] = useState<OccasionKey>("natal");
  const [mode, setMode] = useState<ModeKey>("classico");
  const [nameError, setNameError] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const theme = OCCASIONS[occasion];

  function goTo(target: number) {
    setStep(target);
    window.scrollTo({ top: 0 });
  }

  function next() {
    if (step === 1 && (nameRef.current?.value.trim().length ?? 0) < 2) {
      setNameError(true);
      nameRef.current?.focus();
      return;
    }
    setNameError(false);
    goTo(Math.min(step + 1, STEPS.length - 1));
  }

  return (
    <div
      className="theme min-h-dvh"
      data-mode={mode}
      style={
        {
          "--brand-base": theme.brand,
          "--leaf-base": theme.leaf,
          "--gold": theme.gold,
        } as CSSProperties
      }
    >
      <div className="wrap h-16" aria-hidden="true" />
      <main className="mx-auto max-w-md px-5 pb-16 pt-8">
        <p className="hint" aria-live="polite">
          Passo {step + 1} de {STEPS.length}: {STEPS[step]}
        </p>

        <ActionForm action={createGroup} className="mt-2">
          <input type="hidden" name="occasion" value={occasion} />
          <input type="hidden" name="mode" value={mode} />

          <section hidden={step !== 0}>
            <h1 className="text-3xl">Qual é a ocasião?</h1>
            <p className="hint mt-2">As cores do grupo acompanham a festa.</p>
            <div className="mt-5 grid gap-3">
              {OCCASION_KEYS.map((key) => (
                <label key={key} className="choice">
                  <input
                    type="radio"
                    name="occasion-choice"
                    checked={occasion === key}
                    onChange={() => setOccasion(key)}
                  />
                  <span className="flex items-center gap-3">
                    <span
                      className="avatar"
                      style={{ background: OCCASIONS[key].brand }}
                      aria-hidden="true"
                    >
                      {OCCASIONS[key].emoji}
                    </span>
                    <span>
                      <span className="block font-bold">{OCCASIONS[key].label}</span>
                      <span className="hint block">{OCCASIONS[key].hint}</span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section hidden={step !== 1}>
            <h1 className="text-3xl">Conte sobre a festa</h1>
            <p className="hint mt-2">Só o nome é obrigatório. O resto dá para completar depois.</p>
            <div className="mt-5 grid gap-4">
              <div>
                <label className="label" htmlFor="name">
                  Nome do grupo
                </label>
                <input
                  ref={nameRef}
                  id="name"
                  name="name"
                  className="input"
                  maxLength={60}
                  placeholder="Ex.: Natal dos Oliveira"
                  aria-invalid={nameError}
                  aria-describedby={nameError ? "name-error" : undefined}
                />
                {nameError && (
                  <p id="name-error" className="notice notice-error mt-2">
                    Dê um nome ao grupo para continuar.
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="organizer">
                  Seu nome
                </label>
                <input
                  id="organizer"
                  name="organizer"
                  className="input"
                  maxLength={40}
                  autoComplete="given-name"
                />
                <p className="hint mt-1">
                  Deixe em branco se você só organiza e não entra no sorteio.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="eventDate">
                    Dia da troca
                  </label>
                  <input id="eventDate" name="eventDate" type="date" className="input" />
                </div>
                <div>
                  <label className="label" htmlFor="eventTime">
                    Hora
                  </label>
                  <input id="eventTime" name="eventTime" type="time" className="input" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="place">
                  Onde vai ser
                </label>
                <input
                  id="place"
                  name="place"
                  className="input"
                  maxLength={120}
                  placeholder="Ex.: casa da vó Lourdes"
                />
              </div>
              <fieldset>
                <legend className="label">Valor do presente, em reais</legend>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    name="budgetMin"
                    className="input"
                    inputMode="numeric"
                    placeholder="De"
                    aria-label="Valor mínimo"
                  />
                  <input
                    name="budgetMax"
                    className="input"
                    inputMode="numeric"
                    placeholder="Até"
                    aria-label="Valor máximo"
                  />
                </div>
              </fieldset>
              <div>
                <label className="label" htmlFor="message">
                  Recado para o grupo
                </label>
                <textarea
                  id="message"
                  name="message"
                  className="input"
                  maxLength={400}
                  placeholder="Ex.: cada um leva um prato. Presente embrulhado!"
                />
              </div>
            </div>
          </section>

          <section hidden={step !== 2}>
            <h1 className="text-3xl">Como vocês vão jogar?</h1>
            <div className="mt-5 grid gap-3">
              {MODE_KEYS.map((key) => (
                <label key={key} className="choice">
                  <input
                    type="radio"
                    name="mode-choice"
                    checked={mode === key}
                    onChange={() => setMode(key)}
                  />
                  <span className="block font-bold">{MODES[key].label}</span>
                  <span className="hint block">{MODES[key].description}</span>
                </label>
              ))}
            </div>
            {mode !== "ladrao" && (
              <label className="mt-5 flex items-start gap-3">
                <input type="checkbox" name="themed" className="mt-1 h-5 w-5 accent-[var(--brand)]" />
                <span>
                  <span className="block font-bold">Sortear também um tema de presente</span>
                  <span className="hint block">
                    Cada pessoa recebe, junto com o nome, um tema como “algo azul” ou “da
                    papelaria”. Você edita a lista de temas depois.
                  </span>
                </span>
              </label>
            )}
          </section>

          <div className="mt-8 flex items-center justify-between gap-3">
            {step > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={() => goTo(step - 1)}>
                Voltar
              </button>
            ) : (
              <span />
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" className="btn btn-primary" onClick={next}>
                Continuar
              </button>
            ) : (
              <SubmitButton pendingLabel="Criando…">Criar grupo</SubmitButton>
            )}
          </div>
        </ActionForm>
      </main>
    </div>
  );
}
