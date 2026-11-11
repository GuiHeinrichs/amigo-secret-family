import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AvatarPicker } from "@/components/client/avatar-picker";
import { CopyButton } from "@/components/client/copy-button";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { EventDetails } from "@/components/event-details";
import { Avatar, FrameSkeleton, GroupFrame, loadCtx } from "@/components/frame";
import { WhatsAppIcon } from "@/components/icons";
import { plural, whatsappUrl } from "@/lib/format";
import { AVATAR_COLORS, AVATAR_EMOJIS, modeOf } from "@/lib/occasions";
import { joinGroup } from "@/server/actions/participant";
import { getOrigin, type Ctx } from "@/server/context";
import type { Participant } from "@/server/db/schema";
import { listPeople, wishCounts } from "@/server/queries";

export const metadata: Metadata = { title: "Amigo secreto" };

export default function GroupPage({ params }: PageProps<"/g/[slug]">) {
  return (
    <Suspense fallback={<FrameSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/g/[slug]">["params"] }) {
  const ctx = await loadCtx(params);
  // Quem só organiza e chega depois do sorteio não tem o que fazer no convite.
  if (!ctx.me && ctx.isAdmin && ctx.group.status !== "montando") {
    redirect(`/g/${ctx.group.slug}/admin`);
  }
  const people = await listPeople(ctx.group.id);
  return ctx.me ? (
    <MemberHome ctx={ctx} me={ctx.me} people={people} />
  ) : (
    <Invitation ctx={ctx} people={people} />
  );
}

async function Invitation({ ctx, people }: { ctx: Ctx; people: Participant[] }) {
  const { group } = ctx;
  const mode = modeOf(group.mode);
  const open = group.status === "montando";

  return (
    <GroupFrame ctx={ctx}>
      <h1 className="text-4xl">
        {open ? "Você foi chamado para o sorteio" : "O sorteio já aconteceu"}
      </h1>
      <p className="mt-3 text-ink-soft">
        {open
          ? `${group.name} vai ser no modo ${mode.label}. ${mode.description}`
          : "Para ver o seu papelzinho, abra neste aparelho o link pessoal que quem organiza mandou para você."}
      </p>

      {people.length > 0 && (
        <div className="mt-5 flex items-center gap-3">
          <div className="flex -space-x-2">
            {people.slice(0, 6).map((p) => (
              <Avatar key={p.id} person={p} size="avatar-sm" />
            ))}
          </div>
          <p className="hint">
            {plural(people.length, "pessoa já está", "pessoas já estão")} no grupo
          </p>
        </div>
      )}

      {open && (
        <ActionForm action={joinGroup} fields={{ slug: group.slug }} className="panel mt-6 grid gap-5">
          <div>
            <label className="label" htmlFor="name">
              Como a turma chama você?
            </label>
            <input
              id="name"
              name="name"
              className="input"
              maxLength={40}
              required
              autoComplete="given-name"
              placeholder="Ex.: Tia Neide"
            />
          </div>
          <AvatarPicker
            emoji={AVATAR_EMOJIS[people.length % AVATAR_EMOJIS.length]}
            color={AVATAR_COLORS[people.length % AVATAR_COLORS.length]}
          />
          <SubmitButton className="btn btn-primary btn-block" pendingLabel="Entrando…">
            Entrar no sorteio
          </SubmitButton>
        </ActionForm>
      )}

      <hr className="cutline" />
      <EventDetails group={group} />
    </GroupFrame>
  );
}

async function MemberHome({
  ctx,
  me,
  people,
}: {
  ctx: Ctx;
  me: Participant;
  people: Participant[];
}) {
  const { group } = ctx;
  const base = `/g/${group.slug}`;
  const ladrao = group.mode === "ladrao";
  const counts = await wishCounts(people.map((p) => p.id));
  const origin = await getOrigin();
  const personalLink = `${origin}/k/${me.token}`;
  const inviteText = `Entra no nosso amigo secreto "${group.name}": ${origin}${base}`;

  return (
    <GroupFrame ctx={ctx} active="inicio">
      <div className="flex items-center gap-4">
        <Avatar person={me} size="avatar-lg" />
        <h1 className="text-3xl">Oi, {me.name}</h1>
      </div>

      <section className="panel mt-6" aria-live="polite">
        {group.status === "montando" && (
          <>
            <h2 className="text-xl">Esperando o sorteio</h2>
            <p className="mt-1 text-ink-soft">
              Quando quem organiza sortear, o seu papelzinho aparece aqui.
              {!ladrao && !counts.get(me.id) && " Enquanto isso, deixe a sua lista pronta."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {!ladrao && (
                <Link
                  href={`${base}/lista`}
                  className={counts.get(me.id) ? "btn btn-quiet" : "btn btn-primary"}
                >
                  {counts.get(me.id) ? "Ver minha lista" : "Preencher minha lista"}
                </Link>
              )}
              <a
                href={whatsappUrl(inviteText)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-quiet"
              >
                <WhatsAppIcon />
                Chamar mais gente
              </a>
            </div>
          </>
        )}

        {group.status === "sorteado" && !me.openedAt && (
          <>
            <h2 className="text-xl">
              {ladrao ? "A fila foi sorteada" : "Seu papelzinho chegou"}
            </h2>
            <p className="mt-1 text-ink-soft">
              {ladrao
                ? "Veja em que posição você escolhe o presente."
                : "Ele está lacrado. Abra quando ninguém estiver olhando."}
            </p>
            <Link href={`${base}/revelar`} className="btn btn-primary mt-4">
              {ladrao ? "Ver minha vez" : "Abrir meu papelzinho"}
            </Link>
          </>
        )}

        {group.status === "sorteado" && me.openedAt && (
          <>
            <h2 className="text-xl">
              {ladrao ? "Agora é só levar o presente" : "Você já sabe quem tirou"}
            </h2>
            <p className="mt-1 text-ink-soft">
              {ladrao
                ? "Embrulhe bem: ninguém pode saber o que é até a hora de abrir."
                : "Confira a lista da pessoa, pergunte o que quiser sem se revelar e arrisque quem tirou você."}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {!ladrao && (
                <Link href={`${base}/amigo`} className="btn btn-primary">
                  Ver meu amigo
                </Link>
              )}
              <Link href={`${base}/festa`} className="btn btn-quiet">
                {ladrao ? "Ver a fila" : "Dar meu palpite"}
              </Link>
            </div>
          </>
        )}

        {group.status === "festa" && (
          <>
            <h2 className="text-xl">A festa começou</h2>
            <p className="mt-1 text-ink-soft">Acompanhe pelo celular o que aparece no telão.</p>
            <Link href={`${base}/festa`} className="btn btn-primary mt-4">
              Entrar na festa
            </Link>
          </>
        )}

        {group.status === "encerrado" && (
          <>
            <h2 className="text-xl">A troca já aconteceu</h2>
            <p className="mt-1 text-ink-soft">Dá para rever como terminou.</p>
            <Link href={`${base}/festa`} className="btn btn-primary mt-4">
              {ladrao ? "Ver quem ficou com o quê" : "Ver o placar"}
            </Link>
          </>
        )}
      </section>

      <hr className="cutline" />
      <EventDetails group={group} />

      <section className="mt-8">
        <h2 className="text-xl">Quem está no grupo</h2>
        <ul className="mt-3 grid gap-2">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-3">
              <Avatar person={p} />
              <span className="flex-1 truncate font-semibold">
                {p.name}
                {p.id === me.id && <span className="hint font-normal"> (você)</span>}
              </span>
              {!ladrao && !!counts.get(p.id) && <span className="chip chip-on">Lista pronta</span>}
            </li>
          ))}
        </ul>
      </section>

      <hr className="cutline" />

      <section>
        <h2 className="text-xl">Seu link pessoal</h2>
        <p className="mt-1 text-ink-soft">
          É com ele que você entra de outro aparelho. Guarde e não mostre para ninguém: quem
          abrir este link vê o seu papelzinho.
        </p>
        <div className="mt-3">
          <CopyButton value={personalLink} label="Copiar meu link" />
        </div>
      </section>
    </GroupFrame>
  );
}
