import { getContext } from "@/server/context";
import { getPartyState } from "@/server/party";

export async function GET(_request: Request, ctx: RouteContext<"/api/g/[slug]/festa">) {
  const { slug } = await ctx.params;
  const context = await getContext(slug);
  if (!context || (!context.me && !context.isAdmin) || context.group.status === "montando") {
    return Response.json({ error: "indisponivel" }, { status: 404 });
  }
  return Response.json(await getPartyState(context), {
    headers: { "Cache-Control": "no-store" },
  });
}
