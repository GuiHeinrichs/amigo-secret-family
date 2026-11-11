import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Avatar, FrameSkeleton, GroupFrame, loadCtx } from "@/components/frame";
import { Icon } from "@/components/icons";
import { plural } from "@/lib/format";
import { chatAvailable, unreadCount } from "@/server/chat";
import { getDb } from "@/server/db/client";
import { assignments, participants } from "@/server/db/schema";

export const metadata: Metadata = { title: "Conversas" };

export default function ChatIndexPage({ params }: PageProps<"/g/[slug]/chat">) {
  return (
    <Suspense fallback={<FrameSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

function Unread({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="chip !bg-brand !text-brand-ink">
      {plural(count, "nova", "novas")}
    </span>
  );
}

async function Content({ params }: { params: PageProps<"/g/[slug]/chat">["params"] }) {
  const ctx = await loadCtx(params);
  const base = `/g/${ctx.group.slug}`;
  if (!chatAvailable(ctx)) redirect(base);
  const { me } = ctx;

  const db = await getDb();
  let friend: { name: string; emoji: string; color: string } | undefined;
  if (me.openedAt) {
    [friend] = await db
      .select({ name: participants.name, emoji: participants.emoji, color: participants.color })
      .from(assignments)
      .innerJoin(participants, eq(participants.id, assignments.receiverId))
      .where(eq(assignments.giverId, me.id));
  }
  const unreadFriend = await unreadCount(me, "amigo");
  const unreadMystery = await unreadCount(me, "misterio");

  return (
    <GroupFrame ctx={ctx} active="conversas">
      <h1 className="text-3xl">Conversas</h1>
      <p className="mt-2 text-ink-soft">
        São duas conversas separadas. Em nenhuma delas o nome de quem tirou aparece.
      </p>

      <ul className="mt-5 grid gap-3">
        <li>
          {friend ? (
            <Link href={`${base}/chat/amigo`} className="panel flex items-center gap-3">
              <Avatar person={friend} />
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">Com {friend.name}</span>
                <span className="hint block">Quem você tirou. A pessoa não sabe que é você.</span>
              </span>
              <Unread count={unreadFriend} />
            </Link>
          ) : (
            <Link href={`${base}/revelar`} className="panel flex items-center gap-3">
              <span className="avatar bg-paper" aria-hidden="true">
                <Icon name="lock" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-extrabold">Com quem você tirou</span>
                <span className="hint block">Abra o seu papelzinho para liberar esta conversa.</span>
              </span>
            </Link>
          )}
        </li>
        <li>
          <Link href={`${base}/chat/misterio`} className="panel flex items-center gap-3">
            <span className="avatar bg-gold text-xl font-extrabold" aria-hidden="true">
              ?
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold">Com quem tirou você</span>
              <span className="hint block">Você não vê quem é. A pessoa sabe que é você.</span>
            </span>
            <Unread count={unreadMystery} />
          </Link>
        </li>
      </ul>
    </GroupFrame>
  );
}
