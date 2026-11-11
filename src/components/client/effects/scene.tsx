"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useTheme } from "../theme-switch";

const ORNAMENTS = [
  { x: 49, y: 58, color: "#ffd24a" },
  { x: 70, y: 62, color: "#ff5d73" },
  { x: 41, y: 90, color: "#58b3ff" },
  { x: 62, y: 86, color: "#ffd24a" },
  { x: 80, y: 94, color: "#ff5d73" },
  { x: 33, y: 124, color: "#ff5d73" },
  { x: 54, y: 119, color: "#58b3ff" },
  { x: 75, y: 126, color: "#ffd24a" },
  { x: 92, y: 123, color: "#ffffff" },
];

function ChristmasTree({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 152" className={`arvore ${className}`}>
      <rect x="54" y="130" width="12" height="20" rx="2" fill="#7a4a2b" />
      <g strokeLinejoin="round" strokeWidth="6">
        <path className="galho" d="M60 72 102 132H18Z" fill="#0f6a4f" stroke="#0f6a4f" />
        <path className="galho" d="M60 46 92 100H28Z" fill="#128058" stroke="#128058" />
        <path className="galho" d="M60 22 83 66H37Z" fill="#17966a" stroke="#17966a" />
      </g>
      {/* Neve pousada na borda de cada andar. */}
      <g className="galho" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round">
        <path d="M42 66q6 6 12 0t12 0 12 0" />
        <path d="M33 100q7 7 14 0t14 0 14 0 12 0" />
        <path d="M23 132q8 7 15 0t15 0 15 0 15 0 14 0" />
      </g>
      {ORNAMENTS.map((ornament) => (
        <circle
          key={`${ornament.x}-${ornament.y}`}
          className="enfeite"
          cx={ornament.x}
          cy={ornament.y}
          r="4.5"
          fill={ornament.color}
        />
      ))}
      <path
        className="estrela"
        d="M60 2l4.1 8.6 9.4 1.2-6.9 6.5 1.8 9.3L60 23l-8.4 4.6 1.8-9.3-6.9-6.5 9.4-1.2z"
        fill="#ffd24a"
        style={{ filter: "drop-shadow(0 0 4px #ffd24a)" }}
      />
    </svg>
  );
}

function Balloon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g className="balao">
      <path d={`M${x} ${y + 36}q-7 26 3 62`} fill="none" stroke="#9a9ab0" strokeWidth="1.5" />
      <ellipse cx={x} cy={y} rx="27" ry="33" fill={color} />
      <path d={`M${x - 5} ${y + 32}h10l-5 8z`} fill={color} />
      <ellipse cx={x - 9} cy={y - 12} rx="6" ry="10" fill="#ffffff" opacity="0.35" />
    </g>
  );
}

/**
 * Cena decorativa no pé da página: árvores na neve no tema Natal, balões e
 * serpentina no tema Festa. Como o enfeite do cabeçalho, as duas versões vão
 * no HTML e o CSS mostra só a do tema ativo.
 */
export function Scene() {
  const theme = useTheme();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = root.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      if (theme === "natal") {
        // As árvores crescem andar por andar, a estrela gira até o topo e os
        // enfeites vão aparecendo; depois tudo fica balançando e piscando.
        gsap
          .timeline()
          .from(".galho", {
            scaleY: 0,
            scaleX: 0.5,
            transformOrigin: "50% 100%",
            duration: 0.55,
            stagger: 0.07,
            ease: "back.out(1.6)",
          })
          .from(
            ".estrela",
            { scale: 0, rotate: -200, transformOrigin: "50% 50%", duration: 0.7, stagger: 0.12, ease: "back.out(2)" },
            "-=0.3",
          )
          .from(
            ".enfeite",
            { scale: 0, transformOrigin: "50% 50%", duration: 0.3, stagger: 0.03, ease: "back.out(3)" },
            "-=0.5",
          );
        gsap.to(".estrela", {
          scale: 1.2,
          transformOrigin: "50% 50%",
          duration: 0.9,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: 1.6,
        });
        gsap.to(".enfeite", {
          opacity: 0.4,
          duration: 0.8,
          ease: "sine.inOut",
          delay: 1.6,
          stagger: { each: 0.19, from: "random", repeat: -1, yoyo: true },
        });
        gsap.fromTo(
          ".arvore",
          { rotate: -1.6 },
          {
            rotate: 1.6,
            transformOrigin: "50% 100%",
            duration: 2.8,
            ease: "sine.inOut",
            stagger: { each: 0.5, repeat: -1, yoyo: true },
          },
        );
      } else {
        gsap.from(".balao", { y: 70, opacity: 0, duration: 0.9, stagger: 0.15, ease: "power3.out" });
        gsap.to(".balao", {
          y: -9,
          rotate: 2.5,
          transformOrigin: "50% 100%",
          duration: 2.3,
          ease: "sine.inOut",
          delay: 1,
          stagger: { each: 0.45, repeat: -1, yoyo: true },
        });
        gsap.fromTo(
          ".serpentina",
          { strokeDashoffset: 220 },
          { strokeDashoffset: 0, duration: 1.4, stagger: 0.2, ease: "power2.out" },
        );
      }
    }, element);
    return () => context.revert();
  }, [theme]);

  return (
    <div ref={root} aria-hidden="true" className="pointer-events-none mx-auto mt-12 max-w-md">
      <div className="so-natal relative h-44">
        <ChristmasTree className="absolute bottom-5 left-[8%] w-24" />
        <ChristmasTree className="absolute bottom-6 left-1/2 w-32 -translate-x-1/2" />
        <ChristmasTree className="absolute bottom-4 right-[9%] w-20" />
        {/* O monte de neve engrossa junto com o resto. */}
        <svg
          viewBox="0 0 400 44"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-11 w-full"
          style={{
            transform: "scaleY(calc(0.7 + var(--snow, 0.1) * 0.7))",
            transformOrigin: "50% 100%",
            transition: "transform 3s ease",
          }}
        >
          <path
            d="M2 44C28 20 84 6 130 16c40-14 96-16 140-4 46-10 104-2 128 32z"
            fill="#ffffff"
            stroke="#b9cbe3"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="so-festa">
        <svg viewBox="0 0 260 150" className="mx-auto h-44">
          <path
            className="serpentina"
            d="M14 20c22 8 4 26 26 32s8 24 30 30"
            fill="none"
            stroke="var(--gold)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="220"
          />
          <path
            className="serpentina"
            d="M246 14c-24 10-4 26-26 34s-6 24-28 32"
            fill="none"
            stroke="#ff7aa8"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="220"
          />
          <Balloon x={88} y={52} color="var(--brand-base)" />
          <Balloon x={132} y={38} color="var(--gold)" />
          <Balloon x={176} y={54} color="var(--leaf-base)" />
        </svg>
      </div>
    </div>
  );
}
