import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PartyBoard } from "@/components/client/party";
import { FrameSkeleton, GroupFrame, loadCtx } from "@/components/frame";
import { getPartyState } from "@/server/party";

export const metadata: Metadata = { title: "Festa" };

export default function PartyPage({ params }: PageProps<"/g/[slug]/festa">) {
  return (
    <Suspense fallback={<FrameSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/g/[slug]/festa">["params"] }) {
  const ctx = await loadCtx(params);
  const { group } = ctx;
  if ((!ctx.me && !ctx.isAdmin) || group.status === "montando") redirect(`/g/${group.slug}`);
  const state = await getPartyState(ctx);

  return (
    <GroupFrame ctx={ctx} active="festa" wide>
      <PartyBoard slug={group.slug} initial={state} />
    </GroupFrame>
  );
}
