"use client";

import { useState, useTransition, type ReactNode } from "react";
import { switchProfile } from "@/server/actions/account";
import { toast } from "./toaster";

type Profile = { id: string; name: string; emoji: string; color: string };

/** Tempo mínimo do esqueleto, para a troca não passar como um piscar de tela. */
const MIN_MS = 450;

/**
 * Quem cuida de mais de uma pessoa no grupo escolhe aqui qual está vendo.
 * Enquanto a troca acontece, o conteúdo da página dá lugar a um esqueleto:
 * assim ninguém fica olhando os dados do perfil anterior achando que já mudou.
 */
export function ProfileSwitcher({
  slug,
  profiles,
  activeId,
  width,
  children,
}: {
  slug: string;
  profiles: Profile[];
  activeId: string | null;
  /** Mesma largura do restante da página. */
  width: string;
  /** O conteúdo da página, que some durante a troca. */
  children: ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<Profile | null>(null);
  const switching = pending ? target : null;
  const shownId = switching?.id ?? activeId;

  function switchTo(profile: Profile) {
    if (pending || profile.id === activeId) return;
    setTarget(profile);
    startTransition(async () => {
      const [changed] = await Promise.all([
        switchProfile(slug, profile.id),
        new Promise((resolve) => setTimeout(resolve, MIN_MS)),
      ]);
      if (changed) toast(`Pronto, agora você está vendo como ${profile.name}.`);
    });
  }

  return (
    <>
      {profiles.length > 1 && activeId && (
        <div className={`mx-auto ${width} px-5 pt-4`}>
          <div
            role="group"
            aria-label="Perfis desta conta no grupo"
            className="flex flex-wrap items-center gap-2"
          >
            <span className="hint text-sm">Vendo como</span>
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                aria-pressed={profile.id === shownId}
                disabled={pending}
                onClick={() => switchTo(profile)}
                className={`chip !py-1 !pl-1 ${
                  profile.id === shownId ? "!bg-ink !text-paper" : ""
                }`}
              >
                <span
                  className="avatar avatar-sm"
                  style={{ background: profile.color }}
                  aria-hidden="true"
                >
                  {profile.emoji}
                </span>
                {profile.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {switching && (
        <div className={`mx-auto ${width} px-5 pb-28 pt-6`} aria-busy="true" data-switching>
          <p className="hint" aria-live="polite">
            Trocando para {switching.name}…
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="skeleton skeleton-pulse h-[4.5rem] w-[4.5rem] flex-none !rounded-full" />
            <div className="skeleton skeleton-pulse h-9 w-1/2" />
          </div>
          <div className="skeleton skeleton-pulse mt-6 h-36" />
          <div className="skeleton skeleton-pulse mt-8 h-6 w-2/3" />
          <div className="skeleton skeleton-pulse mt-3 h-12" />
          <div className="skeleton skeleton-pulse mt-3 h-12" />
        </div>
      )}
      {/* Escondido, e não desmontado: se a troca falhar, a página volta como estava. */}
      <div className={switching ? "hidden" : "contents"}>{children}</div>
    </>
  );
}
