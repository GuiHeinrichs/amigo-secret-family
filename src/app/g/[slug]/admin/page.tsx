import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { Suspense } from "react";
import { CopyButton } from "@/components/client/copy-button";
import { DateField, TimeField } from "@/components/client/date-time";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/client/forms";
import { Avatar, FrameSkeleton, GroupFrame, loadCtx } from "@/components/frame";
import { Icon, WhatsAppIcon } from "@/components/icons";
import { MIN_PARTICIPANTS } from "@/lib/draw";
import { formatDateTime, plural, whatsappUrl } from "@/lib/format";
import { MODE_KEYS, MODES, OCCASION_KEYS, OCCASIONS } from "@/lib/occasions";
import { resetDraw, runDraw } from "@/server/actions/draw";
import { deleteGroup, newEdition, updateGroup } from "@/server/actions/group";
import { adoptParticipant } from "@/server/actions/account";
import {
  addExclusion,
  addParticipants,
  addTheme,
  removeExclusion,
  removeParticipant,
  removeTheme,
} from "@/server/actions/participant";
import { getOrigin } from "@/server/context";
import { listExclusions, listPeople, listThemes, wishCounts } from "@/server/queries";

export const metadata: Metadata = { title: "Organizar" };

export default function AdminPage({ params }: PageProps<"/g/[slug]/admin">) {
  return (
    <Suspense fallback={<FrameSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/g/[slug]/admin">["params"] }) {
  const ctx = await loadCtx(params);
  const { group } = ctx;
  if (!ctx.isAdmin) redirect(`/g/${group.slug}`);

  const slug = group.slug;
  const fields = { slug };
  const ladrao = group.mode === "ladrao";
  const building = group.status === "montando";
  const people = await listPeople(group.id);
  const counts = await wishCounts(people.map((p) => p.id));
  const rules = building && !ladrao ? await listExclusions(group.id) : [];
  const themeRows = group.themed ? await listThemes(group.id) : [];
  const origin = await getOrigin();
  const inviteLink = `${origin}/g/${slug}`;
  const qr = building ? await QRCode.toString(inviteLink, { type: "svg", margin: 1 }) : "";
  const opened = people.filter((p) => p.openedAt).length;
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? "alguém";

  return (
    <GroupFrame ctx={ctx} active="organizar" trail={[{ label: "Organizar" }]}>
      <h1 className="text-3xl">Organizar</h1>

      {/* ——— Próximo passo ——— */}
      <section className="panel mt-5" aria-live="polite">
        {building && (
          <>
            <h2 className="text-xl">{ladrao ? "Sortear a fila" : "Sortear"}</h2>
            <p className="mt-1 text-ink-soft">
              {plural(people.length, "pessoa", "pessoas")} no grupo.{" "}
              {people.length < MIN_PARTICIPANTS
                ? `Precisa de pelo menos ${MIN_PARTICIPANTS} para sortear.`
                : ladrao
                  ? "O sorteio define a ordem em que cada um escolhe o presente."
                  : "Depois do sorteio, nem você consegue ver quem tirou quem."}
            </p>
            <ActionForm action={runDraw} fields={fields} className="mt-4">
              <SubmitButton pendingLabel="Sorteando…" disabled={people.length < MIN_PARTICIPANTS}>
                Sortear agora
              </SubmitButton>
            </ActionForm>
          </>
        )}

        {group.status === "sorteado" && (
          <>
            <h2 className="text-xl">Sorteio feito</h2>
            <p className="mt-1 text-ink-soft">
              {group.drawnAt && `Em ${formatDateTime(group.drawnAt)}. `}
              {opened} de {plural(people.length, "pessoa abriu", "pessoas abriram")}{" "}
              {ladrao ? "a posição na fila" : "o papelzinho"}.
            </p>
            <Link href={`/g/${slug}/festa`} className="btn btn-primary mt-4">
              Abrir o telão da festa
            </Link>
            <details className="mt-4">
              <summary className="cursor-pointer font-semibold">Refazer o sorteio</summary>
              <p className="hint mt-2">
                Todo mundo recebe um papelzinho novo. As conversas e os palpites são apagados.
              </p>
              <ActionForm action={resetDraw} fields={fields} className="mt-3">
                <ConfirmSubmit confirmLabel="Desfazer mesmo?">Desfazer o sorteio</ConfirmSubmit>
              </ActionForm>
            </details>
          </>
        )}

        {(group.status === "festa" || group.status === "encerrado") && (
          <>
            <h2 className="text-xl">
              {group.status === "festa" ? "A festa está rolando" : "A troca já aconteceu"}
            </h2>
            <Link href={`/g/${slug}/festa`} className="btn btn-primary mt-4">
              {group.status === "festa" ? "Abrir o telão" : "Ver como terminou"}
            </Link>
          </>
        )}
      </section>

      {/* ——— Convite ——— */}
      {building && (
        <section className="mt-8">
          <h2 className="text-xl">Convite</h2>
          <p className="mt-1 text-ink-soft">
            Quem abrir este link entra na conta e escolhe o nome para o sorteio.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={whatsappUrl(`Entra no nosso amigo secreto "${group.name}": ${inviteLink}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-primary"
            >
              <WhatsAppIcon />
              Mandar no WhatsApp
            </a>
            <CopyButton value={inviteLink} label="Copiar convite" />
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer font-semibold">Mostrar QR code</summary>
            <div
              className="mt-3 w-44 rounded-xl bg-white p-2"
              role="img"
              aria-label="QR code do convite"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
          </details>
        </section>
      )}

      <hr className="cutline" />

      {/* ——— Pessoas ——— */}
      <section>
        <h2 className="text-xl">Pessoas</h2>
        {people.length === 0 && (
          <p className="mt-2 text-ink-soft">
            Ninguém entrou ainda. Mande o convite ou escreva os nomes abaixo.
          </p>
        )}
        <ul className="mt-2">
          {people.map((p) => {
            // Sem conta ainda: o convite pessoal liga este nome à conta de quem abrir.
            const claimed = !!p.userId;
            const link = claimed ? inviteLink : `${origin}/k/${p.token}`;
            const message = !claimed
              ? `Oi, ${p.name}! Você está no amigo secreto "${group.name}". Entre por este convite, que é só seu: ${link}`
              : `Oi, ${p.name}! O sorteio do "${group.name}" já saiu. Abra o seu papelzinho: ${link}`;
            const account = !claimed
              ? "Ainda não entrou"
              : p.userId === ctx.user?.id
                ? "Na sua conta"
                : "Entrou";
            const wishes = counts.get(p.id) ?? 0;
            return (
              <li key={p.id} className="border-b-2 border-dashed border-line py-3">
                <div className="flex items-center gap-3">
                  <Avatar person={p} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{p.name}</p>
                    <p className="hint text-sm">
                      {account}
                      {building
                        ? ladrao || wishes === 0
                          ? ""
                          : `, lista com ${plural(wishes, "item", "itens")}`
                        : p.openedAt
                          ? `, abriu em ${formatDateTime(p.openedAt)}`
                          : claimed
                            ? ", ainda não abriu"
                            : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-start gap-2 pl-[3.25rem]">
                  {(!claimed || (!building && !p.openedAt)) && (
                    <a
                      href={whatsappUrl(message)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-quiet"
                    >
                      <WhatsAppIcon size={18} />
                      {claimed ? "Cutucar" : "Mandar convite"}
                      <span className="sr-only"> para {p.name}</span>
                    </a>
                  )}
                  {!claimed && (
                    <>
                      <CopyButton value={link} label={`Copiar o convite de ${p.name}`} iconOnly />
                      <ActionForm
                        action={adoptParticipant}
                        fields={{ slug, participantId: p.id }}
                        className="min-w-0"
                        toastNote
                      >
                        <SubmitButton className="btn btn-sm btn-quiet">
                          Cuidar eu mesmo
                          <span className="sr-only"> de {p.name}</span>
                        </SubmitButton>
                      </ActionForm>
                    </>
                  )}
                  {group.status !== "festa" && group.status !== "encerrado" && (
                    <ActionForm
                      action={removeParticipant}
                      fields={{ slug, participantId: p.id }}
                      className="min-w-0"
                      toastNote
                    >
                      <ConfirmSubmit
                        confirmLabel={`Tirar ${p.name}?`}
                        className="btn btn-sm btn-danger !px-3"
                      >
                        <Icon name="trash" size={18} />
                        <span className="sr-only">Tirar {p.name} do grupo</span>
                      </ConfirmSubmit>
                    </ActionForm>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {building && !ctx.me && (
          <p className="mt-4">
            Você ainda não está no sorteio.{" "}
            <Link href={`/g/${slug}`} className="font-bold underline underline-offset-4">
              Entrar também
            </Link>
          </p>
        )}

        {building && (
          <ActionForm action={addParticipants} fields={fields} resetOnSuccess className="mt-5">
            <label className="label" htmlFor="names">
              Incluir pessoas
            </label>
            <textarea
              id="names"
              name="names"
              className="input"
              placeholder={"Um nome por linha\nEx.: Vó Lourdes"}
            />
            <p className="hint mt-1">
              Cada pessoa ganha um convite pessoal, que você manda pelo botão ao lado do nome. Para
              criança ou quem não tem conta, toque em “Cuidar eu mesmo”: o papelzinho dela fica
              na sua conta.
            </p>
            <SubmitButton className="btn btn-quiet mt-3" pendingLabel="Incluindo…">
              <Icon name="plus" size={18} />
              Incluir
            </SubmitButton>
          </ActionForm>
        )}
        {group.status === "sorteado" && !ladrao && (
          <p className="hint mt-4">
            Se alguém desistir, é só tirar: quem tinha tirado essa pessoa herda o amigo dela e
            ninguém mais muda.
          </p>
        )}
      </section>

      {/* ——— Restrições ——— */}
      {building && !ladrao && people.length >= 2 && (
        <>
          <hr className="cutline" />
          <section>
            <h2 className="text-xl">Quem não pode tirar quem</h2>
            <p className="mt-1 text-ink-soft">
              Para casais, pais e filhos pequenos ou quem mora na mesma casa.
            </p>
            {rules.length > 0 && (
              <ul className="mt-3 grid gap-2">
                {rules.map((rule) => (
                  <li key={rule.id} className="flex items-center gap-2">
                    <p className="flex-1">
                      <span className="font-bold">{nameOf(rule.giverId)}</span> não tira{" "}
                      <span className="font-bold">{nameOf(rule.receiverId)}</span>
                      {rule.soft && (
                        <span className="hint"> (par da edição passada; evitado se der)</span>
                      )}
                    </p>
                    <ActionForm action={removeExclusion} fields={{ slug, exclusionId: rule.id }}>
                      <SubmitButton className="btn btn-sm btn-ghost">
                        Remover
                        <span className="sr-only">
                          {" "}
                          a restrição entre {nameOf(rule.giverId)} e {nameOf(rule.receiverId)}
                        </span>
                      </SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
            <ActionForm action={addExclusion} fields={fields} resetOnSuccess className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="rule-a">
                    Esta pessoa
                  </label>
                  <select id="rule-a" name="a" className="input" required defaultValue="">
                    <option value="" disabled>
                      Escolha
                    </option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="rule-b">
                    não tira
                  </label>
                  <select id="rule-b" name="b" className="input" required defaultValue="">
                    <option value="" disabled>
                      Escolha
                    </option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="mt-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  name="mutual"
                  defaultChecked
                  className="h-5 w-5 accent-[var(--brand)]"
                />
                Vale para os dois lados
              </label>
              <SubmitButton className="btn btn-quiet mt-3">Adicionar restrição</SubmitButton>
            </ActionForm>
          </section>
        </>
      )}

      {/* ——— Temas ——— */}
      {group.themed && building && (
        <>
          <hr className="cutline" />
          <section>
            <h2 className="text-xl">Temas de presente</h2>
            <p className="mt-1 text-ink-soft">
              Cada pessoa recebe um destes junto com o nome. Se houver menos temas que pessoas,
              eles se repetem.
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {themeRows.map((theme) => (
                <li key={theme.id} className="chip !pr-1">
                  {theme.label}
                  <ActionForm action={removeTheme} fields={{ slug, themeId: theme.id }}>
                    <SubmitButton className="grid h-7 w-7 place-items-center rounded-full">
                      <Icon name="trash" size={15} />
                      <span className="sr-only">Remover o tema {theme.label}</span>
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
            <ActionForm
              action={addTheme}
              fields={fields}
              resetOnSuccess
              className="mt-3"
            >
              <label className="label" htmlFor="theme-label">
                Novo tema
              </label>
              <div className="flex gap-2">
                <input
                  id="theme-label"
                  name="label"
                  className="input flex-1"
                  maxLength={60}
                  placeholder="Ex.: algo que brilha"
                />
                <SubmitButton className="btn btn-quiet">Incluir</SubmitButton>
              </div>
            </ActionForm>
          </section>
        </>
      )}

      <hr className="cutline" />

      {/* ——— Detalhes ——— */}
      <details>
        <summary className="cursor-pointer text-xl font-extrabold">Detalhes do grupo</summary>
        <ActionForm action={updateGroup} fields={fields} className="mt-4 grid gap-4">
          <div>
            <label className="label" htmlFor="name">
              Nome do grupo
            </label>
            <input id="name" name="name" className="input" maxLength={60} defaultValue={group.name} required />
          </div>
          <div>
            <label className="label" htmlFor="occasion">
              Ocasião
            </label>
            <select id="occasion" name="occasion" className="input" defaultValue={group.occasion}>
              {OCCASION_KEYS.map((key) => (
                <option key={key} value={key}>
                  {OCCASIONS[key].label}
                </option>
              ))}
            </select>
          </div>
          {building && (
            <>
              <div>
                <label className="label" htmlFor="mode">
                  Jeito de jogar
                </label>
                <select id="mode" name="mode" className="input" defaultValue={group.mode}>
                  {MODE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {MODES[key].label}
                    </option>
                  ))}
                </select>
              </div>
              {!ladrao && (
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="themed"
                    defaultChecked={group.themed}
                    className="h-5 w-5 accent-[var(--brand)]"
                  />
                  Sortear também um tema de presente
                </label>
              )}
            </>
          )}
          {ladrao && (
            <div>
              <label className="label" htmlFor="maxSteals">
                Quantas vezes um presente pode ser roubado
              </label>
              <select
                id="maxSteals"
                name="maxSteals"
                className="input"
                defaultValue={String(group.maxSteals)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="eventDate">
                Dia da troca
              </label>
              <DateField id="eventDate" name="eventDate" defaultValue={group.eventDate} />
            </div>
            <div>
              <label className="label" htmlFor="eventTime">
                Hora
              </label>
              <TimeField id="eventTime" name="eventTime" defaultValue={group.eventTime} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="place">
              Onde vai ser
            </label>
            <input id="place" name="place" className="input" maxLength={120} defaultValue={group.place ?? ""} />
          </div>
          <fieldset>
            <legend className="label">Valor do presente, em reais</legend>
            <div className="grid grid-cols-2 gap-3">
              <input
                name="budgetMin"
                className="input"
                inputMode="numeric"
                placeholder="De"
                aria-label="Valor mínimo"
                defaultValue={group.budgetMin ?? ""}
              />
              <input
                name="budgetMax"
                className="input"
                inputMode="numeric"
                placeholder="Até"
                aria-label="Valor máximo"
                defaultValue={group.budgetMax ?? ""}
              />
            </div>
          </fieldset>
          <div>
            <label className="label" htmlFor="message">
              Recado para o grupo
            </label>
            <textarea
              id="message"
              name="message"
              className="input"
              maxLength={400}
              defaultValue={group.message ?? ""}
            />
          </div>
          <div>
            <SubmitButton pendingLabel="Salvando…">Salvar alterações</SubmitButton>
          </div>
        </ActionForm>
      </details>


      <hr className="cutline" />

      <details>
        <summary className="cursor-pointer text-xl font-extrabold">Nova edição e exclusão</summary>
        <div className="mt-4 grid gap-6">
          <div>
            <h3 className="text-lg">Fazer a próxima edição</h3>
            <p className="hint mt-1">
              Cria um grupo novo com as mesmas pessoas, já ligadas às contas delas. O sorteio de
              lá evita repetir os pares daqui. Este grupo continua existindo.
            </p>
            <ActionForm action={newEdition} fields={fields} className="mt-3">
              <SubmitButton className="btn btn-quiet" pendingLabel="Criando…">
                Criar próxima edição
              </SubmitButton>
            </ActionForm>
          </div>
          <div>
            <h3 className="text-lg">Excluir este grupo</h3>
            <p className="hint mt-1">
              Apaga pessoas, listas, conversas e o sorteio. Não dá para desfazer.
            </p>
            <ActionForm action={deleteGroup} fields={fields} className="mt-3">
              <label className="label" htmlFor="confirm">
                Digite “{group.name}” para confirmar
              </label>
              <input id="confirm" name="confirm" className="input" autoComplete="off" />
              <SubmitButton className="btn btn-danger mt-3" pendingLabel="Excluindo…">
                Excluir grupo
              </SubmitButton>
            </ActionForm>
          </div>
        </div>
      </details>
    </GroupFrame>
  );
}
