import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { occasionOf } from "@/lib/occasions";
import { unreadCount } from "@/server/chat";
import { getContext, type Ctx } from "@/server/context";
import type { Group, Participant } from "@/server/db/schema";
import { Icon, type IconName } from "./icons";

export type NavKey = "inicio" | "papelzinho" | "lista" | "conversas" | "festa" | "organizar";

export function themeStyle(group: Pick<Group, "occasion">): CSSProperties {
  const occasion = occasionOf(group.occasion);
  return {
    "--brand-base": occasion.brand,
    "--leaf-base": occasion.leaf,
    "--gold": occasion.gold,
  } as CSSProperties;
}

/** Resolve o grupo da URL ou responde 404. */
export async function loadCtx(params: Promise<{ slug: string }>): Promise<Ctx> {
  const { slug } = await params;
  const ctx = await getContext(slug);
  if (!ctx) notFound();
  return ctx;
}

export function Avatar({
  person,
  size = "",
}: {
  person: Pick<Participant, "emoji" | "color">;
  size?: "" | "avatar-lg" | "avatar-sm";
}) {
  return (
    <span className={`avatar ${size}`} style={{ background: person.color }} aria-hidden="true">
      {person.emoji}
    </span>
  );
}

type NavItem = { key: NavKey; href: string; label: string; icon: IconName; badge?: number };

async function navItems(ctx: Ctx): Promise<NavItem[]> {
  const { group, me } = ctx;
  if (!me) return [];
  const base = `/g/${group.slug}`;
  const ladrao = group.mode === "ladrao";
  const items: NavItem[] = [{ key: "inicio", href: base, label: "Início", icon: "home" }];

  if (group.status !== "montando") {
    items.push(
      ladrao
        ? { key: "papelzinho", href: `${base}/revelar`, label: "Minha vez", icon: "slip" }
        : me.openedAt
          ? { key: "papelzinho", href: `${base}/amigo`, label: "Meu amigo", icon: "slip" }
          : { key: "papelzinho", href: `${base}/revelar`, label: "Papelzinho", icon: "slip" },
    );
  }
  if (!ladrao) {
    items.push({ key: "lista", href: `${base}/lista`, label: "Minha lista", icon: "list" });
  }
  if (group.status !== "montando") {
    if (!ladrao) {
      const unread = (await unreadCount(me, "amigo")) + (await unreadCount(me, "misterio"));
      items.push({
        key: "conversas",
        href: `${base}/chat`,
        label: "Conversas",
        icon: "chat",
        badge: unread,
      });
    }
    items.push({ key: "festa", href: `${base}/festa`, label: "Festa", icon: "party" });
  }
  return items;
}

export async function GroupFrame({
  ctx,
  active,
  children,
  wide = false,
  nav = true,
}: {
  ctx: Ctx;
  active?: NavKey;
  children: ReactNode;
  /** Telão da festa: usa a largura toda em telas grandes. */
  wide?: boolean;
  nav?: boolean;
}) {
  const { group, me, isAdmin } = ctx;
  const occasion = occasionOf(group.occasion);
  const items = nav ? await navItems(ctx) : [];
  const width = wide ? "max-w-md lg:max-w-4xl" : "max-w-md";

  return (
    <div className="theme min-h-dvh" data-mode={group.mode} style={themeStyle(group)}>
      <header className="wrap">
        <div className={`mx-auto flex ${width} items-center justify-between gap-2 px-5 pb-10 pt-3`}>
          <Link href="/" className="chip !bg-slip !text-slip-ink">
            <Icon name="back" size={16} />
            Meus grupos
          </Link>
          {isAdmin && (
            <Link
              href={`/g/${group.slug}/admin`}
              className="chip !bg-slip !text-slip-ink"
              aria-current={active === "organizar" ? "page" : undefined}
            >
              <Icon name="gear" size={16} />
              Organizar
            </Link>
          )}
        </div>
      </header>

      <div className={`mx-auto ${width} px-5`}>
        <p className="slip -mt-6 inline-flex max-w-full -rotate-1 items-center gap-2 rounded-lg px-4 py-2 text-lg font-extrabold leading-tight">
          <span aria-hidden="true">{occasion.emoji}</span>
          <Link href={`/g/${group.slug}`} className="truncate">
            {group.name}
          </Link>
        </p>
      </div>

      <main
        className={`mx-auto ${width} px-5 pt-7 ${items.length > 0 ? "pb-28" : nav ? "pb-16" : "pb-0"}`}
      >
        {children}
      </main>

      {items.length > 0 && me && (
        <nav
          aria-label="Seções do grupo"
          className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-paper pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="mx-auto flex max-w-md">
            {items.map((item) => {
              const current = item.key === active;
              return (
                <li key={item.key} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`relative flex flex-col items-center gap-0.5 px-1 py-2 text-xs ${
                      current ? "font-extrabold text-brand" : "font-semibold text-ink-soft"
                    }`}
                  >
                    <span className="relative">
                      <Icon name={item.icon} size={24} strokeWidth={current ? 2.4 : 2} />
                      {!!item.badge && (
                        <span className="absolute -right-2.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[0.6875rem] font-extrabold text-brand-ink">
                          {item.badge > 9 ? "9+" : item.badge}
                          <span className="sr-only"> mensagens não lidas</span>
                        </span>
                      )}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

/** O que aparece enquanto os dados do grupo chegam. */
export function FrameSkeleton() {
  return (
    <div className="theme min-h-dvh" aria-busy="true">
      <div className="wrap h-[4.75rem]" />
      <div className="mx-auto max-w-md px-5">
        <div className="skeleton -mt-6 h-11 w-48" />
        <div className="skeleton mt-8 h-9 w-3/4" />
        <div className="skeleton mt-4 h-28" />
        <div className="skeleton mt-4 h-28" />
        <p className="sr-only">Carregando…</p>
      </div>
    </div>
  );
}
