const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function formatMoney(value: number): string {
  return brl.format(value);
}

export function formatBudget(min: number | null, max: number | null): string | null {
  if (min && max && min !== max) return `${formatMoney(min)} a ${formatMoney(max)}`;
  if (max) return `até ${formatMoney(max)}`;
  if (min) return `a partir de ${formatMoney(min)}`;
  return null;
}

/** "2026-12-24" → Date ao meio-dia local, para não escorregar de dia por fuso. */
function parseDay(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function formatEventDate(date: string | null, time?: string | null): string | null {
  if (!date) return null;
  const day = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(parseDay(date));
  if (!time) return day;
  const [h, min] = time.split(":");
  return `${day}, às ${Number(h)}h${min === "00" ? "" : min}`;
}

/** Dias inteiros até a data do evento (0 = hoje, negativo = já passou). */
export function daysUntil(date: string, now: Date = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
  return Math.round((parseDay(date).getTime() - today.getTime()) / 86_400_000);
}

export function formatDateTime(value: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function ordinal(n: number): string {
  return `${n}º`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
