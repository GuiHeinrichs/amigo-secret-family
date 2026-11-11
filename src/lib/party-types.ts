export type Person = { id: string; name: string; emoji: string; color: string };

export type ClassicParty = {
  kind: "classico";
  /** "antes": a festa ainda não foi aberta por quem organiza. */
  phase: "antes" | "palpites" | "revelacao" | "placar";
  version: number;
  people: Person[];
  meId: string | null;
  isAdmin: boolean;
  guessCount: number;
  myGuessId: string | null;
  /** Quem está entregando o presente agora. */
  currentId: string | null;
  shown: boolean;
  /** Dicas que a pessoa da vez escreveu sobre o amigo. */
  hints: string | null;
  /** Só vem preenchido depois de revelado no telão. */
  receiverId: string | null;
  revealed: { giverId: string; receiverId: string }[];
  remaining: number;
  canAct: boolean;
  /** Só no placar: palpite de cada pessoa e quem de fato a tirou. */
  score: { id: string; guessId: string | null; giverId: string; correct: boolean }[] | null;
};

export type LadraoGiftView = {
  id: string;
  number: number;
  label: string | null;
  holderId: string | null;
  steals: number;
  locked: boolean;
  canOpen: boolean;
  canSteal: boolean;
  canLabel: boolean;
};

export type LadraoParty = {
  kind: "ladrao";
  phase: "antes" | "jogo" | "fim";
  version: number;
  people: Person[];
  meId: string | null;
  isAdmin: boolean;
  /** ids na ordem da fila */
  order: string[];
  turn: number;
  currentId: string | null;
  /** A pessoa da vez acabou de ser roubada. */
  wasRobbed: boolean;
  gifts: LadraoGiftView[];
  maxSteals: number;
  canAct: boolean;
};

export type PartyState = ClassicParty | LadraoParty;
