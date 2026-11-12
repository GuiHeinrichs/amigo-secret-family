"use client";

import { useRef, useState, type CSSProperties } from "react";
import {
  MAIN_OCCASION,
  MODE_KEYS,
  MODES,
  occasionVars,
  OCCASIONS,
  OTHER_OCCASIONS,
  type ModeKey,
  type OccasionKey,
} from "@/lib/occasions";
import { createGroup } from "@/server/actions/group";
import { BackButton, Breadcrumbs } from "../breadcrumbs";
import { DateField, TimeField } from "./date-time";
import { Garland } from "./effects/garland";
import { MobileMenu } from "./mobile-menu";
import { ActionForm, SubmitButton } from "./forms";

const STEPS = ["Ocasião", "Detalhes", "Jeito de jogar"] as const;

export function CreateWizard({
  organizerName = "",
  email = null,
}: {
  organizerName?: string;
  /** Conta logada, para o menu lateral. */
  email?: string | null;
}) {
  const [step, setStep] = useState(0);
  const [occasion, setOccasion] = useState<OccasionKey>(MAIN_OCCASION);
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
      style={occasionVars(theme) as CSSProperties}
    >
      <header className="wrap">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2 px-5 pb-9 pt-3">
          {/* Os passos já feitos viram atalhos para voltar. */}
          <Breadcrumbs
            items={[
              { label: "Início", href: "/" },
              ...STEPS.slice(0, step + 1).map((label, index) => ({
                label,
                onSelect: index < step ? () => goTo(index) : undefined,
              })),
            ]}
          />
          <MobileMenu title="Criar grupo" email={email} />
        </div>
        <Garland />
      </header>
      <main className="mx-auto max-w-md px-5 pb-16 pt-6">
        {step === 0 ? (
          <BackButton href="/" to="o início" />
        ) : (
          <BackButton onSelect={() => goTo(step - 1)} to={`o passo ${STEPS[step - 1]}`} />
        )}
        <p className="hint mt-5" aria-live="polite">
          Passo {step + 1} de {STEPS.length}: {STEPS[step]}
        </p>

        <ActionForm action={createGroup} className="mt-2">
          <input type="hidden" name="occasion" value={occasion} />
          <input type="hidden" name="mode" value={mode} />

          <section hidden={step !== 0}>
            <h1 className="text-3xl">Qual é a ocasião?</h1>
            <p className="hint mt-2">As cores do grupo acompanham a festa.</p>

            {/* A opção principal vem grande e já marcada. */}
            <label className="choice mt-5 !p-5">
              <input
                type="radio"
                name="occasion-choice"
                checked={occasion === MAIN_OCCASION}
                onChange={() => setOccasion(MAIN_OCCASION)}
              />
              <span className="flex items-center gap-4">
                <span
                  className="avatar avatar-lg"
                  style={{ background: OCCASIONS[MAIN_OCCASION].brand }}
                  aria-hidden="true"
                >
                  {OCCASIONS[MAIN_OCCASION].emoji}
                </span>
                <span>
                  <span className="block text-2xl font-extrabold leading-tight">
                    {OCCASIONS[MAIN_OCCASION].label}
                  </span>
                  <span className="hint mt-1 block">{OCCASIONS[MAIN_OCCASION].hint}</span>
                </span>
              </span>
            </label>

            <fieldset className="mt-6">
              <legend className="hint font-semibold">Ou é outra festividade?</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {OTHER_OCCASIONS.map((key) => (
                  <label key={key} className="choice !rounded-2xl !px-3 !py-2">
                    <input
                      type="radio"
                      name="occasion-choice"
                      checked={occasion === key}
                      onChange={() => setOccasion(key)}
                    />
                    <span className="flex items-center gap-2 text-[0.9375rem] font-semibold">
                      <span aria-hidden="true">{OCCASIONS[key].emoji}</span>
                      {OCCASIONS[key].label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
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
                  placeholder="Ex.: Amigo secreto dos Oliveira"
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
                  defaultValue={organizerName}
                />
                <p className="hint mt-1">
                  É como você aparece no sorteio. Deixe em branco se só organiza e não participa.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="eventDate">
                    Dia da troca
                  </label>
                  <DateField id="eventDate" name="eventDate" />
                </div>
                <div>
                  <label className="label" htmlFor="eventTime">
                    Hora
                  </label>
                  <TimeField id="eventTime" name="eventTime" />
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
