import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Reveal } from "@/components/client/reveal";
import { FrameSkeleton, GroupFrame, loadCtx } from "@/components/frame";
import { modeOf } from "@/lib/occasions";

export const metadata: Metadata = { title: "Seu papelzinho" };

export default function RevealPage({ params }: PageProps<"/g/[slug]/revelar">) {
  return (
    <Suspense fallback={<FrameSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/g/[slug]/revelar">["params"] }) {
  const ctx = await loadCtx(params);
  const { group, me } = ctx;
  if (!me || group.status === "montando") redirect(`/g/${group.slug}`);
  // Sorteio individual: este perfil ainda vai sortear o próprio amigo.
  const pendingDraw = group.status === "sorteando" && !me.openedAt;

  return (
    <GroupFrame
      ctx={ctx}
      active="papelzinho"
      trail={[{ label: pendingDraw ? "Sortear" : "Papelzinho" }]}
    >
      <Reveal
        slug={group.slug}
        alreadyOpened={!!me.openedAt}
        pendingDraw={pendingDraw}
        friendLabel={modeOf(group.mode).friend}
      />
    </GroupFrame>
  );
}
