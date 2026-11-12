# Vídeo de apresentação do Laço

Animação de um minuto que apresenta o Laço a quem chega, feita com
[Remotion](https://www.remotion.dev) (vídeo programado em React). É um projeto
à parte, com as próprias dependências: não entra no build do site.

O resultado fica em `../public/apresentacao.mp4` (com a capa
`apresentacao.jpg`) e aparece na página inicial.

## Gerar de novo

```bash
cd video
npm install
npm run music     # sintetiza a trilha em public/trilha.wav
npm run render    # out/apresentacao.mp4
npm run poster    # out/apresentacao.jpg
```

Depois copie `out/apresentacao.mp4` e `out/apresentacao.jpg` para `../public/`.
Para editar com pré-visualização, use `npm run studio`.

## O que tem aqui

- `src/scenes.tsx`: uma cena por funcionalidade (grupo, convite, lista,
  sorteio, papelzinho, conversa, festa, jeitos de jogar), mais abertura e
  encerramento.
- `src/ui.tsx`: as peças visuais, com as mesmas cores e fontes do site.
- `scripts/music.mjs`: a trilha, uma caixinha de música calma composta e
  sintetizada no próprio script, sem arquivos de terceiros.

O Remotion é gratuito para uso pessoal e para empresas pequenas; empresas
maiores precisam de licença (veja o site deles).
