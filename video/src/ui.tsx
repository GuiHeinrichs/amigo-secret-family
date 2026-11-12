import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadKalam } from "@remotion/google-fonts/Kalam";
import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/* As mesmas fontes e cores do site, para o vídeo parecer parte dele. */
export const sans = loadBricolage("normal", {
  weights: ["500", "600", "700", "800"],
  subsets: ["latin"],
}).fontFamily;
export const hand = loadKalam("normal", { weights: ["700"], subsets: ["latin"] }).fontFamily;

export const C = {
  brand: "#c2183c",
  brandDark: "#7d1029",
  leaf: "#0e5a45",
  gold: "#e8a93b",
  ink: "#2a1420",
  inkSoft: "#6a4c58",
  paper: "#fff5f1",
  panel: "#fde3df",
  line: "#f1cfd0",
  field: "#ffffff",
  leafSoft: "#dcebe3",
};

export const W = 1080;
export const H = 1350;
export const BAND = 132;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const smooth = Easing.bezier(0.2, 0.8, 0.2, 1);

/** Vai de `from` a `to` entre os quadros `start` e `end`, com desaceleração suave. */
export function tween(frame: number, start: number, end: number, from = 0, to = 1) {
  return interpolate(frame, [start, end], [from, to], { ...clamp, easing: smooth });
}

/** Texto sendo digitado. */
export function typed(text: string, frame: number, start: number, end: number) {
  const n = Math.round(interpolate(frame, [start, end], [0, text.length], clamp));
  return text.slice(0, n);
}

/** Entrada com "pulinho": escala, sobe e aparece a partir do quadro `at`. */
export function Pop({
  at,
  children,
  style,
  rise = 26,
}: {
  at: number;
  children: ReactNode;
  style?: CSSProperties;
  rise?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - at, fps, config: { damping: 13, stiffness: 170, mass: 0.7 } });
  return (
    <div
      style={{
        opacity: Math.min(1, p * 1.6),
        transform: `translateY(${(1 - p) * rise}px) scale(${0.86 + 0.14 * p})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Papel de presente: bolinhas douradas sobre o vermelho da marca. */
export const wrap: CSSProperties = {
  backgroundColor: C.brand,
  backgroundImage: [
    "radial-gradient(circle at 21px 21px, #ecb752 7px, transparent 8px)",
    "radial-gradient(circle at 63px 63px, #ecb752 7px, transparent 8px)",
  ].join(","),
  backgroundSize: "84px 84px",
};

export function Bow({ size, color = C.brand }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 12c-2.5-4-6.5-5-7.5-3s1 5 7.5 3zm0 0c2.5-4 6.5-5 7.5-3s-1 5-7.5 3zm0 0-3 7m3-7 3 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const BULBS = ["#ffd24a", "#fff3c4", "#4fd28a", "#4aa3ff", "#ff7a59"];

/** Fio de luzinhas de Natal, piscando devagar. */
export function Garland({ y }: { y: number }) {
  const frame = useCurrentFrame();
  const span = 135;
  const count = Math.ceil(W / span) + 1;
  let wire = `M0 ${y}`;
  for (let i = 0; i < count; i++) wire += ` q${span / 2} 26 ${span} 0`;
  return (
    <svg width={W} height={y + 70} style={{ position: "absolute", left: 0, top: 0 }}>
      <path d={wire} stroke="#1f3b2e" strokeWidth={5} fill="none" />
      {Array.from({ length: count }, (_, i) => {
        const glow = 0.62 + 0.38 * Math.sin(frame / 9 + i * 1.7);
        const color = BULBS[i % BULBS.length];
        return (
          <g key={i} transform={`translate(${i * span + span / 2} ${y + 13})`}>
            <rect x={-6} y={-2} width={12} height={10} rx={2} fill="#1f3b2e" />
            <ellipse cx={0} cy={22} rx={20} ry={24} fill={color} opacity={glow * 0.35} />
            <ellipse cx={0} cy={20} rx={11} ry={15} fill={color} opacity={0.55 + glow * 0.45} />
          </g>
        );
      })}
    </svg>
  );
}

/** Neve leve, para as telas de abertura e encerramento. */
export function Snow({ count = 46 }: { count?: number }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const size = 6 + random(`s${i}`) * 12;
        const speed = 1.1 + random(`v${i}`) * 1.6;
        const x = random(`x${i}`) * W + Math.sin(frame / 34 + i) * 26;
        const y = ((random(`y${i}`) * H + frame * speed) % (H + 40)) - 20;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: "#fff",
              opacity: 0.35 + random(`o${i}`) * 0.45,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/** Mancha lisa atrás do texto das telas cheias, para as bolinhas não brigarem com as letras. */
export function Calm() {
  return (
    <div
      style={{
        position: "absolute",
        left: -260,
        right: -260,
        top: 230,
        height: 920,
        background: `radial-gradient(closest-side, ${C.brand} 76%, transparent)`,
      }}
    />
  );
}

/** Etiqueta "Laço", como a que fica pendurada no topo do site. */
export function Tag({ size = 46 }: { size?: number }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.3,
        padding: `${size * 0.36}px ${size * 0.62}px`,
        borderRadius: size * 0.32,
        background: "#fff",
        color: C.ink,
        fontSize: size,
        fontWeight: 800,
        lineHeight: 1,
        transform: "rotate(-1.5deg)",
        boxShadow: "0 3px 0 rgb(42 20 32 / 0.1), 0 22px 30px rgb(42 20 32 / 0.18)",
      }}
    >
      <Bow size={size * 1.08} />
      Laço
    </div>
  );
}

/**
 * Moldura de uma cena: faixa de papel de presente no topo, o título do que o
 * Laço faz e, embaixo, o palco com a tela ilustrando.
 */
export function Scene({
  title,
  sub,
  duration,
  children,
}: {
  title: string;
  sub: string;
  duration: number;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const visible = Math.min(tween(frame, 0, 12), tween(frame, duration - 10, duration, 1, 0));
  return (
    <AbsoluteFill style={{ background: C.paper, fontFamily: sans, color: C.ink }}>
      <div style={{ ...wrap, position: "absolute", inset: 0, height: BAND }} />
      <Garland y={BAND - 6} />
      <div style={{ position: "absolute", left: 64, top: 64 }}>
        <Tag />
      </div>

      <div style={{ position: "absolute", inset: 0, opacity: visible }}>
        <div
          style={{
            position: "absolute",
            left: 72,
            right: 72,
            top: 236,
            transform: `translateY(${tween(frame, 0, 16, 28, 0)}px)`,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 70,
              fontWeight: 800,
              lineHeight: 1.06,
              letterSpacing: "-0.02em",
              textWrap: "balance",
            }}
          >
            {title}
          </h1>
          <p
            style={{
              margin: "20px 0 0",
              fontSize: 37,
              fontWeight: 500,
              lineHeight: 1.3,
              color: C.inkSoft,
              textWrap: "pretty",
            }}
          >
            {sub}
          </p>
        </div>
        {children}
      </div>
    </AbsoluteFill>
  );
}

/** Celular espiando por baixo do quadro, com a tela do app dentro. */
export function Phone({ children, top = 560 }: { children: ReactNode; top?: number }) {
  const frame = useCurrentFrame();
  const width = 620;
  return (
    <div
      style={{
        position: "absolute",
        left: (W - width) / 2,
        top: top + tween(frame, 0, 20, 70, 0),
        width,
        height: 900,
        borderRadius: 64,
        background: C.ink,
        padding: 14,
        boxShadow: "0 30px 60px rgb(42 20 32 / 0.25)",
      }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          borderRadius: 52,
          background: C.paper,
          fontSize: 30,
          lineHeight: 1.3,
        }}
      >
        <div style={{ ...wrap, height: 58, backgroundSize: "56px 56px" }} />
        <div style={{ padding: "26px 34px 0" }}>{children}</div>
      </div>
    </div>
  );
}

export function ScreenTitle({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
      {children}
    </div>
  );
}

export function Btn({
  children,
  kind = "primary",
  pressed = false,
  style,
}: {
  children: ReactNode;
  kind?: "primary" | "quiet" | "leaf";
  pressed?: boolean;
  style?: CSSProperties;
}) {
  const look = {
    primary: { background: C.brand, color: "#fff", edge: C.brandDark, inset: "none" },
    leaf: { background: C.leaf, color: "#fff", edge: "#083a2c", inset: "none" },
    quiet: { background: "#fff", color: C.ink, edge: C.ink, inset: `inset 0 0 0 4px ${C.ink}` },
  }[kind];
  const drop = pressed ? 2 : 7;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        minHeight: 84,
        padding: "0 40px",
        borderRadius: 999,
        fontSize: 31,
        fontWeight: 700,
        whiteSpace: "nowrap",
        background: look.background,
        color: look.color,
        boxShadow: [look.inset, `0 ${drop}px 0 ${look.edge}`].filter((s) => s !== "none").join(","),
        transform: `translateY(${pressed ? 5 : 0}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Avatar({ emoji, color, size = 76 }: { emoji: string; color: string; size?: number }) {
  return (
    <div
      style={{
        flex: "none",
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        fontSize: size * 0.52,
        lineHeight: 1,
      }}
    >
      {emoji}
    </div>
  );
}

export function Chip({
  children,
  on = false,
  style,
}: {
  children: ReactNode;
  on?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 22px",
        borderRadius: 999,
        fontSize: 26,
        fontWeight: 600,
        background: on ? C.leafSoft : C.panel,
        color: on ? C.leaf : C.ink,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Cartão com contorno e "altura" de adesivo, como os itens da lista no site. */
export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        borderRadius: 30,
        background: "#fff",
        padding: "22px 26px",
        boxShadow: `inset 0 0 0 4px ${C.ink}, 0 7px 0 ${C.ink}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ borderRadius: 36, background: C.panel, padding: 30, ...style }}>{children}</div>
  );
}

/** Marca de toque do dedo na tela. */
export function Tap({ at, x, y }: { at: number; x: number; y: number }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < -8 || t > 16) return null;
  const size = 110;
  const scale = t < 0 ? tween(t, -8, 0, 1.7, 1) : tween(t, 0, 16, 1, 1.5);
  const opacity = t < 0 ? tween(t, -8, 0, 0, 0.3) : tween(t, 0, 16, 0.3, 0);
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: C.ink,
        opacity,
        transform: `scale(${scale})`,
      }}
    />
  );
}

const CONFETTI = [C.brand, C.gold, C.leaf, "#4aa3ff", "#ff9fb0"];

/** Chuva de confete a partir de um ponto. */
export function Confetti({ at, x, y, count = 70 }: { at: number; x: number; y: number; count?: number }) {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 70) return null;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const angle = -Math.PI / 2 + (random(`a${i}`) - 0.5) * 2.6;
        const speed = 11 + random(`p${i}`) * 17;
        const px = x + Math.cos(angle) * speed * t;
        const py = y + Math.sin(angle) * speed * t + 0.42 * t * t;
        const size = 12 + random(`z${i}`) * 12;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px,
              top: py,
              width: size,
              height: size * 0.62,
              borderRadius: 3,
              background: CONFETTI[i % CONFETTI.length],
              opacity: tween(t, 40, 70, 1, 0),
              transform: `rotate(${t * (8 + random(`r${i}`) * 14)}deg)`,
            }}
          />
        );
      })}
    </>
  );
}
