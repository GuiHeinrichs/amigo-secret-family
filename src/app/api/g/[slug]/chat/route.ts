import { chatAvailable, isChatSide, readThread } from "@/server/chat";
import { getContext } from "@/server/context";

export async function GET(request: Request, ctx: RouteContext<"/api/g/[slug]/chat">) {
  const { slug } = await ctx.params;
  const side = new URL(request.url).searchParams.get("lado");
  const context = await getContext(slug);
  if (!context || !isChatSide(side) || !chatAvailable(context)) {
    return Response.json({ error: "indisponivel" }, { status: 404 });
  }
  const thread = await readThread(context.me, side);
  if (!thread) return Response.json({ error: "indisponivel" }, { status: 404 });
  return Response.json(thread, { headers: { "Cache-Control": "no-store" } });
}
