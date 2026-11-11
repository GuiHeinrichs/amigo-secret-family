CREATE TABLE "assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"giver_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"theme" text,
	"hints" text,
	"revealed_at" timestamp with time zone,
	"reveal_order" integer,
	"giver_read_at" timestamp with time zone,
	"receiver_read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "exclusions" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"giver_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"soft" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gifts" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"number" integer NOT NULL,
	"label" text,
	"holder_id" text,
	"steals" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"occasion" text DEFAULT 'natal' NOT NULL,
	"mode" text DEFAULT 'classico' NOT NULL,
	"themed" boolean DEFAULT false NOT NULL,
	"budget_min" integer,
	"budget_max" integer,
	"event_date" text,
	"event_time" text,
	"place" text,
	"message" text,
	"admin_token" text NOT NULL,
	"status" text DEFAULT 'montando' NOT NULL,
	"drawn_at" timestamp with time zone,
	"previous_group_id" text,
	"max_steals" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_slug_unique" UNIQUE("slug"),
	CONSTRAINT "groups_admin_token_unique" UNIQUE("admin_token")
);
--> statement-breakpoint
CREATE TABLE "guesses" (
	"participant_id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"guess_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"assignment_id" text NOT NULL,
	"from_giver" boolean NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"name" text NOT NULL,
	"emoji" text NOT NULL,
	"color" text NOT NULL,
	"token" text NOT NULL,
	"likes" text,
	"dislikes" text,
	"sizes" text,
	"opened_at" timestamp with time zone,
	"position" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"group_id" text PRIMARY KEY NOT NULL,
	"phase" text NOT NULL,
	"current_id" text,
	"shown" boolean DEFAULT false NOT NULL,
	"turn" integer DEFAULT 0 NOT NULL,
	"pending_id" text,
	"last_stolen_gift_id" text,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"window_start" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishes" (
	"id" text PRIMARY KEY NOT NULL,
	"participant_id" text NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"price" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_giver_id_participants_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_receiver_id_participants_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_giver_id_participants_id_fk" FOREIGN KEY ("giver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_receiver_id_participants_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_holder_id_participants_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guesses" ADD CONSTRAINT "guesses_guess_id_participants_id_fk" FOREIGN KEY ("guess_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_giver_idx" ON "assignments" USING btree ("giver_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assignments_receiver_idx" ON "assignments" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "assignments_group_idx" ON "assignments" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "exclusions_pair_idx" ON "exclusions" USING btree ("giver_id","receiver_id");--> statement-breakpoint
CREATE INDEX "gifts_group_idx" ON "gifts" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "messages_assignment_idx" ON "messages" USING btree ("assignment_id","created_at");--> statement-breakpoint
CREATE INDEX "participants_group_idx" ON "participants" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "themes_group_idx" ON "themes" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "wishes_participant_idx" ON "wishes" USING btree ("participant_id");