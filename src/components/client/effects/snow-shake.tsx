"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../../icons";
import { useTheme } from "../theme-switch";
import { dropSnow, snowLevel } from "./particles";

/*
 * Balançar o celular derruba a neve acumulada em cima dos componentes.
 *
 * - No Android o sensor de movimento já vem liberado; no iPhone o navegador
 *   só libera depois de um toque e de a pessoa aceitar, então ali o aviso
 *   traz um botão "Ativar".
 * - Quem não pode (ou não quer) balançar o aparelho tem o botão "Derrubar",
 *   no mesmo aviso e no menu.
 */

const OPT_IN_KEY = "laco_sacudir";
const HINT_SEEN_KEY = "laco_dica_neve";
/** Quanto de neve precisa ter acumulado para a dica aparecer. */
const HINT_LEVEL = 0.5;

type MotionPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

function motionApi(): (typeof DeviceMotionEvent & MotionPermission) | null {
  return typeof DeviceMotionEvent === "undefined"
    ? null
    : (DeviceMotionEvent as typeof DeviceMotionEvent & MotionPermission);
}

/** Chama `onShake` quando o aparelho leva três trancos fortes em pouco tempo. */
function watchShake(onShake: () => void): () => void {
  let jolts: number[] = [];
  let lastJolt = 0;
  let quietUntil = 0;
  const onMotion = (event: DeviceMotionEvent) => {
    const free = event.acceleration;
    const withGravity = event.accelerationIncludingGravity;
    let force: number;
    if (free && free.x !== null && free.y !== null && free.z !== null) {
      force = Math.hypot(free.x, free.y, free.z);
    } else if (withGravity && withGravity.x !== null && withGravity.y !== null && withGravity.z !== null) {
      // Sem o sensor "limpo", desconta a gravidade (9,8 m/s²) do total.
      force = Math.abs(Math.hypot(withGravity.x, withGravity.y, withGravity.z) - 9.81);
    } else {
      return;
    }
    const now = performance.now();
    if (force < 12 || now - lastJolt < 110 || now < quietUntil) return;
    lastJolt = now;
    jolts = jolts.filter((at) => now - at < 1200);
    jolts.push(now);
    if (jolts.length >= 3) {
      jolts = [];
      quietUntil = now + 2500;
      onShake();
    }
  };
  window.addEventListener("devicemotion", onMotion);
  return () => window.removeEventListener("devicemotion", onMotion);
}

export function SnowShake() {
  const theme = useTheme();
  const [hint, setHint] = useState<"off" | "tip" | "ask">("off");
  const stopWatching = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (theme !== "natal") return;
    const api = motionApi();
    // Só faz sentido em aparelho de mão: precisa de sensor e de tela de toque.
    if (!api || !window.matchMedia("(pointer: coarse)").matches) return;

    const start = () => {
      stopWatching.current ??= watchShake(dropSnow);
    };
    const needsPermission = typeof api.requestPermission === "function";
    let askOnTouch: (() => void) | null = null;

    if (!needsPermission) {
      start();
    } else {
      // Há navegadores que têm o pedido de permissão mas liberam sem perguntar;
      // no iPhone esta tentativa falha (exige um toque) e segue o caminho abaixo.
      void api.requestPermission?.().then((state) => state === "granted" && start(), () => {});
    }
    if (needsPermission && localStorage.getItem(OPT_IN_KEY) === "1") {
      // Quem já ativou antes não vê o aviso de novo: o primeiro toque na
      // página renova a permissão em silêncio.
      askOnTouch = () => {
        void api.requestPermission?.().then((state) => state === "granted" && start(), () => {});
      };
      window.addEventListener("pointerdown", askOnTouch, { once: true });
    }

    // A dica aparece uma vez por visita, quando já há neve para derrubar.
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    const watchLevel = setInterval(() => {
      if (sessionStorage.getItem(HINT_SEEN_KEY) || snowLevel() < HINT_LEVEL) return;
      // Não interrompe quem está digitando: o aviso ficaria por cima do campo.
      if (document.activeElement?.matches("input, textarea, select")) return;
      sessionStorage.setItem(HINT_SEEN_KEY, "1");
      setHint(needsPermission && !stopWatching.current ? "ask" : "tip");
      hideTimer = setTimeout(() => setHint("off"), 9000);
    }, 4000);

    return () => {
      clearInterval(watchLevel);
      clearTimeout(hideTimer);
      if (askOnTouch) window.removeEventListener("pointerdown", askOnTouch);
      stopWatching.current?.();
      stopWatching.current = null;
    };
  }, [theme]);

  if (hint === "off" || theme !== "natal") return null;

  async function enable() {
    try {
      const state = await motionApi()?.requestPermission?.();
      if (state === "granted") {
        localStorage.setItem(OPT_IN_KEY, "1");
        stopWatching.current ??= watchShake(dropSnow);
        setHint("tip");
        return;
      }
    } catch {
      // permissão negada ou indisponível: fica o botão "Derrubar"
    }
    setHint("off");
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-50 flex justify-center px-4">
      <div
        role="status"
        className="pop-in pointer-events-auto w-full max-w-sm rounded-2xl bg-[#2a1420] p-3 pl-4 text-sm font-semibold text-white shadow-[0_0_0_2px_rgb(255_255_255/0.18),0_4px_0_rgb(0_0_0/0.25)]"
      >
        <div className="flex items-start gap-2">
          <p className="flex-1 pt-1.5">
            {hint === "ask"
              ? "A neve acumulou. Ative o movimento e balance o celular para derrubar."
              : "A neve acumulou. Balance o celular para derrubar."}
          </p>
          <button
            type="button"
            onClick={() => setHint("off")}
            className="-mr-1 -mt-1 grid h-10 w-10 flex-none place-items-center rounded-full"
            aria-label="Fechar o aviso"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="mt-1 flex gap-2">
          {hint === "ask" && (
            <button type="button" onClick={enable} className="snow-hint-btn bg-[#e8a93b] text-[#2a1420]">
              Ativar o movimento
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              dropSnow();
              setHint("off");
            }}
            className="snow-hint-btn bg-white text-[#2a1420]"
          >
            Derrubar agora
          </button>
        </div>
      </div>
    </div>
  );
}
