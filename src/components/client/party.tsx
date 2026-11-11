"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { ordinal, plural } from "@/lib/format";
import type {
  ClassicParty,
  LadraoGiftView,
  LadraoParty,
  PartyState,
  Person,
} from "@/lib/party-types";
import {
  advanceParty,
  labelGift,
  playLadrao,
  saveGuess,
  startParty,
} from "@/server/actions/party";
import { Icon } from "../icons";
import { celebrate } from "./confetti";
import { ActionForm, SubmitButton } from "./forms";

const fetcher = async (url: string): Promise<PartyState> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("indisponivel");
  return response.json();
};

function Face({ person, size = "" }: { person?: Person; size?: "" | "avatar-lg" | "avatar-sm" }) {
  return (
    <span
      className={`avatar ${size}`}
      style={{ background: person?.color ?? "var(--paper-2)" }}
      aria-hidden="true"
    >
      {person?.emoji ?? "?"}
    </span>
  );
}

export function PartyBoard({ slug, initial }: { slug: string; initial: PartyState }) {
  const { data, mutate } = useSWR(`/api/g/${slug}/festa`, fetcher, {
    fallbackData: initial,
    refreshInterval: (latest) =>
      latest?.phase === "placar" || latest?.phase === "fim" ? 0 : 2000,
  });
  const state = data ?? initial;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function act(fn: () => Promise<{ error?: string }>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await fn();
      if (result.error) setError(result.error);
      await mutate();
    } catch {
      setError("Não deu certo. Confira a internet e tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  const shared = { slug, busy, act, refresh: () => void mutate() };
  return (
    <div>
      {state.kind === "ladrao" ? (
        <LadraoStage state={state} {...shared} />
      ) : (
        <ClassicStage state={state} {...shared} />
      )}
      {error && (
        <p role="alert" className="notice notice-error mt-4">
          {error}
        </p>
      )}
    </div>
  );
}

type StageProps<T> = {
  state: T;
  slug: string;
  busy: boolean;
  act: (fn: () => Promise<{ error?: string }>) => Promise<void>;
  refresh: () => void;
};

function StartButton({ slug, refresh, label }: { slug: string; refresh: () => void; label: string }) {
  return (
    <ActionForm action={startParty} fields={{ slug }} onDone={refresh} className="mt-6">
      <SubmitButton className="btn btn-primary btn-block" pendingLabel="Abrindo…">
        {label}
      </SubmitButton>
    </ActionForm>
  );
}

/* ——— Clássico e Amigo da Onça ——— */

function ClassicStage({ state, slug, busy, act, refresh }: StageProps<ClassicParty>) {
  const byId = new Map(state.people.map((p) => [p.id, p]));
  const stage = useRef<HTMLDivElement>(null);
  const lastShown = useRef(state.shown ? state.currentId : null);

  useEffect(() => {
    if (state.shown && state.currentId !== lastShown.current) celebrate(stage.current);
    lastShown.current = state.shown ? state.currentId : null;
  }, [state.shown, state.currentId]);

  const advance = () => act(() => advanceParty(slug, state.version));
  const giver = state.currentId ? byId.get(state.currentId) : undefined;
  const receiver = state.receiverId ? byId.get(state.receiverId) : undefined;

  return (
    <div ref={stage}>
      {(state.phase === "antes" || state.phase === "palpites") && (
        <section>
          <h1 className="text-3xl lg:text-5xl">
            {state.phase === "antes" ? "A festa ainda não começou" : "Hora dos palpites"}
          </h1>
          <p className="hint mt-2 lg:text-xl">
            {state.phase === "antes"
              ? "Enquanto isso, arrisque: quem você acha que tirou você?"
              : "Cada um chuta quem o tirou. Quando todos tiverem palpitado, comecem a revelação."}
          </p>
          <p className="mt-4 font-bold lg:text-2xl" aria-live="polite">
            {state.guessCount} de {plural(state.people.length, "pessoa já palpitou", "pessoas já palpitaram")}
          </p>

          {state.meId && (
            <ActionForm action={saveGuess} fields={{ slug }} onDone={refresh} className="panel mt-5">
              <label className="label" htmlFor="guessId">
                Quem tirou você?
              </label>
              <select
                id="guessId"
                name="guessId"
                className="input"
                defaultValue={state.myGuessId ?? ""}
                key={state.myGuessId ?? "vazio"}
                required
              >
                <option value="" disabled>
                  Escolha uma pessoa
                </option>
                {state.people
                  .filter((p) => p.id !== state.meId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
              <SubmitButton className="btn btn-quiet mt-3" pendingLabel="Guardando…">
                {state.myGuessId ? "Trocar palpite" : "Guardar palpite"}
              </SubmitButton>
            </ActionForm>
          )}

          {state.isAdmin && state.phase === "antes" && (
            <StartButton slug={slug} refresh={refresh} label="Começar a festa" />
          )}
          {state.isAdmin && state.phase === "palpites" && (
            <button type="button" className="btn btn-primary btn-block mt-6" disabled={busy} onClick={advance}>
              Começar a revelação
            </button>
          )}
          {!state.isAdmin && state.phase === "palpites" && (
            <p className="hint mt-6">Quem organiza começa a revelação.</p>
          )}
        </section>
      )}

      {state.phase === "revelacao" && giver && (
        <section className="text-center" aria-live="polite">
          <div className="flex flex-col items-center gap-3">
            <Face person={giver} size="avatar-lg" />
            <h1 className="text-3xl lg:text-6xl">{giver.name} entrega o presente</h1>
          </div>

          {!state.shown ? (
            <div className="panel mx-auto mt-6 max-w-xl text-left">
              <h2 className="text-lg lg:text-2xl">Dicas sobre o amigo de {giver.name}</h2>
              <p className="mt-2 whitespace-pre-wrap lg:text-2xl">
                {state.hints ??
                  `${giver.name} não deixou dicas escritas. Vale descrever o amigo em voz alta até alguém adivinhar.`}
              </p>
            </div>
          ) : (
            <div className="pop-in mt-6 flex flex-col items-center gap-3">
              <p className="font-bold lg:text-2xl">e o amigo é</p>
              <div className="slip slip-cut -rotate-2 px-10 pt-6">
                <p className="hand text-5xl lg:text-8xl">{receiver?.name}</p>
              </div>
              <Face person={receiver} size="avatar-lg" />
            </div>
          )}

          {state.canAct ? (
            <button type="button" className="btn btn-primary mt-8 lg:text-2xl" disabled={busy} onClick={advance}>
              {!state.shown
                ? "Revelar"
                : state.remaining > 0
                  ? `Passar a vez para ${receiver?.name ?? "a próxima pessoa"}`
                  : "Ver o placar"}
            </button>
          ) : (
            <p className="hint mt-8">
              {!state.shown
                ? `${giver.name} revela quando quiser.`
                : "Aguardando passarem a vez."}
            </p>
          )}
          <p className="hint mt-3">
            {state.remaining > 0
              ? `Faltam ${plural(state.remaining, "presente", "presentes")}.`
              : "Esse foi o último presente."}
          </p>
        </section>
      )}

      {state.phase === "placar" && state.score && (
        <section>
          <h1 className="text-3xl lg:text-5xl">Placar dos palpites</h1>
          {(() => {
            const winners = state.score.filter((s) => s.correct);
            return (
              <p className="mt-2 font-bold lg:text-2xl">
                {winners.length === 0
                  ? "Ninguém acertou quem o tirou. Segredo bem guardado!"
                  : `${plural(winners.length, "detetive", "detetives")} da noite: ${winners
                      .map((w) => byId.get(w.id)?.name)
                      .join(", ")}.`}
              </p>
            );
          })()}
          <ul className="mt-5 grid gap-2">
            {state.score.map((row) => (
              <li key={row.id} className="flex items-center gap-3 border-b-2 border-dashed border-line py-2">
                <Face person={byId.get(row.id)} />
                <p className="flex-1">
                  <span className="font-bold">{byId.get(row.id)?.name}</span>{" "}
                  {row.guessId
                    ? `apostou em ${byId.get(row.guessId)?.name ?? "alguém"}`
                    : "não palpitou"}
                  ; quem tirou foi <span className="font-bold">{byId.get(row.giverId)?.name}</span>.
                </p>
                {row.correct && (
                  <span className="chip chip-on">
                    <Icon name="check" size={16} /> Acertou
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {state.revealed.length > 0 && state.phase !== "placar" && (
        <section className="mt-10 text-left">
          <h2 className="text-lg">Quem já entregou</h2>
          <ol className="mt-2 grid gap-1">
            {state.revealed.map((pair) => (
              <li key={pair.giverId} className="flex items-center gap-2">
                <Face person={byId.get(pair.giverId)} size="avatar-sm" />
                <span>{byId.get(pair.giverId)?.name} tirou</span>
                <span className="font-bold">{byId.get(pair.receiverId)?.name}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

/* ——— Amigo Ladrão ——— */

function GiftCard({
  gift,
  holder,
  maxSteals,
  slug,
  version,
  busy,
  act,
}: {
  gift: LadraoGiftView;
  holder?: Person;
  maxSteals: number;
  slug: string;
  version: number;
  busy: boolean;
  act: StageProps<LadraoParty>["act"];
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(gift.label ?? "");
  const closed = gift.holderId === null;

  if (closed) {
    return (
      <li className="wrap relative grid aspect-square place-items-center overflow-hidden rounded-2xl">
        <span className="ribbon absolute inset-y-0 left-1/2 w-4 -translate-x-1/2" aria-hidden="true" />
        <span className="ribbon absolute inset-x-0 top-1/2 h-4 -translate-y-1/2" aria-hidden="true" />
        <span className="relative grid h-12 w-12 place-items-center rounded-full bg-slip text-xl font-extrabold text-slip-ink">
          {gift.number}
        </span>
        {gift.canOpen && (
          <button
            type="button"
            className="btn btn-sm btn-quiet absolute bottom-2"
            disabled={busy}
            onClick={() => act(() => playLadrao(slug, gift.id, "abrir", version))}
          >
            Abrir
            <span className="sr-only"> o presente {gift.number}</span>
          </button>
        )}
      </li>
    );
  }

  return (
    <li className="panel flex aspect-square flex-col justify-between !p-3">
      <div>
        <p className="hint text-xs">Presente {gift.number}</p>
        {editing ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setEditing(false);
              void act(() => labelGift(slug, gift.id, label));
            }}
          >
            <label className="sr-only" htmlFor={`gift-${gift.id}`}>
              O que é o presente {gift.number}
            </label>
            <input
              id={`gift-${gift.id}`}
              className="input !min-h-9 !px-2 !py-1 text-sm"
              value={label}
              maxLength={40}
              autoFocus
              onChange={(event) => setLabel(event.target.value)}
              onBlur={() => setEditing(false)}
            />
          </form>
        ) : (
          <p className="font-bold leading-tight">
            {gift.label ?? "Presente aberto"}
            {gift.canLabel && (
              <button
                type="button"
                className="ml-1 text-sm font-semibold underline"
                onClick={() => setEditing(true)}
              >
                {gift.label ? "editar" : "dizer o que é"}
              </button>
            )}
          </p>
        )}
      </div>
      <div>
        <p className="flex items-center gap-1.5 text-sm">
          <Face person={holder} size="avatar-sm" />
          <span className="truncate">{holder?.name}</span>
        </p>
        <p className="hint mt-1 flex items-center gap-1 text-xs">
          {gift.locked ? (
            <>
              <Icon name="lock" size={14} /> Trancado
            </>
          ) : (
            `Roubado ${gift.steals} de ${maxSteals}`
          )}
        </p>
        {gift.canSteal && (
          <button
            type="button"
            className="btn btn-sm btn-primary mt-2 w-full"
            disabled={busy}
            onClick={() => act(() => playLadrao(slug, gift.id, "roubar", version))}
          >
            Roubar
            <span className="sr-only"> o presente {gift.number} de {holder?.name}</span>
          </button>
        )}
      </div>
    </li>
  );
}

function LadraoStage({ state, slug, busy, act, refresh }: StageProps<LadraoParty>) {
  const byId = new Map(state.people.map((p) => [p.id, p]));
  const current = state.currentId ? byId.get(state.currentId) : undefined;
  const myTurn = !!state.meId && state.meId === state.currentId;

  return (
    <div>
      {state.phase === "antes" && (
        <section>
          <h1 className="text-3xl lg:text-5xl">A fila do Amigo Ladrão</h1>
          <p className="hint mt-2">
            Na sua vez, abra um presente novo ou roube um já aberto. Quem é roubado escolhe de
            novo. Depois de {plural(state.maxSteals, "roubo", "roubos")}, o presente fica trancado
            com quem estiver.
          </p>
          {state.isAdmin && <StartButton slug={slug} refresh={refresh} label="Começar o jogo" />}
        </section>
      )}

      {state.phase === "jogo" && current && (
        <section className="text-center" aria-live="polite">
          <div className="flex flex-col items-center gap-2">
            <Face person={current} size="avatar-lg" />
            <h1 className="text-3xl lg:text-5xl">
              {myTurn ? "É a sua vez" : `Vez de ${current.name}`}
            </h1>
            <p className="hint lg:text-xl">
              {state.wasRobbed
                ? `${myTurn ? "Você foi roubado" : `${current.name} foi roubado`}: abra um presente novo ou roube outro.`
                : "Abrir um presente novo ou roubar um já aberto?"}
            </p>
          </div>
        </section>
      )}

      {state.phase === "fim" && (
        <section>
          <h1 className="text-3xl lg:text-5xl">Fim de jogo</h1>
          <p className="hint mt-2">Cada um fica com o presente que está na mão.</p>
        </section>
      )}

      {state.gifts.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {state.gifts.map((gift) => (
            <GiftCard
              key={gift.id}
              gift={gift}
              holder={gift.holderId ? byId.get(gift.holderId) : undefined}
              maxSteals={state.maxSteals}
              slug={slug}
              version={state.version}
              busy={busy}
              act={act}
            />
          ))}
        </ul>
      )}

      <section className="mt-10">
        <h2 className="text-lg">Fila</h2>
        <ol className="mt-2 grid gap-1">
          {state.order.map((id, index) => (
            <li
              key={id}
              className={`flex items-center gap-2 rounded-xl px-2 py-1 ${
                id === state.currentId ? "bg-paper-2 font-bold" : ""
              } ${state.phase !== "antes" && index < state.turn && id !== state.currentId ? "opacity-60" : ""}`}
            >
              <span className="w-8 tabular-nums">{ordinal(index + 1)}</span>
              <Face person={byId.get(id)} size="avatar-sm" />
              <span>{byId.get(id)?.name}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
