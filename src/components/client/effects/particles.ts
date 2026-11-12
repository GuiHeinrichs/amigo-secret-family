import type { Theme } from "@/lib/theme";

/*
 * Partículas de fundo, desenhadas num <canvas> que cobre a tela e não
 * intercepta toques. No Natal é neve, que engrossa conforme o tempo de uso;
 * na Festa é um confete esparso que cai devagar.
 *
 * Dois cuidados com a neve: os flocos quase somem ao passar por cima de
 * textos, para não atrapalhar a leitura, e a neve acumulada nos componentes
 * pode ser derrubada (balançando o celular, por exemplo) com dropSnow().
 */

const SNOW_START_KEY = "laco_neve_inicio";
/** Tempo de uso até a neve chegar ao máximo. */
const SNOW_FULL_MS = 8 * 60_000;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Quanto de neve já caiu, de 0 a 1. Conta a partir da primeira página aberta
 * nesta aba, então continua crescendo ao navegar pelo app. `?neve=0.8` na
 * URL fixa um valor, para ver o efeito sem esperar.
 */
export function snowLevel(): number {
  const override = new URLSearchParams(window.location.search).get("neve");
  // Depois de derrubada, a neve volta a acumular do zero mesmo com ?neve= na URL.
  if (!dropped && override !== null && override !== "" && !Number.isNaN(Number(override))) {
    return clamp(Number(override), 0, 1);
  }
  let start = Number(sessionStorage.getItem(SNOW_START_KEY));
  if (!start) {
    start = Date.now();
    try {
      sessionStorage.setItem(SNOW_START_KEY, String(start));
    } catch {
      // sem sessionStorage: a contagem recomeça a cada página
    }
  }
  const t = clamp((Date.now() - start) / SNOW_FULL_MS, 0, 1);
  // Já começa com uma poeirinha e cresce mais rápido no início.
  return 0.08 + 0.92 * (1 - Math.pow(1 - t, 1.6));
}

/** Publica o nível em --snow, que o CSS usa para a neve acumulada. */
export function publishSnowLevel(): number {
  const level = snowLevel();
  document.documentElement.style.setProperty("--snow", level.toFixed(3));
  return level;
}

let dropped = false;

/** Avisa a camada de partículas de que a neve acumulada vai cair. */
const SNOW_DROP_EVENT = "laco:neve-cai";

/**
 * Derruba a neve acumulada no topo dos componentes: ela despenca em flocos
 * grandes e volta a acumular do zero. Devolve false fora do tema de Natal.
 */
export function dropSnow(): boolean {
  const root = document.documentElement;
  if (root.dataset.tema === "festa") return false;
  window.dispatchEvent(new CustomEvent<number>(SNOW_DROP_EVENT, { detail: snowLevel() }));
  dropped = true;
  try {
    sessionStorage.setItem(SNOW_START_KEY, String(Date.now()));
  } catch {
    // sem sessionStorage a contagem já recomeça sozinha
  }
  // Durante a queda a neve some rápido, em vez de derreter devagar.
  root.classList.add("snow-drop");
  publishSnowLevel();
  setTimeout(() => root.classList.remove("snow-drop"), 900);
  navigator.vibrate?.(35);
  return true;
}

type Flake = {
  x: number;
  y: number;
  r: number;
  vy: number;
  phase: number;
  sway: number;
  alpha: number;
  /** 1 = visível; cai para perto de 0 enquanto o floco passa sobre um texto. */
  dim: number;
  /** Empurrão lateral de quando alguém balança o celular. */
  jolt: number;
};
/** Pedaço de neve que despenca de cima de um componente. */
type Clump = { x: number; y: number; r: number; vx: number; vy: number; delay: number };
type Box = { left: number; top: number; right: number; bottom: number };

/** O que conta como texto para a neve desviar. */
const TEXT = "h1,h2,h3,h4,p,li,label,dt,dd,summary,input,textarea,select,.btn,.chip";
/** Onde a neve acumula (ver globals.css). */
const SNOWY = ".panel,.btn-primary,.snowy";
type Confetto = {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  vx: number;
  rot: number;
  vr: number;
  flip: number;
  vflip: number;
  color: string;
  round: boolean;
};

export function startParticles(canvas: HTMLCanvasElement, theme: Theme): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  let width = 0;
  let height = 0;
  let frame = 0;
  let last = performance.now();
  let level = theme === "natal" ? publishSnowLevel() : 0;
  let levelCheckedAt = last;
  const dark = window.matchMedia("(prefers-color-scheme: dark)");

  const resize = () => {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  /** Telas maiores comportam mais partículas, até um teto. */
  const density = () => clamp((width * height) / (390 * 800), 0.7, 2.4);

  // ——— Neve ———
  const flakes: Flake[] = [];
  const newFlake = (top: boolean): Flake => ({
    x: rand(0, width),
    y: top ? rand(-20, -4) : rand(0, height),
    r: rand(1.2, 3.4),
    vy: rand(22, 58),
    phase: rand(0, Math.PI * 2),
    sway: rand(8, 26),
    alpha: rand(0.55, 1),
    dim: 1,
    jolt: 0,
  });

  // Áreas de texto na tela, medidas de tempos em tempos e depois de rolar.
  let textBoxes: Box[] = [];
  let measuredAt = -Infinity;
  const measureText = () => {
    const boxes: Box[] = [];
    for (const element of document.querySelectorAll(TEXT)) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.bottom < 0 || rect.top > height) continue;
      boxes.push({
        left: rect.left - 6,
        top: rect.top - 4,
        right: rect.right + 6,
        bottom: rect.bottom + 4,
      });
      if (boxes.length >= 160) break;
    }
    textBoxes = boxes;
  };
  const remeasureSoon = () => {
    measuredAt = -Infinity;
  };
  window.addEventListener("scroll", remeasureSoon, { passive: true });

  // ——— Neve que despenca dos componentes ———
  const clumps: Clump[] = [];
  const onDrop = (event: Event) => {
    const amount = (event as CustomEvent<number>).detail ?? level;
    for (const element of document.querySelectorAll(SNOWY)) {
      const rect = element.getBoundingClientRect();
      if (rect.width < 24 || rect.bottom < 0 || rect.top > height) continue;
      const button = element.classList.contains("btn-primary");
      const inset = button ? 14 : 8;
      const cap = button ? 2 + amount * 10 : 3 + amount * 20;
      const count = Math.min(90, Math.round(((rect.width - inset * 2) / 9) * (0.35 + amount)));
      for (let i = 0; i < count; i++) {
        clumps.push({
          x: rand(rect.left + inset, rect.right - inset),
          y: rect.top - rand(0, cap),
          r: rand(1.8, 2.6 + amount * 3.2),
          vx: rand(-70, 70),
          vy: rand(-150, -10),
          delay: rand(0, 0.22),
        });
      }
    }
    if (clumps.length > 700) clumps.splice(0, clumps.length - 700);
    // Os flocos que estão no ar também levam o tranco.
    for (const flake of flakes) flake.jolt = rand(-260, 260);
  };
  window.addEventListener(SNOW_DROP_EVENT, onDrop);

  // ——— Confete ———
  const style = getComputedStyle(document.body);
  const palette = [
    style.getPropertyValue("--brand-base").trim() || "#7b3fe4",
    style.getPropertyValue("--gold").trim() || "#ffbe2e",
    style.getPropertyValue("--leaf-base").trim() || "#0b8f87",
    "#ff7aa8",
    "#4db5ff",
  ];
  const confetti: Confetto[] = [];
  const newConfetto = (top: boolean): Confetto => ({
    x: rand(0, width),
    y: top ? rand(-30, -8) : rand(0, height),
    w: rand(5, 9),
    h: rand(8, 14),
    vy: rand(16, 38),
    vx: rand(-8, 8),
    rot: rand(0, Math.PI * 2),
    vr: rand(-1.2, 1.2),
    flip: rand(0, Math.PI * 2),
    vflip: rand(1.5, 3.5),
    color: palette[Math.floor(Math.random() * palette.length)],
    round: Math.random() < 0.25,
  });

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (document.hidden) return;
    ctx.clearRect(0, 0, width, height);

    if (theme === "natal") {
      if (now - levelCheckedAt > 2000) {
        level = publishSnowLevel();
        levelCheckedAt = now;
      }
      if (now - measuredAt > 500) {
        measureText();
        measuredAt = now;
      }
      const target = Math.round((22 + level * 96) * density());
      while (flakes.length < target) flakes.push(newFlake(flakes.length > 12));
      if (flakes.length > target) flakes.length = target;

      const wind = Math.sin(now / 5000) * 14;
      const speed = 1 + level * 0.5;
      const onDark = dark.matches;
      for (const flake of flakes) {
        flake.phase += dt * 1.1;
        flake.y += flake.vy * speed * dt;
        flake.x += (Math.sin(flake.phase) * flake.sway + wind + flake.jolt) * dt;
        flake.jolt *= Math.pow(0.04, dt);
        if (flake.y > height + 6) Object.assign(flake, newFlake(true));
        if (flake.x < -10) flake.x = width + 8;
        if (flake.x > width + 10) flake.x = -8;

        // Sobre um texto o floco esmaece, e volta a aparecer ao sair de cima.
        const overText = textBoxes.some(
          (box) =>
            flake.x > box.left && flake.x < box.right && flake.y > box.top && flake.y < box.bottom,
        );
        flake.dim += ((overText ? 0.16 : 1) - flake.dim) * Math.min(1, dt * 9);

        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
        // No papel claro o floco branco some: ali ele ganha um azul bem suave.
        ctx.fillStyle = onDark
          ? `rgba(255,255,255,${flake.alpha * flake.dim})`
          : `rgba(176,200,232,${flake.alpha * 0.85 * flake.dim})`;
        ctx.fill();
      }

      for (let i = clumps.length - 1; i >= 0; i--) {
        const clump = clumps[i];
        if (clump.delay > 0) {
          clump.delay -= dt;
        } else {
          clump.vy += 1150 * dt;
          clump.x += clump.vx * dt;
          clump.y += clump.vy * dt;
          if (clump.y > height + 12) {
            clumps.splice(i, 1);
            continue;
          }
        }
        ctx.beginPath();
        ctx.arc(clump.x, clump.y, clump.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.97)";
        ctx.fill();
        if (!onDark) {
          ctx.lineWidth = 1;
          ctx.strokeStyle = "rgba(125,155,195,0.6)";
          ctx.stroke();
        }
      }
      return;
    }

    const target = Math.round(22 * density());
    while (confetti.length < target) confetti.push(newConfetto(confetti.length > 8));
    for (const piece of confetti) {
      piece.y += piece.vy * dt;
      piece.x += (piece.vx + Math.sin(now / 900 + piece.rot) * 6) * dt;
      piece.rot += piece.vr * dt;
      piece.flip += piece.vflip * dt;
      if (piece.y > height + 16) Object.assign(piece, newConfetto(true));

      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rot);
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = piece.color;
      if (piece.round) {
        ctx.beginPath();
        ctx.arc(0, 0, piece.w / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // O papelzinho gira no próprio eixo: a altura "aperta" e volta.
        const squash = Math.abs(Math.cos(piece.flip));
        ctx.fillRect(-piece.w / 2, (-piece.h * squash) / 2, piece.w, piece.h * squash);
      }
      ctx.restore();
    }
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    window.removeEventListener("scroll", remeasureSoon);
    window.removeEventListener(SNOW_DROP_EVENT, onDrop);
    ctx.clearRect(0, 0, width, height);
  };
}
