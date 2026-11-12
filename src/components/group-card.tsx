import Link from "next/link";
import type { CSSProperties } from "react";
import { formatEventDate } from "@/lib/format";
import { modeOf, occasionOf, occasionVars } from "@/lib/occasions";
import type { listMyGroups } from "@/server/queries";
import { countdown } from "./event-details";
import { Icon } from "./icons";

export type MyGroup = Awaited<ReturnType<typeof listMyGroups>>[number];

/** `live`: o sorteio já saiu e ainda há o que fazer no grupo. */
const STATUS: Record<string, { label: string; live: boolean }> = {
  montando: { label: "Esperando o sorteio", live: false },
  sorteando: { label: "Sorteio aberto", live: true },
  sorteado: { label: "Sorteio feito", live: true },
  festa: { label: "Em festa", live: true },
  encerrado: { label: "Encerrado", live: false },
};

/**
 * Um grupo da conta, embrulhado como presente: faixa de papel nas cores da
 * ocasião, fita, e o emoji no lugar do laço. O cartão inteiro é o link para o
 * grupo. `quiet` tira o contorno forte, para os grupos já encerrados.
 */
export function GroupCard({ entry, quiet = false }: { entry: MyGroup; quiet?: boolean }) {
  const { group, isAdmin, names } = entry;
  const occasion = occasionOf(group.occasion);
  const status = STATUS[group.status] ?? STATUS.montando;
  const when = formatEventDate(group.eventDate, group.eventTime);

  return (
    <Link
      // Quem só organiza, sem participar, cai direto no painel.
      href={names.length > 0 ? `/g/${group.slug}` : `/g/${group.slug}/admin`}
      // .theme recalcula as cores a partir da ocasião deste grupo.
      className={`theme snowy group-card ${quiet ? "group-card-quiet" : ""}`}
      data-mode={group.mode}
      style={occasionVars(occasion) as CSSProperties}
    >
      <span className="wrap group-card-band" aria-hidden="true">
        <span className="ribbon group-card-ribbon" />
      </span>

      <span className="group-card-body">
        <span className="group-card-bow" aria-hidden="true">
          {occasion.emoji}
        </span>
        <span className="min-w-0 pt-2.5">
          <span className="line-clamp-2 text-balance text-xl font-extrabold leading-tight">
            {group.name}
          </span>
          <span className="hint mt-0.5 block">
            {occasion.label}, {modeOf(group.mode).label}
          </span>
        </span>

        <span className="col-span-2 mt-3.5 flex flex-wrap gap-2">
          <span className={`chip ${status.live ? "chip-on" : ""}`}>{status.label}</span>
          {isAdmin && (
            <span className="chip">
              <Icon name="gear" size={16} />
              Você organiza
            </span>
          )}
        </span>

        {when && (
          <span className="col-span-2 mt-3 flex items-start gap-2 font-semibold">
            <Icon name="calendar" size={20} className="mt-0.5 flex-none text-ink-soft" />
            <span>
              <span className="block text-balance first-letter:uppercase">{when}.</span>
              {group.eventDate && group.status !== "encerrado" && (
                <span className="block text-brand">{countdown(group.eventDate)}</span>
              )}
            </span>
          </span>
        )}

        {names.length > 1 && (
          <span className="hint col-span-2 mt-2 block">Na sua conta: {names.join(", ")}</span>
        )}
      </span>
    </Link>
  );
}
