"use client";

import { useEffect, useState } from "react";

const EVENT = "laco:toast";

/** Para avisos cujo formulário de origem some da tela (ex.: a linha da pessoa removida). */
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }));
}

export function Toaster() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const show = (event: Event) => {
      setMessage((event as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMessage(null), 9000);
    };
    window.addEventListener(EVENT, show);
    return () => {
      window.removeEventListener(EVENT, show);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-5"
    >
      {message && (
        <p className="pop-in pointer-events-auto max-w-md rounded-2xl bg-ink px-4 py-3 font-semibold text-paper shadow-lg">
          {message}
        </p>
      )}
    </div>
  );
}
