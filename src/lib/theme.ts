/**
 * Tema visual escolhido por quem usa: "natal" (padrão) ou "festa".
 * Fica no localStorage e é aplicado em <html data-tema> por um script que
 * roda antes da primeira pintura, para a página não piscar no tema errado.
 */
export type Theme = "natal" | "festa";

export const THEMES: { key: Theme; label: string }[] = [
  { key: "natal", label: "Natal" },
  { key: "festa", label: "Festa" },
];

const STORAGE_KEY = "laco_tema";
const EVENT = "laco:tema";

/** Vai inline no <head>; precisa ser autossuficiente. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${STORAGE_KEY}");document.documentElement.dataset.tema=t==="festa"?"festa":"natal"}catch(e){document.documentElement.dataset.tema="natal"}`;

export function readTheme(): Theme {
  return document.documentElement.dataset.tema === "festa" ? "festa" : "natal";
}

export function writeTheme(theme: Theme) {
  document.documentElement.dataset.tema = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Sem armazenamento (aba privada restrita): vale só para esta página.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeTheme(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
