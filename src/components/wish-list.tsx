import type { ReactNode } from "react";
import { formatMoney } from "@/lib/format";
import type { Wish } from "@/server/db/schema";
import { Icon } from "./icons";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

/**
 * Itens de uma lista de desejos. Cada item é um cartão com contorno e "altura"
 * de adesivo, para a lista não se perder no meio dos formulários da página.
 */
export function WishList({
  wishes,
  empty,
  action,
}: {
  wishes: Wish[];
  empty: string;
  /** Botão ao lado de cada item (ex.: apagar, na lista da própria pessoa). */
  action?: (wish: Wish) => ReactNode;
}) {
  if (wishes.length === 0) {
    return (
      <p className="rounded-[18px] border-2 border-dashed border-line px-4 py-5 text-ink-soft">
        {empty}
      </p>
    );
  }
  return (
    <ul className="grid gap-3">
      {wishes.map((wish) => (
        <li key={wish.id} className="wish">
          <span className="wish-mark" aria-hidden="true">
            <Icon name="bow" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold leading-snug [overflow-wrap:anywhere]">
              {wish.title}
            </p>
            {wish.note && <p className="text-ink-soft [overflow-wrap:anywhere]">{wish.note}</p>}
            {(wish.price != null || wish.url) && (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                {wish.price != null && (
                  <span className="chip !py-0.5">cerca de {formatMoney(wish.price)}</span>
                )}
                {wish.url && (
                  <a
                    href={wish.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="font-semibold underline underline-offset-4"
                  >
                    Ver em {hostOf(wish.url)}
                  </a>
                )}
              </p>
            )}
          </div>
          {action?.(wish)}
        </li>
      ))}
    </ul>
  );
}
