import { daysUntil, formatBudget, formatEventDate, plural } from "@/lib/format";
import type { Group } from "@/server/db/schema";

export function countdown(date: string): string {
  const days = daysUntil(date);
  if (days === 0) return "É hoje!";
  if (days === 1) return "É amanhã.";
  if (days > 1) return `Faltam ${days} dias.`;
  return `Foi há ${plural(-days, "dia", "dias")}.`;
}

/** Quando, onde, quanto e o recado de quem organiza. Não renderiza nada se estiver tudo vazio. */
export function EventDetails({ group }: { group: Group }) {
  const when = formatEventDate(group.eventDate, group.eventTime);
  const budget = formatBudget(group.budgetMin, group.budgetMax);
  if (!when && !group.place && !budget && !group.message) return null;

  return (
    <section aria-label="Detalhes da troca">
      <dl className="grid gap-3">
        {when && (
          <div>
            <dt className="hint">Quando</dt>
            <dd className="font-bold">
              <span className="first-letter:uppercase">{when}</span>{" "}
              <span className="font-semibold text-brand">
                {group.eventDate && countdown(group.eventDate)}
              </span>
            </dd>
          </div>
        )}
        {group.place && (
          <div>
            <dt className="hint">Onde</dt>
            <dd className="font-bold">{group.place}</dd>
          </div>
        )}
        {budget && (
          <div>
            <dt className="hint">Valor do presente</dt>
            <dd className="font-bold">{budget}</dd>
          </div>
        )}
        {group.message && (
          <div>
            <dt className="hint">Recado de quem organiza</dt>
            <dd className="whitespace-pre-wrap">{group.message}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
