"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { signOutAction } from "@/server/actions/account";
import { Icon, type IconName } from "../icons";
import { dropSnow } from "./effects/particles";
import { ThemeSwitch } from "./theme-switch";

export type MenuSection = {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  current?: boolean;
};

const CONFETTI = Array.from({ length: 18 }, (_, index) => ({
  color: ["var(--brand-base)", "var(--gold)", "var(--leaf-base)"][index % 3],
  round: index % 4 === 0,
}));

/**
 * Menu lateral para telas de celular, aberto pelo botão de hambúrguer do
 * cabeçalho. A abertura é um embrulho sendo desfeito: o painel desliza, a
 * fita desenrola, o laço salta, os itens entram um a um e sai um punhado de
 * confete. Quem pediu menos movimento ao sistema vê o menu abrir direto.
 */
export function MobileMenu({
  title = "Laço",
  sections = [],
  email,
  groupsCurrent = false,
}: {
  /** Nome do grupo, quando o menu está numa página de grupo. */
  title?: string;
  sections?: MenuSection[];
  /** E-mail da conta logada; `null` mostra "Entrar". */
  email?: string | null;
  /** O menu está na própria página "Meus grupos". */
  groupsCurrent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const burger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const q = gsap.utils.selector(element);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!open) {
      if (!wasOpen.current) return;
      wasOpen.current = false;
      document.body.style.overflow = "";
      burger.current?.focus();
      if (reduce) {
        gsap.set(element, { autoAlpha: 0 });
        return;
      }
      const closing = gsap
        .timeline({ onComplete: () => gsap.set(element, { autoAlpha: 0 }) })
        .to(q(".menu-panel"), { xPercent: 105, duration: 0.28, ease: "power2.in" }, 0)
        .to(q(".menu-backdrop"), { opacity: 0, duration: 0.28 }, 0);
      return () => {
        closing.kill();
      };
    }

    wasOpen.current = true;
    document.body.style.overflow = "hidden";
    gsap.set(element, { autoAlpha: 1 });
    closeButton.current?.focus();

    if (reduce) {
      gsap.set(q(".menu-panel"), { xPercent: 0, rotate: 0 });
      gsap.set(q(".menu-backdrop"), { opacity: 1 });
      gsap.set(q(".menu-ribbon"), { scaleY: 1 });
      gsap.set(q(".menu-bow"), { scale: 1, rotate: 0 });
      gsap.set(q(".menu-item"), { x: 0, opacity: 1, rotate: 0 });
      gsap.set(q(".menu-confetti"), { opacity: 0 });
      return;
    }

    const opening = gsap
      .timeline({ defaults: { ease: "power3.out" } })
      .fromTo(q(".menu-backdrop"), { opacity: 0 }, { opacity: 1, duration: 0.3 }, 0)
      .fromTo(
        q(".menu-panel"),
        { xPercent: 105, rotate: 1.5 },
        { xPercent: 0, rotate: 0, duration: 0.5, ease: "power4.out" },
        0,
      )
      // A fita desenrola de cima para baixo e o laço salta na ponta dela.
      .fromTo(
        q(".menu-ribbon"),
        { scaleY: 0, transformOrigin: "50% 0%" },
        { scaleY: 1, duration: 0.4 },
        0.2,
      )
      .fromTo(
        q(".menu-bow"),
        { scale: 0, rotate: -50 },
        { scale: 1, rotate: 0, duration: 0.9, ease: "elastic.out(1, 0.45)" },
        0.42,
      )
      // Os itens chegam como papelzinhos sendo distribuídos.
      .fromTo(
        q(".menu-item"),
        { x: 48, opacity: 0, rotate: 4 },
        { x: 0, opacity: 1, rotate: 0, duration: 0.45, stagger: 0.045, ease: "back.out(1.7)" },
        0.22,
      );

    // Confete: sobe a partir do laço e cai girando.
    const pieces = q(".menu-confetti");
    gsap.set(pieces, { x: 0, y: 0, rotate: 0, scale: 1, opacity: 0 });
    const confetti = gsap.timeline({ delay: 0.5 });
    pieces.forEach((piece) => {
      const x = gsap.utils.random(-30, 230);
      const peak = gsap.utils.random(-90, -20);
      confetti
        .to(piece, { opacity: 1, duration: 0.01 }, 0)
        .to(piece, { x: x * 0.6, y: peak, duration: 0.35, ease: "power2.out" }, 0)
        .to(
          piece,
          {
            x,
            y: gsap.utils.random(160, 340),
            rotate: gsap.utils.random(-540, 540),
            duration: gsap.utils.random(0.9, 1.5),
            ease: "power1.in",
          },
          0.35,
        )
        .to(piece, { opacity: 0, duration: 0.3 }, ">-0.3");
    });

    return () => {
      opening.kill();
      confetti.kill();
    };
  }, [open]);

  // Ao sair da página, o Next não desmonta o menu: guarda a rota escondida e
  // só desfaz os efeitos, o que mata a animação de fechar no meio do caminho.
  // Por isso a saída deixa o menu fechado de vez, senão ele reaparece aberto
  // (e sem responder ao botão de fechar) quando a pessoa volta para a página.
  useEffect(() => {
    const element = root.current;
    return () => {
      document.body.style.overflow = "";
      wasOpen.current = false;
      if (element) gsap.set(element, { autoAlpha: 0 });
      setOpen(false);
    };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key !== "Tab") return;
    // Mantém o foco dentro do menu enquanto ele está aberto.
    const focusable = root.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const close = () => setOpen(false);
  const itemClass =
    "menu-item flex min-h-12 items-center gap-3 rounded-2xl px-3 py-2 text-lg font-semibold";

  return (
    <div className="md:hidden">
      <button
        ref={burger}
        type="button"
        className="grid h-11 w-11 flex-none place-items-center rounded-full bg-slip text-slip-ink shadow-[0_3px_0_rgb(0_0_0/0.25)] active:translate-y-0.5 active:shadow-[0_1px_0_rgb(0_0_0/0.25)]"
        aria-label="Abrir menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" size={24} strokeWidth={2.4} />
      </button>

      <div
        ref={root}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="invisible fixed inset-0 z-50"
        onKeyDown={onKeyDown}
      >
        <div className="menu-backdrop absolute inset-0 bg-black/55" onClick={close} />

        <div className="menu-panel absolute inset-y-0 right-0 flex w-[min(21rem,88vw)] flex-col overflow-x-hidden overflow-y-auto bg-paper text-ink shadow-2xl">
          <div className="wrap relative h-24 flex-none">
            <span className="menu-ribbon ribbon absolute inset-y-0 left-9 w-3.5" aria-hidden="true" />
            <button
              ref={closeButton}
              type="button"
              className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-slip text-slip-ink shadow-[0_3px_0_rgb(0_0_0/0.25)]"
              aria-label="Fechar menu"
              onClick={close}
            >
              <Icon name="close" size={22} strokeWidth={2.4} />
            </button>
          </div>

          <div className="relative flex-none px-5">
            <span
              className="menu-bow absolute -top-7 left-[1.4rem] grid h-14 w-14 place-items-center rounded-full bg-gold text-[#2a1420] shadow-[0_3px_0_rgb(0_0_0/0.2)]"
              aria-hidden="true"
            >
              <Icon name="bow" size={30} strokeWidth={1.8} />
            </span>
            <span className="pointer-events-none absolute left-12 top-0" aria-hidden="true">
              {CONFETTI.map((piece, index) => (
                <span
                  key={index}
                  className="menu-confetti absolute block opacity-0"
                  style={{
                    width: piece.round ? 9 : 7,
                    height: piece.round ? 9 : 12,
                    borderRadius: piece.round ? "50%" : 2,
                    background: piece.color,
                  }}
                />
              ))}
            </span>
            <p className="menu-item ml-[4.25rem] pt-3 text-xl font-extrabold leading-tight">
              <span className="line-clamp-2">{title}</span>
            </p>
          </div>

          <nav aria-label="Menu" className="flex-1 px-3 pb-4 pt-3">
            {sections.length > 0 && (
              <>
                <ul>
                  {sections.map((section) => (
                    <li key={section.href}>
                      <Link
                        href={section.href}
                        onClick={close}
                        aria-current={section.current ? "page" : undefined}
                        className={`${itemClass} ${
                          section.current ? "bg-paper-2 font-extrabold text-brand" : ""
                        }`}
                      >
                        <Icon name={section.icon} size={24} />
                        <span className="flex-1">{section.label}</span>
                        {!!section.badge && (
                          <span className="grid h-6 min-w-6 place-items-center rounded-full bg-brand px-1.5 text-sm font-extrabold text-brand-ink">
                            {section.badge > 9 ? "9+" : section.badge}
                            <span className="sr-only"> mensagens não lidas</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
                <hr className="cutline !my-3" />
              </>
            )}
            <ul>
              <li>
                {/* Quem tem conta vai direto para os seus grupos; os demais, para a capa. */}
                <Link
                  href={email ? "/grupos" : "/"}
                  onClick={close}
                  aria-current={groupsCurrent ? "page" : undefined}
                  className={`${itemClass} ${
                    groupsCurrent ? "bg-paper-2 font-extrabold text-brand" : ""
                  }`}
                >
                  <Icon name="home" size={24} />
                  {email ? "Meus grupos" : "Início"}
                </Link>
              </li>
              <li>
                <Link href="/criar" onClick={close} className={itemClass}>
                  <Icon name="plus" size={24} />
                  Criar um grupo
                </Link>
              </li>
            </ul>
          </nav>

          <div className="menu-item flex flex-none items-center justify-between gap-3 border-t-2 border-dashed border-line px-5 py-3">
            <span className="font-semibold">Tema</span>
            <ThemeSwitch />
          </div>

          {/* Mesmo efeito de balançar o celular, para quem prefere um botão. */}
          <div className="so-natal menu-item flex flex-none items-center justify-between gap-3 border-t-2 border-dashed border-line px-5 py-3">
            <span className="font-semibold">Neve acumulada</span>
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={() => {
                close();
                // Espera o menu sair da frente para a queda aparecer.
                setTimeout(dropSnow, 380);
              }}
            >
              Derrubar
            </button>
          </div>

          <div className="menu-item flex-none border-t-2 border-dashed border-line px-5 py-4">
            {email ? (
              <form action={signOutAction} onSubmit={close}>
                <p className="hint truncate text-sm">Você entrou como</p>
                <p className="truncate font-semibold">{email}</p>
                <button type="submit" className="btn btn-quiet btn-sm mt-3">
                  Sair da conta
                </button>
              </form>
            ) : (
              <Link href="/entrar" onClick={close} className="btn btn-primary btn-block">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
