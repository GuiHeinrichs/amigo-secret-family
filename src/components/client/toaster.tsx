"use client";

import { useEffect, useState } from "react";
import { Icon } from "../icons";

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
        <p className="pop-in pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl bg-[#0e5a45] px-4 py-3 font-semibold text-white shadow-[0_4px_0_rgb(0_0_0/0.25)]">
          <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-white text-[#0e5a45]">
            <Icon name="check" size={18} strokeWidth={3} />
          </span>
          {message}
        </p>
      )}
    </div>
  );
}
