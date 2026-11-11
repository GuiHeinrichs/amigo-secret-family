"use client";

import confetti from "canvas-confetti";

/** Confete nas cores da ocasião. Não dispara se a pessoa pediu menos movimento. */
export function celebrate(origin?: HTMLElement | null) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const scope = origin?.closest(".theme") ?? document.body;
  const style = getComputedStyle(scope);
  const colors = ["--brand-base", "--gold", "--leaf-base"]
    .map((name) => style.getPropertyValue(name).trim())
    .filter(Boolean);
  const shared = { colors: [...colors, "#ffffff"], disableForReducedMotion: true };
  confetti({ ...shared, particleCount: 90, spread: 75, startVelocity: 42, origin: { y: 0.6 } });
  setTimeout(() => {
    confetti({ ...shared, particleCount: 50, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } });
    confetti({ ...shared, particleCount: 50, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } });
  }, 220);
}
