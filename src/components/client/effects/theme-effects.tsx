"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "../theme-switch";
import { publishSnowLevel, startParticles } from "./particles";

/**
 * Camada de partículas do tema, montada uma vez no layout. Quem pediu menos
 * movimento ao sistema não vê partículas; no Natal a neve acumulada continua
 * crescendo com o tempo, só que sem animação.
 */
export function ThemeEffects() {
  const theme = useTheme();
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (theme !== "natal") return;
      publishSnowLevel();
      const timer = setInterval(publishSnowLevel, 10_000);
      return () => clearInterval(timer);
    }
    return startParticles(element, theme);
  }, [theme]);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-40 h-full w-full"
    />
  );
}
