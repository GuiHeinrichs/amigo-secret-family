import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { occasionOf, occasionVars } from "@/lib/occasions";
import { ProfileSwitcher } from "./client/profile-switcher";
import { unreadCount } from "@/server/chat";
import { getContext, type Ctx } from "@/server/context";
import type { Group, Participant } from "@/server/db/schema";
import { BackButton, Breadcrumbs, type Crumb } from "./breadcrumbs";
import { Garland } from "./client/effects/garland";
import { MobileMenu, type MenuSection } from "./client/mobile-menu";
import { ThemeSwitch } from "./client/theme-switch";
import { Icon, type IconName } from "./icons";

export type NavKey = "inicio" | "papelzinho" | "lista" | "conversas" | "festa" | "organizar";

export function themeStyle(group: Pick<Group, "occasion">): CSSProperties {
  return occasionVars(occasionOf(group.occasion)) as CSSProperties;
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
  // Sorteio individual aberto: ainda há gente sem par, então nada de conversas ou festa.
  const drawing = group.status === "sorteando";
  const items: NavItem[] = [{ key: "inicio", href: base, label: "Início", icon: "home" }];

  if (group.status !== "montando") {
    items.push(
      ladrao
        ? { key: "papelzinho", href: `${base}/revelar`, label: "Minha vez", icon: "slip" }
        : me.openedAt
          ? { key: "papelzinho", href: `${base}/amigo`, label: "Meu amigo", icon: "slip" }
          : {
              key: "papelzinho",
              href: `${base}/revelar`,
              label: drawing ? "Sortear" : "Papelzinho",
              icon: "slip",
            },
    );
  }
  if (!ladrao) {
    items.push({ key: "lista", href: `${base}/lista`, label: "Minha lista", icon: "list" });
  }
  if (group.status !== "montando" && !drawing) {
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
  trail = [],
}: {
  ctx: Ctx;
  active?: NavKey;
  children: ReactNode;
  /** Telão da festa: usa a largura toda em telas grandes. */
  wide?: boolean;
  nav?: boolean;
  /** Níveis abaixo do grupo na trilha, ex.: [{ label: "Conversas" }]. */
  trail?: Crumb[];
}) {
  const { group, me, isAdmin, profiles } = ctx;
  const occasion = occasionOf(group.occasion);
  const sections = await navItems(ctx);
  // A barra de baixo pode ser dispensada (ex.: na conversa); o menu lateral, não.
  const items = nav ? sections : [];
  const menu: MenuSection[] = sections.map((item) => ({
    href: item.href,
    label: item.label,
    icon: item.icon,
    badge: item.badge,
    current: item.key === active,
  }));
  if (isAdmin) {
    menu.push({
      href: `/g/${group.slug}/admin`,
      label: "Organizar",
      icon: "gear",
      current: active === "organizar",
    });
  }
  const width = wide ? "max-w-md lg:max-w-4xl" : "max-w-md";
  const crumbs: Crumb[] = [
    { label: "Início", href: "/" },
    { label: group.name, href: `/g/${group.slug}` },
    ...trail,
  ];
  // O botão de voltar leva ao nível logo acima da página atual.
  const parent = crumbs.slice(0, -1).reverse().find((crumb) => crumb.href);

  return (
    <div className="theme min-h-dvh" data-mode={group.mode} style={themeStyle(group)}>
      <header className="wrap">
        <div className={`mx-auto flex ${width} items-center justify-between gap-2 px-5 pb-10 pt-3`}>
          <Breadcrumbs items={crumbs} />
          <ThemeSwitch className="hidden md:inline-flex" />
          {/* No celular, "Organizar" e o resto da navegação ficam no menu lateral. */}
          {isAdmin && active !== "organizar" && (
            <Link
              href={`/g/${group.slug}/admin`}
              className="chip hidden flex-none !bg-slip !text-slip-ink md:inline-flex"
            >
              <Icon name="gear" size={16} />
              Organizar
            </Link>
          )}
          <MobileMenu title={group.name} sections={menu} email={ctx.user?.email ?? null} />
        </div>
        <Garland />
      </header>

      <div className={`mx-auto ${width} px-5`}>
        <p className="slip -mt-6 inline-flex max-w-full -rotate-1 items-center gap-2 rounded-lg px-4 py-2 text-lg font-extrabold leading-tight">
          <span aria-hidden="true">{occasion.emoji}</span>
          <Link href={`/g/${group.slug}`} className="truncate">
            {group.name}
          </Link>
        </p>
      </div>

      {/*
        Seletor de perfil (para quem cuida de mais de uma pessoa no grupo) em
        volta do conteúdo: durante a troca, a página dá lugar a um esqueleto.
      */}
      <ProfileSwitcher
        slug={group.slug}
        profiles={profiles.map(({ id, name, emoji, color }) => ({ id, name, emoji, color }))}
        activeId={me?.id ?? null}
        width={width}
      >
      {/*
        A chave é o perfil ativo: ao trocar de perfil, a página inteira é
        remontada. Sem isso, campos e estados da tela (formulários, papelzinho
        aberto, conversa) continuariam mostrando os dados do perfil anterior.
      */}
      <main
        key={me?.id ?? "sem-perfil"}
        className={`mx-auto ${width} px-5 pt-6 ${items.length > 0 ? "pb-28" : nav ? "pb-16" : "pb-0"}`}
      >
        {parent?.href && (
          <div className="mb-5">
            <BackButton href={parent.href} to={parent.label} />
          </div>
        )}
        {children}
      </main>
      </ProfileSwitcher>

      {items.length > 0 && me && (
        <nav
          aria-label="Seções do grupo"
          className="snowy fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-paper pb-[env(safe-area-inset-bottom)]"
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
