"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { Icon } from "../icons";

/*
 * Campos de data e hora no formato brasileiro (dd/mm/aaaa e 24 horas).
 * Dá para digitar ou escolher no painel; o formulário recebe, num campo
 * oculto, o valor no formato que o servidor espera (AAAA-MM-DD e HH:MM).
 */

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const WEEKDAYS = [
  { short: "D", long: "domingo" },
  { short: "S", long: "segunda-feira" },
  { short: "T", long: "terça-feira" },
  { short: "Q", long: "quarta-feira" },
  { short: "Q", long: "quinta-feira" },
  { short: "S", long: "sexta-feira" },
  { short: "S", long: "sábado" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const todayIso = () => toIso(new Date());

function formatBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** "24/12/2026" → "2026-12-24", ou `null` se não for uma data de verdade. */
function parseBr(text: string): string | null {
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(y, m - 1, d);
  const real = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  return real && y >= 1900 && y <= 2200 ? toIso(date) : null;
}

/** Põe as barras sozinho enquanto a pessoa digita só os números. */
function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join("/");
}

function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return [digits.slice(0, 2), digits.slice(2)].filter(Boolean).join(":");
}

function parseTime(text: string): string | null {
  const match = text.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) <= 23 && Number(match[2]) <= 59 ? text : null;
}

function addDays(iso: string, days: number): string {
  const date = fromIso(iso);
  date.setDate(date.getDate() + days);
  return toIso(date);
}

function addMonths(iso: string, months: number): string {
  const date = fromIso(iso);
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), last));
  return toIso(target);
}

function longDate(iso: string): string {
  const date = fromIso(iso);
  return `${WEEKDAYS[date.getDay()].long}, ${date.getDate()} de ${MONTHS[date.getMonth()]} de ${date.getFullYear()}`;
}

/** Fecha o painel com Esc ou com um toque fora dele. */
function useDismiss(open: boolean, root: RefObject<HTMLElement | null>, close: () => void) {
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, root, close]);
}

function Field({
  id,
  text,
  placeholder,
  icon,
  open,
  invalid,
  errorMessage,
  toggleLabel,
  onText,
  onBlur,
  onToggle,
  toggleRef,
}: {
  id: string;
  text: string;
  placeholder: string;
  icon: "calendar" | "clock";
  open: boolean;
  invalid: boolean;
  errorMessage: string;
  toggleLabel: string;
  onText: (value: string) => void;
  onBlur: () => void;
  onToggle: () => void;
  toggleRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <>
      <div className="relative">
        <input
          id={id}
          className="input !pl-3 !pr-10"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          aria-invalid={invalid}
          aria-describedby={invalid ? `${id}-erro` : undefined}
          onChange={(event) => onText(event.target.value)}
          onBlur={onBlur}
        />
        <button
          ref={toggleRef}
          type="button"
          className="absolute inset-y-1 right-1 grid w-9 place-items-center rounded-[10px] text-ink-soft hover:bg-paper-2 hover:text-ink"
          aria-label={toggleLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={onToggle}
        >
          <Icon name={icon} size={20} />
        </button>
      </div>
      {invalid && (
        <p id={`${id}-erro`} className="mt-1 text-sm font-semibold text-danger">
          {errorMessage}
        </p>
      )}
    </>
  );
}

function Popover({
  label,
  align,
  width,
  children,
}: {
  label: string;
  align: "left" | "right";
  /** Largura fixa: sem ela o painel encolheria até a largura do campo. */
  width: string;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-label={label}
      className={`pop-in absolute top-full z-30 mt-2 max-w-[calc(100vw-2.5rem)] rounded-[18px] bg-field p-3 text-ink ${width} ${
        align === "right" ? "right-0" : "left-0"
      }`}
      style={{ boxShadow: "inset 0 0 0 2px var(--ink), 0 4px 0 var(--ink)" }}
    >
      {children}
    </div>
  );
}

export function DateField({
  id,
  name,
  defaultValue,
  align = "left",
}: {
  id: string;
  name: string;
  /** AAAA-MM-DD */
  defaultValue?: string | null;
  align?: "left" | "right";
}) {
  const [text, setText] = useState(defaultValue ? formatBr(defaultValue) : "");
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  /** Dia com o foco do teclado; o mês mostrado é o dele. */
  const [cursor, setCursor] = useState("");
  const [today, setToday] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const iso = parseBr(text);

  const close = () => setOpen(false);
  useDismiss(open, root, close);

  useEffect(() => {
    if (open) grid.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [open, cursor]);

  function openPanel() {
    const now = todayIso();
    setToday(now);
    setCursor(iso ?? now);
    setOpen(true);
  }

  function choose(day: string) {
    setText(formatBr(day));
    setTouched(false);
    setOpen(false);
    toggle.current?.focus();
  }

  function onGridKey(event: KeyboardEvent) {
    const moves: Record<string, () => string> = {
      ArrowLeft: () => addDays(cursor, -1),
      ArrowRight: () => addDays(cursor, 1),
      ArrowUp: () => addDays(cursor, -7),
      ArrowDown: () => addDays(cursor, 7),
      Home: () => addDays(cursor, -fromIso(cursor).getDay()),
      End: () => addDays(cursor, 6 - fromIso(cursor).getDay()),
      PageUp: () => addMonths(cursor, -1),
      PageDown: () => addMonths(cursor, 1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setCursor(move());
  }

  const view = cursor ? fromIso(cursor) : null;
  const days: (string | null)[] = [];
  if (view) {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= count; d++) {
      days.push(toIso(new Date(view.getFullYear(), view.getMonth(), d)));
    }
  }

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={iso ?? ""} />
      <Field
        id={id}
        text={text}
        placeholder="dd/mm/aaaa"
        icon="calendar"
        open={open}
        invalid={touched && text.length > 0 && !iso}
        errorMessage="Escreva o dia como 24/12/2026."
        toggleLabel={iso ? `Abrir calendário, dia escolhido: ${longDate(iso)}` : "Abrir calendário"}
        onText={(value) => setText(maskDate(value))}
        onBlur={() => setTouched(true)}
        onToggle={() => (open ? close() : openPanel())}
        toggleRef={toggle}
      />

      {open && view && (
        <Popover label="Escolher o dia" align={align} width="w-[19rem]">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-paper-2"
              aria-label="Mês anterior"
              onClick={() => setCursor(addMonths(cursor, -1))}
            >
              <Icon name="chevronLeft" size={20} />
            </button>
            <p className="font-extrabold first-letter:uppercase" aria-live="polite">
              {MONTHS[view.getMonth()]} de {view.getFullYear()}
            </p>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-paper-2"
              aria-label="Próximo mês"
              onClick={() => setCursor(addMonths(cursor, 1))}
            >
              <Icon name="chevronRight" size={20} />
            </button>
          </div>

          <div className="mt-1 grid grid-cols-7 text-center text-sm font-semibold text-ink-soft">
            {WEEKDAYS.map((day) => (
              <abbr key={day.long} title={day.long} className="grid h-8 place-items-center no-underline">
                {day.short}
              </abbr>
            ))}
          </div>

          <div ref={grid} className="grid grid-cols-7" onKeyDown={onGridKey}>
            {days.map((day, index) =>
              day === null ? (
                <span key={`vazio-${index}`} />
              ) : (
                <button
                  key={day}
                  type="button"
                  tabIndex={day === cursor ? 0 : -1}
                  aria-label={longDate(day)}
                  aria-pressed={day === iso}
                  aria-current={day === today ? "date" : undefined}
                  onClick={() => choose(day)}
                  className={`mx-auto grid h-10 w-10 place-items-center rounded-full font-semibold tabular-nums ${
                    day === iso
                      ? "bg-brand text-brand-ink"
                      : day === today
                        ? "shadow-[inset_0_0_0_2px_var(--gold)] hover:bg-paper-2"
                        : "hover:bg-paper-2"
                  }`}
                >
                  {fromIso(day).getDate()}
                </button>
              ),
            )}
          </div>

          <div className="mt-2 flex justify-between border-t-2 border-dashed border-line pt-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setText("");
                setTouched(false);
                close();
                toggle.current?.focus();
              }}
            >
              Limpar
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => choose(today)}>
              Hoje
            </button>
          </div>
        </Popover>
      )}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, hour) => pad(hour));
const MINUTES = ["00", "15", "30", "45"];

export function TimeField({
  id,
  name,
  defaultValue,
  align = "right",
}: {
  id: string;
  name: string;
  /** HH:MM */
  defaultValue?: string | null;
  align?: "left" | "right";
}) {
  const [text, setText] = useState(defaultValue ?? "");
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const time = parseTime(text);
  const [hour, minute] = time ? time.split(":") : [null, null];

  const close = () => setOpen(false);
  useDismiss(open, root, close);

  const chip = (selected: boolean) =>
    `grid h-10 place-items-center rounded-full font-semibold tabular-nums ${
      selected ? "bg-brand text-brand-ink" : "hover:bg-paper-2"
    }`;

  return (
    <div ref={root} className="relative">
      <input type="hidden" name={name} value={time ?? ""} />
      <Field
        id={id}
        text={text}
        placeholder="hh:mm"
        icon="clock"
        open={open}
        invalid={touched && text.length > 0 && !time}
        errorMessage="Escreva a hora como 20:30."
        toggleLabel={time ? `Abrir seletor de hora, hora escolhida: ${time}` : "Abrir seletor de hora"}
        onText={(value) => setText(maskTime(value))}
        onBlur={() => setTouched(true)}
        onToggle={() => setOpen(!open)}
        toggleRef={toggle}
      />

      {open && (
        <Popover label="Escolher a hora" align={align} width="w-[16.5rem]">
          <p className="text-sm font-semibold text-ink-soft" id={`${id}-horas`}>
            Hora
          </p>
          <div className="mt-1 grid grid-cols-6" role="group" aria-labelledby={`${id}-horas`}>
            {HOURS.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`${Number(option)} horas`}
                aria-pressed={option === hour}
                className={chip(option === hour)}
                onClick={() => {
                  setText(`${option}:${minute ?? "00"}`);
                  setTouched(false);
                }}
              >
                {option}
              </button>
            ))}
          </div>

          <p className="mt-3 text-sm font-semibold text-ink-soft" id={`${id}-minutos`}>
            Minutos
          </p>
          <div className="mt-1 grid grid-cols-4 gap-1" role="group" aria-labelledby={`${id}-minutos`}>
            {MINUTES.map((option) => (
              <button
                key={option}
                type="button"
                aria-label={`${Number(option)} minutos`}
                aria-pressed={option === minute}
                className={chip(option === minute)}
                onClick={() => {
                  setText(`${hour ?? "20"}:${option}`);
                  setTouched(false);
                  close();
                  toggle.current?.focus();
                }}
              >
                :{option}
              </button>
            ))}
          </div>

          <div className="mt-2 flex justify-between border-t-2 border-dashed border-line pt-2">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setText("");
                setTouched(false);
                close();
                toggle.current?.focus();
              }}
            >
              Limpar
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                close();
                toggle.current?.focus();
              }}
            >
              Pronto
            </button>
          </div>
        </Popover>
      )}
    </div>
  );
}
