import Link from "next/link";
import { Fragment } from "react";
import { Icon } from "./icons";

export type Crumb = {
  label: string;
  /** Página para onde este nível leva. */
  href?: string;
  /** Para níveis que não são páginas, como os passos de um assistente. */
  onSelect?: () => void;
};

/**
 * Botão de voltar, bem visível no topo do conteúdo. Leva sempre ao nível de
 * cima (e não ao histórico do navegador), para o destino ser previsível.
 */
export function BackButton({
  href,
  onSelect,
  to,
}: {
  href?: string;
  onSelect?: () => void;
  /** Nome do destino, lido por leitores de tela: "Voltar para …". */
  to: string;
}) {
  const className = "btn btn-quiet btn-sm";
  const content = (
    <>
      <Icon name="back" size={18} />
      Voltar
      <span className="sr-only"> para {to}</span>
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" className={className} onClick={onSelect}>
      {content}
    </button>
  );
}

/**
 * Trilha "onde estou": cada nível anterior é um atalho para voltar e o
 * último é a página atual. Fica sobre o papel de presente do cabeçalho,
 * numa etiqueta clara para o texto continuar legível.
 *
 * Quando não cabe tudo, quem encolhe (com reticências) são os níveis do meio:
 * o primeiro e, principalmente, a página atual continuam inteiros. A página
 * atual só encolhe se, mesmo com o meio no mínimo, ainda faltar espaço.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Você está em" className="min-w-0">
      <ol className="inline-flex max-w-full items-center gap-1 rounded-full bg-slip px-3 py-1.5 text-sm font-semibold text-slip-ink">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          const text = <span className="block truncate">{item.label}</span>;
          // O fator de encolhimento alto faz o meio ceder todo o espaço antes
          // de a página atual perder um pixel sequer.
          const fit =
            index === 0
              ? "flex-none"
              : current
                ? "min-w-0 max-w-[11rem] shrink"
                : "min-w-8 max-w-[11rem] shrink-[100000]";
          return (
            <Fragment key={`${index}-${item.label}`}>
              {index > 0 && (
                <li aria-hidden="true" className="flex-none opacity-50">
                  <Icon name="chevronRight" size={14} />
                </li>
              )}
              <li className={fit} aria-current={current ? "page" : undefined}>
                {current ? (
                  <span className="block font-extrabold">{text}</span>
                ) : item.href ? (
                  <Link
                    href={item.href}
                    title={item.label}
                    className="block underline decoration-2 underline-offset-4"
                  >
                    {text}
                  </Link>
                ) : item.onSelect ? (
                  <button
                    type="button"
                    onClick={item.onSelect}
                    title={item.label}
                    className="block max-w-full underline decoration-2 underline-offset-4"
                  >
                    {text}
                  </button>
                ) : (
                  text
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
