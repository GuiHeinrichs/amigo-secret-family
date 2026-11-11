import type { ReactNode } from "react";
import { formatMoney } from "@/lib/format";
import type { Wish } from "@/server/db/schema";

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

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
  if (wishes.length === 0) return <p className="text-ink-soft">{empty}</p>;
  return (
    <ul>
      {wishes.map((wish) => (
        <li key={wish.id} className="flex items-start gap-3 border-b-2 border-dashed border-line py-3">
          <div className="min-w-0 flex-1">
            <p className="font-bold">
              {wish.title}
              {wish.price != null && (
                <span className="hint font-semibold"> cerca de {formatMoney(wish.price)}</span>
              )}
            </p>
            {wish.note && <p className="text-ink-soft">{wish.note}</p>}
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
          </div>
          {action?.(wish)}
        </li>
      ))}
    </ul>
  );
}
