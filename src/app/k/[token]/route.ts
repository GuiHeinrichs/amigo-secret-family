import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/server/db/client";
import { groups, participants } from "@/server/db/schema";
import { addMembership } from "@/server/session";

/**
 * Link mágico. Guarda o grupo no cookie do aparelho e manda para a URL limpa.
 * Este GET não rompe lacre nem mostra nome nenhum: robôs de preview de link
 * (WhatsApp, iMessage) podem passar por aqui sem estragar a surpresa.
 */
export async function GET(_request: Request, ctx: RouteContext<"/k/[token]">) {
  const { token } = await ctx.params;
  const db = await getDb();
  let slug: string | null = null;

  if (token.startsWith("a")) {
    const [group] = await db.select().from(groups).where(eq(groups.adminToken, token));
    if (group) {
      await addMembership({ g: group.id, a: 1 });
      slug = `${group.slug}/admin`;
    }
  } else if (token.startsWith("p")) {
    const [row] = await db
      .select({ id: participants.id, groupId: participants.groupId, slug: groups.slug })
      .from(participants)
      .innerJoin(groups, eq(groups.id, participants.groupId))
      .where(eq(participants.token, token));
    if (row) {
      await addMembership({ g: row.groupId, p: row.id });
      slug = row.slug;
    }
  }

  redirect(slug ? `/g/${slug}` : "/?link=invalido");
}
