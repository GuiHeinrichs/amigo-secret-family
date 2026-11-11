import { and, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb } from "@/server/db/client";
import { groups, participants } from "@/server/db/schema";
import { getUser, setActiveProfile } from "@/server/session";

/**
 * Convite pessoal: quem organiza incluiu um nome e mandou este link. A pessoa
 * entra na conta e o participante passa a ser dela (ou de quem cuida dela).
 * O convite vale uma vez só: depois de assumido, outra conta não entra por ele.
 *
 * Este GET não rompe lacre nem mostra nome nenhum: robôs de preview de link
 * (WhatsApp, iMessage) passam por aqui sem conta e só chegam à tela de login.
 */
export async function GET(_request: Request, ctx: RouteContext<"/k/[token]">) {
  const { token } = await ctx.params;
  const user = await getUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(`/k/${token}`)}`);

  const db = await getDb();
  const [row] = await db
    .select({
      id: participants.id,
      userId: participants.userId,
      groupId: participants.groupId,
      slug: groups.slug,
    })
    .from(participants)
    .innerJoin(groups, eq(groups.id, participants.groupId))
    .where(eq(participants.token, token));
  if (!row) redirect("/?link=invalido");

  if (!row.userId) {
    await db
      .update(participants)
      .set({ userId: user.id })
      .where(and(eq(participants.id, row.id), isNull(participants.userId)));
  } else if (row.userId !== user.id) {
    redirect(`/g/${row.slug}?convite=usado`);
  }
  await setActiveProfile(row.groupId, row.id);
  redirect(`/g/${row.slug}`);
}
