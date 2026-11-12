import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AvatarPicker } from "@/components/client/avatar-picker";
import { Scene } from "@/components/client/effects/scene";
import { ActionForm, SubmitButton } from "@/components/client/forms";
import { EventDetails } from "@/components/event-details";
import { Avatar, FrameSkeleton, GroupFrame, loadCtx } from "@/components/frame";
import { WhatsAppIcon } from "@/components/icons";
import { plural, whatsappUrl } from "@/lib/format";
import { AVATAR_COLORS, AVATAR_EMOJIS, modeOf } from "@/lib/occasions";
import { addDependent, signOutAction } from "@/server/actions/account";
import { joinGroup } from "@/server/actions/participant";
import { getOrigin, type Ctx } from "@/server/context";
import type { Participant } from "@/server/db/schema";
import { listPeople, wishCounts } from "@/server/queries";

export const metadata: Metadata = { title: "Amigo secreto" };

export default function GroupPage({ params, searchParams }: PageProps<"/g/[slug]">) {
  return (
    <Suspense fallback={<FrameSkeleton />}>
      <Content params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({
  params,
  searchParams,
}: {
  params: PageProps<"/g/[slug]">["params"];
  searchParams: PageProps<"/g/[slug]">["searchParams"];
}) {
  const ctx = await loadCtx(params);
  const { convite } = await searchParams;
  // Quem só organiza e chega depois do sorteio não tem o que fazer no convite.
  if (!ctx.me && ctx.isAdmin && ctx.group.status !== "montando") {
    redirect(`/g/${ctx.group.slug}/admin`);
  }
  const people = await listPeople(ctx.group.id);
  return ctx.me ? (
    <MemberHome ctx={ctx} me={ctx.me} people={people} />
  ) : (
    <Invitation ctx={ctx} people={people} inviteUsed={convite === "usado"} />
  );
}

async function Invitation({
  ctx,
  people,
  inviteUsed,
}: {
  ctx: Ctx;
  people: Participant[];
  inviteUsed: boolean;
}) {
  const { group, user } = ctx;
  const mode = modeOf(group.mode);
  const open = group.status === "montando";
  const drawing = group.status === "sorteando";

  return (
    <GroupFrame ctx={ctx}>
      {inviteUsed && (
        <p role="alert" className="notice notice-error mb-5">
          Esse convite já foi usado por outra conta. Se era para ser seu, avise quem organiza.
        </p>
      )}
      <h1 className="text-4xl">
        {open
          ? "Você foi chamado para o sorteio"
          : drawing
            ? "O sorteio já foi liberado"
            : "O sorteio já aconteceu"}
      </h1>
      <p className="mt-3 text-ink-soft">
        {open
          ? `${group.name} vai ser no modo ${mode.label}. ${mode.description}`
          : drawing
            ? "Se quem organiza incluiu o seu nome, peça o convite pessoal para sortear o seu amigo."
            : "Se quem organiza incluiu o seu nome, peça o convite pessoal para ver o seu papelzinho."}
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

      {open && !user && (
        <div className="panel mt-6">
          <p className="text-ink-soft">
            Para participar, entre na sua conta. Leva um toque, e o grupo fica guardado nela.
          </p>
          <Link
            href={`/entrar?next=${encodeURIComponent(`/g/${group.slug}`)}`}
            className="btn btn-primary btn-block mt-4"
          >
            Entrar para participar
          </Link>
        </div>
      )}

      {open && user && (
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
              defaultValue={user.name ?? ""}
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
  const mode = modeOf(group.mode);
  // Sorteio individual aberto: quem já abriu o papelzinho é quem já sorteou.
  const drawing = group.status === "sorteando";
  const drawn = people.filter((p) => p.openedAt).length;
  const progress = `${drawn} de ${plural(people.length, "pessoa já sorteou", "pessoas já sortearam")}.`;
  const othersToDraw = ctx.profiles.filter((p) => p.id !== me.id && !p.openedAt);
  const counts = await wishCounts(people.map((p) => p.id));
  const origin = await getOrigin();
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

        {drawing && !me.openedAt && (
          <>
            <h2 className="text-xl">O sorteio está aberto</h2>
            <p className="mt-1 text-ink-soft">
              Desta vez cada pessoa sorteia o próprio {mode.friend}, como tirar o papel do chapéu.
              Ninguém vê quem você tirou, nem quem organiza. {progress}
            </p>
            <Link href={`${base}/revelar`} className="btn btn-primary mt-4">
              Sortear meu {mode.friend}
            </Link>
          </>
        )}

        {drawing && me.openedAt && (
          <>
            <h2 className="text-xl">Você já sorteou</h2>
            <p className="mt-1 text-ink-soft">
              {progress} As conversas e os palpites abrem quando todo mundo tiver sorteado.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={`${base}/amigo`} className="btn btn-primary">
                Ver meu amigo
              </Link>
              <Link href={`${base}/lista`} className="btn btn-quiet">
                {counts.get(me.id) ? "Ver minha lista" : "Preencher minha lista"}
              </Link>
            </div>
          </>
        )}

        {drawing && othersToDraw.length > 0 && (
          <p className="notice mt-4">
            Falta sortear por {othersToDraw.map((p) => p.name).join(", ")}. Troque de perfil no topo
            da página para sortear por {othersToDraw.length === 1 ? "essa pessoa" : "cada uma"}.
          </p>
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
              {drawing
                ? p.openedAt && <span className="chip chip-on">Já sorteou</span>
                : !ladrao && !!counts.get(p.id) && <span className="chip chip-on">Lista pronta</span>}
            </li>
          ))}
        </ul>
      </section>

      <hr className="cutline" />

      {group.status === "montando" && (
        <>
          <section>
            <h2 className="text-xl">Crianças e quem não tem conta</h2>
            <p className="mt-1 text-ink-soft">
              Inclua aqui quem fica sob a sua responsabilidade. O papelzinho dessa pessoa aparece
              na sua conta, e você troca de perfil no topo da página.
            </p>
            <ActionForm
              action={addDependent}
              fields={{ slug: group.slug }}
              resetOnSuccess
              className="mt-3"
            >
              <label className="label" htmlFor="dependent-name">
                Nome da pessoa
              </label>
              <div className="flex gap-2">
                <input
                  id="dependent-name"
                  name="name"
                  className="input flex-1"
                  maxLength={40}
                  required
                  placeholder="Ex.: Pedrinho"
                />
                <SubmitButton className="btn btn-quiet" pendingLabel="Incluindo…">
                  Incluir
                </SubmitButton>
              </div>
            </ActionForm>
          </section>
          <hr className="cutline" />
        </>
      )}

      <section>
        <h2 className="text-xl">Sua conta</h2>
        <p className="mt-1 text-ink-soft">
          Você entrou como <span className="font-semibold text-ink">{ctx.user?.email}</span>. Este
          grupo aparece em qualquer aparelho em que você entrar com essa conta.
        </p>
        <form action={signOutAction} className="mt-3">
          <button type="submit" className="btn btn-quiet btn-sm">
            Sair da conta
          </button>
        </form>
      </section>

      <Scene />
    </GroupFrame>
  );
}
