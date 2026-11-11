"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useTheme } from "../theme-switch";

/** Bem mais do que cabe em qualquer tela; o que sobra fica cortado. */
const SEGMENTS = Array.from({ length: 48 }, (_, index) => index);
const BULBS = ["#ffd24a", "#fff3d6", "#4fd68a", "#58b3ff", "#ff9ab8"];
const FLAGS = ["var(--brand-base)", "var(--gold)", "var(--leaf-base)", "#ff7aa8", "#4db5ff"];

/**
 * Enfeite pendurado na faixa do cabeçalho: pisca-pisca no tema Natal,
 * bandeirinhas no tema Festa. Os dois vão no HTML e o CSS mostra só o do
 * tema ativo, para nada trocar de lugar depois de a página hidratar.
 */
export function Garland() {
  const theme = useTheme();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      if (theme === "natal") {
        // Cada lâmpada pisca no seu tempo e balança de leve no fio.
        gsap.to(".luz", {
          opacity: 0.3,
          duration: 0.75,
          ease: "sine.inOut",
          stagger: { each: 0.17, from: "random", repeat: -1, yoyo: true },
        });
        gsap.fromTo(
          ".luz-pendente",
          { rotate: -6 },
          {
            rotate: 6,
            duration: 2.4,
            ease: "sine.inOut",
            transformOrigin: "50% 0%",
            stagger: { each: 0.11, repeat: -1, yoyo: true },
          },
        );
      } else {
        // As bandeirinhas ondulam em sequência, como se passasse um vento.
        gsap.fromTo(
          ".bandeira",
          { rotate: -7 },
          {
            rotate: 7,
            duration: 1.7,
            ease: "sine.inOut",
            transformOrigin: "50% 0%",
            stagger: { each: 0.09, repeat: -1, yoyo: true },
          },
        );
      }
    }, element);
    return () => context.revert();
  }, [theme]);

  return (
    <div
      ref={root}
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 -bottom-3 h-9 overflow-hidden"
    >
      <div className="so-natal flex">
        {SEGMENTS.map((index) => {
          const color = BULBS[index % BULBS.length];
          return (
            <svg key={index} width="44" height="36" viewBox="0 0 44 36" className="flex-none">
              <path d="M0 4Q22 17 44 4" fill="none" stroke="#123f2c" strokeWidth="2" />
              <g className="luz-pendente">
                <rect x="19.5" y="9.5" width="5" height="5" rx="1" fill="#2b2b2b" />
                <ellipse
                  className="luz"
                  cx="22"
                  cy="21"
                  rx="5"
                  ry="7"
                  fill={color}
                  style={{ filter: `drop-shadow(0 0 5px ${color})` }}
                />
              </g>
            </svg>
          );
        })}
      </div>
      <div className="so-festa flex">
        {SEGMENTS.map((index) => (
          <svg key={index} width="50" height="36" viewBox="0 0 50 36" className="flex-none">
            <path d="M0 3Q25 13 50 3" fill="none" stroke="#9a9ab0" strokeWidth="1.5" />
            <polygon
              className="bandeira"
              points="13,7.5 37,7.5 25,31"
              fill={FLAGS[index % FLAGS.length]}
            />
          </svg>
        ))}
      </div>
    </div>
  );
}
