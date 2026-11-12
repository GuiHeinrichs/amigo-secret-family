import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AvatarPicker } from "@/components/client/avatar-picker";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/client/forms";
import { FrameSkeleton, GroupFrame, loadCtx } from "@/components/frame";
import { Icon } from "@/components/icons";
import { WishList } from "@/components/wish-list";
import { plural } from "@/lib/format";
import { modeOf } from "@/lib/occasions";
import { updateProfile } from "@/server/actions/participant";
import { addWish, removeWish } from "@/server/actions/wishlist";
import { listWishes } from "@/server/queries";

export const metadata: Metadata = { title: "Minha lista" };

export default function ListPage({ params }: PageProps<"/g/[slug]/lista">) {
  return (
    <Suspense fallback={<FrameSkeleton />}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/g/[slug]/lista">["params"] }) {
  const ctx = await loadCtx(params);
  const { group, me } = ctx;
  if (!me || group.mode === "ladrao") redirect(`/g/${group.slug}`);

  const slug = group.slug;
  const mode = modeOf(group.mode);
  const wishes = await listWishes(me.id);
  // Quem cuida de mais de uma pessoa precisa saber de quem é a lista na tela.
  const named = ctx.profiles.length > 1;

  return (
    <GroupFrame ctx={ctx} active="lista" trail={[{ label: "Minha lista" }]}>
      <h1 className="text-3xl">
        {mode.wishTitle}
        {named && ` de ${me.name}`}
      </h1>
      <p className="mt-2 text-ink-soft">
        Só quem tirar {named ? me.name : "você"} vê esta lista. Dá para mexer nela até o dia da
        troca.
      </p>

      <section aria-labelledby="wishes-title" className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="wishes-title" className="text-xl">
            {wishes.length > 0 ? "Já está na lista" : "Ainda sem itens"}
          </h2>
          {wishes.length > 0 && (
            <span className="chip chip-on flex-none">{plural(wishes.length, "item", "itens")}</span>
          )}
        </div>
        <WishList
          wishes={wishes}
          empty={mode.wishEmpty}
          action={(wish) => (
            <ActionForm action={removeWish} fields={{ slug, wishId: wish.id }} toastNote>
              <ConfirmSubmit confirmLabel="Apagar?" className="btn btn-sm btn-ghost">
                <Icon name="trash" size={18} />
                <span className="sr-only">Apagar {wish.title}</span>
              </ConfirmSubmit>
            </ActionForm>
          )}
        />
      </section>

      <ActionForm
        action={addWish}
        fields={{ slug }}
        resetOnSuccess
        toastNote
        className="panel mt-6 grid gap-4"
      >
        <h2 className="text-xl">Incluir um item</h2>
        <div>
          <label className="label" htmlFor="title">
            Novo item
          </label>
          <input
            id="title"
            name="title"
            className="input"
            maxLength={80}
            required
            placeholder={mode.wishPlaceholder}
          />
        </div>
        <div>
          <label className="label" htmlFor="note">
            Detalhe <span className="hint font-normal">(opcional)</span>
          </label>
          <input
            id="note"
            name="note"
            className="input"
            maxLength={140}
            placeholder="Cor, tamanho, modelo"
          />
        </div>
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <div>
            <label className="label" htmlFor="url">
              Link <span className="hint font-normal">(opcional)</span>
            </label>
            <input id="url" name="url" className="input" inputMode="url" placeholder="loja.com.br/..." />
          </div>
          <div>
            <label className="label" htmlFor="price">
              Preço
            </label>
            <input id="price" name="price" className="input" inputMode="numeric" placeholder="R$" />
          </div>
        </div>
        <div>
          <SubmitButton pendingLabel="Incluindo…">Incluir na lista</SubmitButton>
        </div>
      </ActionForm>

      <hr className="cutline" />

      <section>
        <h2 className="text-xl">{named ? `Sobre ${me.name}` : "Sobre você"}</h2>
        <p className="mt-1 text-ink-soft">
          Ajuda quem tirou {named ? me.name : "você"} a acertar no presente.
        </p>
        <ActionForm action={updateProfile} fields={{ slug }} toastNote className="mt-4 grid gap-4">
          <div>
            <label className="label" htmlFor="name">
              Nome no grupo
            </label>
            <input id="name" name="name" className="input" maxLength={40} defaultValue={me.name} required />
          </div>
          <AvatarPicker
            emoji={me.emoji}
            color={me.color}
            legend={named ? `Bichinho de ${me.name}` : undefined}
          />
          <div>
            <label className="label" htmlFor="sizes">
              Tamanhos
            </label>
            <input
              id="sizes"
              name="sizes"
              className="input"
              maxLength={200}
              defaultValue={me.sizes ?? ""}
              placeholder="Ex.: camiseta M, calçado 38"
            />
          </div>
          <div>
            <label className="label" htmlFor="likes">
              Gosto de
            </label>
            <textarea
              id="likes"
              name="likes"
              className="input"
              maxLength={300}
              defaultValue={me.likes ?? ""}
              placeholder="Ex.: café, plantas, livro de suspense"
            />
          </div>
          <div>
            <label className="label" htmlFor="dislikes">
              Não gosto de
            </label>
            <textarea
              id="dislikes"
              name="dislikes"
              className="input"
              maxLength={300}
              defaultValue={me.dislikes ?? ""}
              placeholder="Ex.: perfume doce, coisa de decoração"
            />
          </div>
          <div>
            <SubmitButton className="btn btn-quiet" pendingLabel="Salvando…">
              Salvar perfil
            </SubmitButton>
          </div>
        </ActionForm>
      </section>
    </GroupFrame>
  );
}
