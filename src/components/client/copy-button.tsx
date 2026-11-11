"use client";

import { useState } from "react";
import { Icon } from "../icons";

export function CopyButton({
  value,
  label = "Copiar link",
  className = "btn btn-sm btn-quiet",
  iconOnly = false,
}: {
  value: string;
  label?: string;
  className?: string;
  /** Mostra só o ícone; o rótulo continua disponível para leitores de tela. */
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Navegadores sem permissão de área de transferência: seleção manual.
      window.prompt("Copie o link:", value);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      className={`${className} ${iconOnly ? "!px-3" : ""}`}
      onClick={copy}
      title={iconOnly ? label : undefined}
    >
      <Icon name={copied ? "check" : "copy"} size={18} />
      <span aria-live="polite" className={iconOnly ? "sr-only" : undefined}>
        {copied ? "Copiado" : label}
      </span>
    </button>
  );
}
