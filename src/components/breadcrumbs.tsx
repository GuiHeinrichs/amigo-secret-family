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
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Você está em" className="min-w-0">
      <ol className="no-scrollbar inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-slip px-3 py-1.5 text-sm font-semibold text-slip-ink">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          const text = <span className="block max-w-[11rem] truncate">{item.label}</span>;
          return (
            <Fragment key={`${index}-${item.label}`}>
              {index > 0 && (
                <li aria-hidden="true" className="flex-none opacity-50">
                  <Icon name="chevronRight" size={14} />
                </li>
              )}
              <li className="flex-none" aria-current={current ? "page" : undefined}>
                {current ? (
                  <span className="font-extrabold">{text}</span>
                ) : item.href ? (
                  <Link href={item.href} className="underline decoration-2 underline-offset-4">
                    {text}
                  </Link>
                ) : item.onSelect ? (
                  <button
                    type="button"
                    onClick={item.onSelect}
                    className="underline decoration-2 underline-offset-4"
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
