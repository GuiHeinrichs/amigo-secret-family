import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { Avatar, FrameSkeleton, GroupFrame, loadCtx } from "@/components/frame";
import { Icon } from "@/components/icons";
import { WishList } from "@/components/wish-list";
import { formatBudget } from "@/lib/format";
import { modeOf } from "@/lib/occasions";
import { saveHints } from "@/server/actions/draw";
import { getDb } from "@/server/db/client";
import { assignments, participants } from "@/server/db/schema";
import { listWishes } from "@/server/queries";

export const metadata: Metadata = { title: "Meu amigo" };

export default function FriendPage({ params }: PageProps<"/g/[slug]/amigo">) {
  return (
    <Suspense fallback={<FrameSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/g/[slug]/amigo">["params"] }) {
  const ctx = await loadCtx(params);
  const { group, me } = ctx;
  const base = `/g/${group.slug}`;
  if (!me || group.status === "montando" || group.mode === "ladrao") redirect(base);
  // O nome só aparece aqui depois que a própria pessoa rompeu o lacre.
  if (!me.openedAt) redirect(`${base}/revelar`);

  const db = await getDb();
  const [mine] = await db.select().from(assignments).where(eq(assignments.giverId, me.id));
  if (!mine) redirect(base);
  const [friend] = await db.select().from(participants).where(eq(participants.id, mine.receiverId));
  const wishes = await listWishes(friend.id);
  const mode = modeOf(group.mode);
  const budget = formatBudget(group.budgetMin, group.budgetMax);
  const profile = [
    { label: "Tamanhos", value: friend.sizes },
    { label: "Gosta de", value: friend.likes },
    { label: "Não gosta de", value: friend.dislikes },
  ].filter((row) => row.value);

  return (
    <GroupFrame ctx={ctx} active="papelzinho" trail={[{ label: "Meu amigo" }]}>
      <p className="hint">Seu {mode.friend} é</p>
      <div className="mt-2 flex items-center gap-4">
        <Avatar person={friend} size="avatar-lg" />
        <h1 className="hand text-5xl">{friend.name}</h1>
      </div>

      {(mine.theme || budget) && (
        <dl className="mt-5 grid gap-2">
          {mine.theme && (
            <div>
              <dt className="hint">Tema do presente</dt>
              <dd className="font-bold">{mine.theme}</dd>
            </div>
          )}
          {budget && (
            <div>
              <dt className="hint">Valor combinado</dt>
              <dd className="font-bold">{budget}</dd>
            </div>
          )}
        </dl>
      )}

      <Link href={`${base}/chat/amigo`} className="btn btn-primary mt-6">
        <Icon name="chat" size={20} />
        Perguntar sem se revelar
      </Link>

      <hr className="cutline" />

      <section>
        <h2 className="text-xl">
          {group.mode === "onca" ? `O que ${friend.name} não quer` : `O que ${friend.name} quer`}
        </h2>
        <p className="mt-1 text-ink-soft">{mode.giftAdvice}</p>
        <div className="mt-3">
          <WishList
            wishes={wishes}
            empty={`${friend.name} ainda não escreveu nada. Mande uma pergunta anônima pedindo uma dica.`}
          />
        </div>
        {profile.length > 0 && (
          <dl className="mt-5 grid gap-2">
            {profile.map((row) => (
              <div key={row.label}>
                <dt className="hint">{row.label}</dt>
                <dd className="whitespace-pre-wrap">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <hr className="cutline" />

      <section>
        <h2 className="text-xl">Dicas para a hora da festa</h2>
        <p className="mt-1 text-ink-soft">
          Na sua vez de entregar, o telão mostra estas dicas para a turma adivinhar quem é. Não
          escreva o nome.
        </p>
        <ActionForm action={saveHints} fields={{ slug: group.slug }} className="mt-3">
          <label className="sr-only" htmlFor="hints">
            Dicas sobre {friend.name}
          </label>
          <textarea
            id="hints"
            name="hints"
            className="input"
            maxLength={300}
            defaultValue={mine.hints ?? ""}
            placeholder="Ex.: nunca perde um churrasco, torce para o time errado e faz o melhor pudim da família."
          />
          <SubmitButton className="btn btn-quiet mt-3" pendingLabel="Guardando…">
            Guardar dicas
          </SubmitButton>
        </ActionForm>
      </section>
    </GroupFrame>
  );
}
