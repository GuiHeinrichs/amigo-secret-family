"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "../icons";

/*
 * Player da apresentação. Em vez dos controles genéricos do navegador, o
 * vídeo é dividido nos capítulos que ele mostra: a barra de progresso tem um
 * trecho por funcionalidade e a lista ao lado acompanha o que está tocando e
 * leva direto a cada parte.
 */

const VIDEO = "/apresentacao.mp4";
const POSTER = "/apresentacao.jpg";
const LENGTH = 61;

/** Trechos do vídeo, em segundos. Os não listados (abertura e fim) só aparecem na barra. */
const PARTS = [
  { start: 0, label: "Abertura", listed: false },
  { start: 5, label: "Montar o grupo", listed: true },
  { start: 11, label: "Chamar a turma", listed: true },
  { start: 17, label: "Lista de desejos", listed: true },
  { start: 23, label: "Sorteio", listed: true },
  { start: 30, label: "Papelzinho lacrado", listed: true },
  { start: 37, label: "Conversa anônima", listed: true },
  { start: 43, label: "Festa no telão", listed: true },
  { start: 50, label: "Jeitos de jogar", listed: true },
  { start: 56, label: "Crie o seu grupo", listed: false },
];

const partEnd = (index: number) => PARTS[index + 1]?.start ?? LENGTH;

function partAt(time: number): number {
  let index = 0;
  for (let i = 0; i < PARTS.length; i++) if (time >= PARTS[i].start) index = i;
  return index;
}

function clock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

type Status = "poster" | "playing" | "paused" | "ended";

export function Presentation() {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<Status>("poster");
  const [time, setTime] = useState(0);
  const [muted, setMuted] = useState(false);
  /** Controles recolhidos enquanto o vídeo toca e ninguém mexe. */
  const [quiet, setQuiet] = useState(false);

  const playing = status === "playing";
  const current = partAt(time);

  // Enquanto toca, o progresso acompanha quadro a quadro (o evento
  // "timeupdate" do navegador só chega umas quatro vezes por segundo).
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      if (video.current) setTime(video.current.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => () => void (hideTimer.current && clearTimeout(hideTimer.current)), []);

  /** Mostra os controles e agenda recolher de novo. */
  function wake() {
    setQuiet(false);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (video.current && !video.current.paused) setQuiet(true);
    }, 2600);
  }

  function play() {
    void video.current?.play().catch(() => {});
    wake();
  }

  function toggle() {
    const el = video.current;
    if (!el) return;
    if (el.paused) play();
    else el.pause();
    wake();
  }

  function seek(seconds: number, andPlay = false) {
    const el = video.current;
    if (!el) return;
    const target = Math.min(LENGTH - 0.05, Math.max(0, seconds));
    el.currentTime = target;
    setTime(target);
    if (andPlay && el.paused) play();
    wake();
  }

  function toggleMute() {
    const el = video.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    wake();
  }

  function fullscreen() {
    const box = frame.current;
    const el = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!box || !el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (box.requestFullscreen) void box.requestFullscreen().catch(() => {});
    // No iPhone só o próprio vídeo entra em tela cheia.
    else el.webkitEnterFullscreen?.();
    wake();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (status === "poster") return;
    const onSlider = (event.target as HTMLElement).tagName === "INPUT";
    const onButton = (event.target as HTMLElement).closest("button, a") !== null;
    const key = event.key.toLowerCase();
    if ((key === " " || key === "k") && !onButton && !onSlider) toggle();
    else if (key === "arrowright" && !onSlider) seek(time + 5);
    else if (key === "arrowleft" && !onSlider) seek(time - 5);
    else if (key === "m") toggleMute();
    else if (key === "f") fullscreen();
    else return;
    event.preventDefault();
  }

  const showBar = status === "playing" || status === "paused";

  return (
    <section
      id="apresentacao"
      className="grid scroll-mt-8 items-center gap-8 md:grid-cols-[minmax(0,23rem)_1fr] md:gap-12"
    >
      <div
        ref={frame}
        className="player mx-auto w-full max-w-[23rem]"
        data-quiet={quiet && playing}
        onPointerMove={wake}
        onPointerDown={wake}
        onFocus={wake}
        onKeyDown={onKeyDown}
      >
        <video
          ref={video}
          src={VIDEO}
          poster={POSTER}
          playsInline
          preload="none"
          width={1080}
          height={1350}
          tabIndex={-1}
          aria-label="Vídeo de apresentação do Laço"
          className="player-video"
          onClick={() => {
            // Com os controles recolhidos, o primeiro toque só os traz de volta.
            if (quiet && playing) wake();
            else if (showBar) toggle();
          }}
          onPlay={() => setStatus("playing")}
          onPause={() => setStatus((now) => (now === "ended" ? now : "paused"))}
          onEnded={() => {
            setStatus("ended");
            setQuiet(false);
          }}
          onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
          onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
        />

        {status === "poster" && (
          <button
            type="button"
            onClick={play}
            className="absolute inset-0 grid place-items-center"
            aria-label="Assistir à apresentação: um minuto, com música"
          >
            <span className="mt-[52%] grid justify-items-center gap-4">
              <span className="player-seal">
                <Icon name="play" size={40} fill="currentColor" className="translate-x-0.5" />
              </span>
              <span className="rounded-full bg-black/45 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
                1 minuto, com música
              </span>
            </span>
          </button>
        )}

        {status === "ended" && (
          <div className="pop-in absolute inset-0 grid place-items-center bg-[#2a1420]/80 p-6 text-center text-white backdrop-blur-sm">
            <div className="grid justify-items-center gap-4">
              <p className="text-2xl font-extrabold leading-tight">Agora é a sua vez</p>
              <Link href="/criar" className="btn btn-primary">
                Criar um grupo
              </Link>
              <button
                type="button"
                onClick={() => seek(0, true)}
                className="font-bold underline decoration-2 underline-offset-4"
              >
                Ver de novo
              </button>
            </div>
          </div>
        )}

        {showBar && (
          <div className="player-bar">
            <p className="mb-2 truncate text-sm font-bold" aria-live="off">
              {PARTS[current].label}
            </p>
            {/* Um trecho por capítulo; por cima, um controle deslizante invisível para arrastar ou usar o teclado. */}
            <div className="relative flex h-5 items-center gap-[3px]">
              {PARTS.map((part, index) => {
                const span = partEnd(index) - part.start;
                const filled = Math.min(1, Math.max(0, (time - part.start) / span));
                return (
                  <span
                    key={part.start}
                    className="h-1.5 overflow-hidden rounded-full bg-white/30"
                    style={{ flexGrow: span, flexBasis: 0 }}
                  >
                    <span
                      className="block h-full rounded-full bg-[#e8a93b]"
                      style={{ width: `${filled * 100}%` }}
                    />
                  </span>
                );
              })}
              <input
                type="range"
                min={0}
                max={LENGTH}
                step={0.1}
                value={time}
                onChange={(event) => seek(Number(event.currentTarget.value))}
                aria-label="Posição no vídeo"
                aria-valuetext={`${clock(time)} de ${clock(LENGTH)}, ${PARTS[current].label}`}
                className="player-range"
              />
            </div>
            <div className="mt-1 flex items-center gap-1">
              <button
                type="button"
                onClick={toggle}
                className="player-btn"
                aria-label={playing ? "Pausar" : "Continuar"}
              >
                <Icon name={playing ? "pause" : "play"} size={24} fill={playing ? "none" : "currentColor"} />
              </button>
              <span className="ml-1 flex-1 text-sm font-semibold tabular-nums">
                {clock(time)} <span className="opacity-60">/ {clock(LENGTH)}</span>
              </span>
              <button
                type="button"
                onClick={toggleMute}
                className="player-btn"
                aria-label={muted ? "Ligar o som" : "Tirar o som"}
                aria-pressed={muted}
              >
                <Icon name={muted ? "soundOff" : "sound"} size={24} />
              </button>
              <button type="button" onClick={fullscreen} className="player-btn" aria-label="Tela cheia">
                <Icon name="expand" size={22} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-3xl md:text-4xl">Conheça o Laço em um minuto</h2>
        <p className="mt-3 max-w-[32rem] text-lg text-ink-soft">
          Do convite à festa, com música. Toque em uma parte para ir direto a ela.
        </p>
        <ol className="mt-5 grid max-w-[36rem] gap-2 lg:grid-cols-2">
          {PARTS.map((part, index) => {
            if (!part.listed) return null;
            const active = status !== "poster" && status !== "ended" && current === index;
            return (
              <li key={part.start}>
                <button
                  type="button"
                  onClick={() => seek(part.start, true)}
                  aria-current={active ? "true" : undefined}
                  className="chapter"
                >
                  <span className="chapter-time" aria-hidden={active}>
                    {active ? (
                      <Icon name="play" size={16} fill="currentColor" />
                    ) : (
                      clock(part.start)
                    )}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">{part.label}</span>
                  {active && <span className="sr-only"> (tocando agora)</span>}
                </button>
              </li>
            );
          })}
        </ol>
        <a href="#como-funciona" className="btn btn-ghost mt-4 !px-0">
          Prefere ler? Veja o passo a passo
        </a>
      </div>
    </section>
  );
}
