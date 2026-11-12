import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Chat } from "@/components/client/chat";
import { Avatar, FrameSkeleton, GroupFrame, loadCtx } from "@/components/frame";
import { QUICK_QUESTIONS } from "@/lib/occasions";
import { chatAvailable, isChatSide, readThread } from "@/server/chat";

export const metadata: Metadata = { title: "Conversa" };

export default function ChatPage({ params }: PageProps<"/g/[slug]/chat/[lado]">) {
  return (
    <Suspense fallback={<FrameSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({
  params,
}: {
  params: PageProps<"/g/[slug]/chat/[lado]">["params"];
}) {
  const { lado } = await params;
  const ctx = await loadCtx(params);
  const base = `/g/${ctx.group.slug}`;
  if (!chatAvailable(ctx) || !isChatSide(lado)) redirect(base);
  const thread = await readThread(ctx.me, lado);
  if (!thread) redirect(`${base}/chat`);

  return (
    <GroupFrame
      ctx={ctx}
      active="conversas"
      nav={false}
      trail={[
        { label: "Conversas", href: `${base}/chat` },
        { label: thread.peer ? thread.peer.name : "Quem tirou você" },
      ]}
    >
      <div className="flex items-center gap-3 border-b-2 border-dashed border-line pb-4">
        {thread.peer ? (
          <Avatar person={thread.peer} />
        ) : (
          <span className="avatar bg-gold text-xl font-extrabold" aria-hidden="true">
            ?
          </span>
        )}
        <div>
          <h1 className="text-xl">
            {thread.peer ? thread.peer.name : "Quem tirou você"}
          </h1>
          <p className="hint text-sm">
            {thread.peer
              ? "Suas mensagens chegam sem o seu nome."
              : "A pessoa sabe que é você; você não sabe quem é ela."}
          </p>
        </div>
      </div>
      <div className="pt-4">
        <Chat
          slug={ctx.group.slug}
          profileId={ctx.me.id}
          side={lado}
          initial={thread}
          quick={QUICK_QUESTIONS[lado]}
        />
      </div>
    </GroupFrame>
  );
}
