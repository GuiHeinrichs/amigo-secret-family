export type OccasionKey =
  | "natal"
  | "pascoa"
  | "junina"
  | "aniversario"
  | "firma"
  | "outro";

export type ModeKey = "classico" | "onca" | "ladrao";

export type Occasion = {
  label: string;
  hint: string;
  emoji: string;
  /** Cor principal, a segunda cor e a cor da fita. */
  brand: string;
  leaf: string;
  gold: string;
};

export const OCCASIONS: Record<OccasionKey, Occasion> = {
  natal: {
    label: "Natal",
    hint: "Ceia, rabanada e papel de presente",
    emoji: "🎄",
    brand: "#C2183C",
    leaf: "#0E5A45",
    gold: "#E8A93B",
  },
  pascoa: {
    label: "Páscoa",
    hint: "Amigo chocolate",
    emoji: "🐣",
    brand: "#6B3A2A",
    leaf: "#7447B8",
    gold: "#F2B84B",
  },
  junina: {
    label: "Festa junina",
    hint: "Arraiá, quentão e bandeirinha",
    emoji: "🌽",
    brand: "#1F4E9E",
    leaf: "#B8430E",
    gold: "#F5C518",
  },
  aniversario: {
    label: "Aniversário",
    hint: "Todo mundo presenteia todo mundo",
    emoji: "🎂",
    brand: "#C81E66",
    leaf: "#0C6F78",
    gold: "#FFC53D",
  },
  firma: {
    label: "Firma",
    hint: "Confraternização do trabalho",
    emoji: "☕",
    brand: "#233A7A",
    leaf: "#0F6A62",
    gold: "#F59E0B",
  },
  outro: {
    label: "Outra ocasião",
    hint: "Qualquer desculpa para trocar presente",
    emoji: "🎁",
    brand: "#6D28D9",
    leaf: "#0F6A62",
    gold: "#F4B400",
  },
};

export const OCCASION_KEYS = Object.keys(OCCASIONS) as OccasionKey[];

export function occasionOf(key: string): Occasion {
  return OCCASIONS[(key as OccasionKey) in OCCASIONS ? (key as OccasionKey) : "outro"];
}

export type ModeCopy = {
  label: string;
  description: string;
  /** "seu amigo secreto" / "seu amigo da onça" */
  friend: string;
  wishTitle: string;
  wishEmpty: string;
  wishPlaceholder: string;
  giftAdvice: string;
};

export const MODES: Record<ModeKey, ModeCopy> = {
  classico: {
    label: "Clássico",
    description: "Cada pessoa tira um nome e dá um presente de verdade.",
    friend: "amigo secreto",
    wishTitle: "Lista de desejos",
    wishEmpty: "Sua lista está vazia. Quem tirou você vai agradecer por uma dica.",
    wishPlaceholder: "Ex.: caneca grande, livro de receitas",
    giftAdvice: "Dê uma olhada na lista de desejos antes de comprar.",
  },
  onca: {
    label: "Amigo da Onça",
    description:
      "O mesmo sorteio, só que o presente é zoeira: quanto mais inútil, melhor.",
    friend: "amigo da onça",
    wishTitle: "Lista do que eu não quero",
    wishEmpty: "Nada aqui ainda. Conte o que seria o pior presente do mundo para você.",
    wishPlaceholder: "Ex.: meia furada, CD de pagode dos anos 90",
    giftAdvice: "A lista abaixo é do que a pessoa NÃO quer. Use com maldade.",
  },
  ladrao: {
    label: "Amigo Ladrão",
    description:
      "Ninguém tira ninguém. Cada um traz um presente e, na festa, escolhe: abrir um novo ou roubar um já aberto.",
    friend: "presente",
    wishTitle: "Lista de desejos",
    wishEmpty: "",
    wishPlaceholder: "",
    giftAdvice: "",
  },
};

export const MODE_KEYS = Object.keys(MODES) as ModeKey[];

export function modeOf(key: string): ModeCopy {
  return MODES[(key as ModeKey) in MODES ? (key as ModeKey) : "classico"];
}

export const AVATAR_EMOJIS = [
  "🦊", "🐻", "🐼", "🦁", "🐸", "🐧", "🦉", "🦄",
  "🐙", "🦜", "🐢", "🦋", "🐝", "🦥", "🐳", "🦩",
  "🌵", "🍉", "🍍", "⚽", "🎸", "🚀", "🌈", "⭐",
];

export const AVATAR_COLORS = [
  "#F9C6CF", "#FCD9A8", "#FBEA9D", "#C9E8B4",
  "#B5E3DC", "#BBD8F7", "#D7C8F5", "#F3C4E8",
];

export const THEME_PRESETS = [
  "Algo de comer ou beber",
  "Algo azul",
  "Da papelaria",
  "Para usar em casa",
  "Feito à mão",
  "Que caiba no bolso",
  "Para ler",
  "Para a cozinha",
  "Jogo ou brincadeira",
  "Para levar à praia",
];

export const QUICK_QUESTIONS = {
  /** Eu sou quem tirou: pergunto sem me identificar. */
  amigo: [
    "Qual é o seu tamanho de roupa?",
    "Prefere doce ou salgado?",
    "Que cor você mais usa?",
    "O que você anda querendo e ainda não comprou?",
    "Tem algo que você não quer ganhar de jeito nenhum?",
  ],
  /** Eu fui tirado: falo com quem me tirou. */
  misterio: [
    "Me dá uma dica de quem é você?",
    "A gente se vê toda semana?",
    "Você já me deu presente antes?",
    "Pode caprichar que eu mereço!",
  ],
} as const;

export type ChatSide = keyof typeof QUICK_QUESTIONS;
