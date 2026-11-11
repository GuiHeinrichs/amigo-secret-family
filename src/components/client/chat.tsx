"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import type { ChatSide } from "@/lib/occasions";
import { sendMessage } from "@/server/actions/chat";
import type { ChatThread } from "@/server/chat";
import { Icon } from "../icons";

const fetcher = async (url: string): Promise<ChatThread> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error("indisponivel");
  return response.json();
};

const time = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export function Chat({
  slug,
  side,
  initial,
  quick,
}: {
  slug: string;
  side: ChatSide;
  initial: ChatThread;
  quick: readonly string[];
}) {
  const { data, mutate } = useSWR(`/api/g/${slug}/chat?lado=${side}`, fetcher, {
    fallbackData: initial,
    refreshInterval: 3000,
    revalidateOnFocus: true,
  });
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const messages = data?.messages ?? [];
  const count = messages.length;

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [count]);

  async function send(body: string) {
    const clean = body.trim();
    if (!clean || sending) return;
    setSending(true);
    setError(null);
    const optimistic: ChatThread = {
      peer: data?.peer ?? null,
      messages: [
        ...messages,
        { id: `tmp-${messages.length}`, mine: true, body: clean, at: new Date().toISOString() },
      ],
    };
    try {
      await mutate(
        async () => {
          const result = await sendMessage(slug, side, clean);
          if (result.error) throw new Error(result.error);
          return fetcher(`/api/g/${slug}/chat?lado=${side}`);
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: false },
      );
      setDraft("");
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message !== "indisponivel"
          ? cause.message
          : "A mensagem não foi enviada. Tente de novo.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-17.5rem)] flex-col">
      <ol className="flex flex-1 flex-col justify-end gap-2" aria-live="polite">
        {messages.length === 0 && (
          <li className="hint py-6 text-center">
            Nenhuma mensagem ainda. Comece por uma pergunta pronta.
          </li>
        )}
        {messages.map((message) => (
          <li
            key={message.id}
            className={`max-w-[82%] rounded-2xl px-4 py-2 ${
              message.mine
                ? "self-end rounded-br-md bg-brand text-brand-ink"
                : "self-start rounded-bl-md bg-paper-2"
            }`}
          >
            <span className="sr-only">{message.mine ? "Você: " : "A outra pessoa: "}</span>
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
            <p className="mt-0.5 text-right text-xs opacity-75">
              {time.format(new Date(message.at))}
            </p>
          </li>
        ))}
      </ol>
      <div ref={end} />

      <div className="sticky bottom-0 -mx-5 mt-4 bg-paper px-5 pb-4 pt-3">
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-3">
          {quick.map((question) => (
            <button
              key={question}
              type="button"
              className="chip shrink-0"
              disabled={sending}
              onClick={() => send(question)}
            >
              {question}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="notice notice-error mb-2">
            {error}
          </p>
        )}
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void send(draft);
          }}
        >
          <label className="sr-only" htmlFor="chat-draft">
            Sua mensagem
          </label>
          <textarea
            id="chat-draft"
            className="input !min-h-12 flex-1"
            rows={1}
            maxLength={500}
            placeholder="Escreva uma mensagem"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(draft);
              }
            }}
          />
          <button
            type="submit"
            className="btn btn-primary !px-4"
            disabled={sending || !draft.trim()}
            aria-label="Enviar mensagem"
          >
            <Icon name="send" />
          </button>
        </form>
      </div>
    </div>
  );
}
