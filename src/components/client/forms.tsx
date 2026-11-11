"use client";

import {
  createContext,
  use,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import type { ActionState } from "@/server/guard";
import { toast } from "./toaster";

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

const PendingContext = createContext(false);

/**
 * Formulário ligado a uma Server Action.
 *
 * Chama a ação dentro de uma transição (em vez do `action` nativo) por dois
 * motivos: o React não limpa os campos quando a ação devolve um erro de
 * validação, e o resultado continua disponível mesmo que o formulário saia
 * da tela com a atualização — caso de quem remove a própria linha.
 */
export function ActionForm({
  action,
  fields,
  children,
  className,
  resetOnSuccess = false,
  onDone,
  toastNote = false,
}: {
  action: Action;
  /** Campos ocultos, ex.: { slug } */
  fields?: Record<string, string>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  /** Chamado depois de cada envio que deu certo. */
  onDone?: () => void;
  /** Mostra o aviso de sucesso num toast, para formulários que somem ao dar certo. */
  toastNote?: boolean;
}) {
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        startTransition(async () => {
          const result = await action({}, data);
          // Ações que terminam em redirect não devolvem estado.
          if (!result) return;
          if (result.ok) {
            if (resetOnSuccess) form.reset();
            if (toastNote && result.note) toast(result.note);
            onDone?.();
          }
          setState(result);
        });
      }}
    >
      {fields &&
        Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      <PendingContext value={pending}>{children}</PendingContext>
      {state.error && (
        <p role="alert" className="notice notice-error mt-3">
          {state.error}
        </p>
      )}
      {!state.error && state.note && !toastNote && (
        <p role="status" className="notice notice-ok mt-3">
          {state.note}
        </p>
      )}
    </form>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  className = "btn btn-primary",
  disabled,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const pending = use(PendingContext);
  return (
    <button type="submit" className={className} disabled={pending || disabled}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

/** Ações destrutivas pedem um segundo toque no mesmo botão. */
export function ConfirmSubmit({
  children,
  confirmLabel,
  className = "btn btn-sm btn-danger",
}: {
  children: ReactNode;
  confirmLabel: string;
  className?: string;
}) {
  const pending = use(PendingContext);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!armed) {
          event.preventDefault();
          setArmed(true);
        }
      }}
    >
      {armed ? <span aria-live="assertive">{confirmLabel}</span> : children}
    </button>
  );
}
