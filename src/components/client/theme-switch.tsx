"use client";

import { useSyncExternalStore } from "react";
import { readTheme, subscribeTheme, THEMES, writeTheme, type Theme } from "@/lib/theme";

/** No servidor não há como saber o tema salvo; vale o padrão até hidratar. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, readTheme, () => "natal");
}

export function ThemeSwitch({ className = "inline-flex" }: { className?: string }) {
  const theme = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={`flex-none rounded-full bg-white p-1 text-sm font-bold text-[#2a1420] shadow-[0_3px_0_rgb(0_0_0/0.2)] ${className}`}
    >
      {THEMES.map((option) => {
        const active = option.key === theme;
        return (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => writeTheme(option.key)}
            className={`rounded-full px-3 py-1.5 ${active ? "bg-[#2a1420] text-white" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
