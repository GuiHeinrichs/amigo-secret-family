import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const groups = pgTable("groups", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  occasion: text("occasion").notNull().default("natal"),
  /** classico | onca | ladrao */
  mode: text("mode").notNull().default("classico"),
  /** Sorteia também um tema de presente para cada pessoa. */
  themed: boolean("themed").notNull().default(false),
  budgetMin: integer("budget_min"),
  budgetMax: integer("budget_max"),
  /** YYYY-MM-DD */
  eventDate: text("event_date"),
  /** HH:MM */
  eventTime: text("event_time"),
  place: text("place"),
  message: text("message"),
  adminToken: text("admin_token").notNull().unique(),
  /** montando | sorteado | festa | encerrado */
  status: text("status").notNull().default("montando"),
  drawnAt: ts("drawn_at"),
  previousGroupId: text("previous_group_id"),
  maxSteals: integer("max_steals").notNull().default(2),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const participants = pgTable(
  "participants",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    emoji: text("emoji").notNull(),
    color: text("color").notNull(),
    token: text("token").notNull().unique(),
    likes: text("likes"),
    dislikes: text("dislikes"),
    sizes: text("sizes"),
    /** Lacre: primeira vez que o papelzinho foi aberto. */
    openedAt: ts("opened_at"),
    /** Amigo Ladrão: posição na fila (1 = primeiro). */
    position: integer("position"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("participants_group_idx").on(t.groupId)],
);

export const exclusions = pgTable(
  "exclusions",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    giverId: text("giver_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    receiverId: text("receiver_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    /** Vinda da edição anterior: o sorteio tenta respeitar, mas abre mão se travar. */
    soft: boolean("soft").notNull().default(false),
  },
  (t) => [uniqueIndex("exclusions_pair_idx").on(t.giverId, t.receiverId)],
);

export const assignments = pgTable(
  "assignments",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    giverId: text("giver_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    receiverId: text("receiver_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    theme: text("theme"),
    /** Dicas que quem tirou escreve sobre o amigo, para a hora da festa. */
    hints: text("hints"),
    revealedAt: ts("revealed_at"),
    revealOrder: integer("reveal_order"),
    giverReadAt: ts("giver_read_at"),
    receiverReadAt: ts("receiver_read_at"),
  },
  (t) => [
    uniqueIndex("assignments_giver_idx").on(t.giverId),
    uniqueIndex("assignments_receiver_idx").on(t.receiverId),
    index("assignments_group_idx").on(t.groupId),
  ],
);

export const wishes = pgTable(
  "wishes",
  {
    id: text("id").primaryKey(),
    participantId: text("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url"),
    price: integer("price"),
    note: text("note"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("wishes_participant_idx").on(t.participantId)],
);

export const messages = pgTable(
  "messages",
  {
    id: text("id").primaryKey(),
    assignmentId: text("assignment_id")
      .notNull()
      .references(() => assignments.id, { onDelete: "cascade" }),
    fromGiver: boolean("from_giver").notNull(),
    body: text("body").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("messages_assignment_idx").on(t.assignmentId, t.createdAt)],
);

export const guesses = pgTable("guesses", {
  participantId: text("participant_id")
    .primaryKey()
    .references(() => participants.id, { onDelete: "cascade" }),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  guessId: text("guess_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const themes = pgTable(
  "themes",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
  },
  (t) => [index("themes_group_idx").on(t.groupId)],
);

export const parties = pgTable("parties", {
  groupId: text("group_id")
    .primaryKey()
    .references(() => groups.id, { onDelete: "cascade" }),
  /** clássico/onça: palpites | revelacao | placar — ladrão: jogo | fim */
  phase: text("phase").notNull(),
  /** Quem está entregando o presente agora (clássico/onça). */
  currentId: text("current_id"),
  /** O par de `currentId` já foi mostrado no telão. */
  shown: boolean("shown").notNull().default(false),
  /** Ladrão: índice na fila. */
  turn: integer("turn").notNull().default(0),
  /** Ladrão: quem foi roubado e joga agora. */
  pendingId: text("pending_id"),
  lastStolenGiftId: text("last_stolen_gift_id"),
  version: integer("version").notNull().default(0),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const gifts = pgTable(
  "gifts",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    label: text("label"),
    holderId: text("holder_id").references(() => participants.id, {
      onDelete: "set null",
    }),
    steals: integer("steals").notNull().default(0),
  },
  (t) => [index("gifts_group_idx").on(t.groupId)],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: ts("window_start").notNull(),
});

export type Group = typeof groups.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Wish = typeof wishes.$inferSelect;
export type Party = typeof parties.$inferSelect;
export type Gift = typeof gifts.$inferSelect;
