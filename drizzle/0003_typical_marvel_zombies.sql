CREATE TYPE "public"."agent_source" AS ENUM('hermes', 'copycat');--> statement-breakpoint
CREATE TYPE "public"."candidate_event_status" AS ENUM('pending', 'decided', 'expired');--> statement-breakpoint
CREATE TYPE "public"."replay_status" AS ENUM('pass', 'fail', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."supervisor_mode" AS ENUM('paper', 'live', 'paused');--> statement-breakpoint
ALTER TYPE "public"."message_author" ADD VALUE 'copycat' BEFORE 'user';--> statement-breakpoint
ALTER TYPE "public"."trading_mode" ADD VALUE 'paused';--> statement-breakpoint
CREATE TABLE "candidate_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"trade_type_id" integer NOT NULL,
	"program_id" text NOT NULL,
	"asset_mint" text,
	"idempotency_key" text NOT NULL,
	"fired_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ttl_ms" integer DEFAULT 5000 NOT NULL,
	"status" "candidate_event_status" DEFAULT 'pending' NOT NULL,
	"decision_id" integer,
	"raw_event" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heartbeats" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source" "agent_source" NOT NULL,
	"host" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"mode" "supervisor_mode" DEFAULT 'paper' NOT NULL,
	"mem_used_mb" integer,
	"ollama_model_resident" text,
	"watcher_lag_ms" integer,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "mined_trades" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"signature" text NOT NULL,
	"slot" bigint NOT NULL,
	"sender" text NOT NULL,
	"profit_usd" numeric(20, 8) NOT NULL,
	"hold_seconds" integer DEFAULT 0 NOT NULL,
	"capital_in_usd" numeric(20, 8) NOT NULL,
	"programs" text[] NOT NULL,
	"trade_type_id" integer,
	"raw_data" jsonb,
	"classified_at" timestamp with time zone,
	"mined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_taxonomy" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"program_id" text NOT NULL,
	"type" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"ottersec_repo_url" text,
	"source_audit_status" text DEFAULT 'pending' NOT NULL,
	"blocked" boolean DEFAULT false NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replay_proofs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"mined_trade_id" integer NOT NULL,
	"slot" bigint NOT NULL,
	"status" "replay_status" NOT NULL,
	"balance_delta_match" boolean DEFAULT false NOT NULL,
	"lamport_tolerance_used" bigint DEFAULT 0 NOT NULL,
	"failure_hypothesis" text,
	"ran_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trade_taxonomy" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"description" text,
	"exemplar_signatures" text[],
	"replay_pass_rate" numeric(5, 4),
	"replay_gated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD COLUMN "source" "agent_source" DEFAULT 'hermes' NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD COLUMN "source" "agent_source" DEFAULT 'hermes' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "candidate_events_idempotency_key_unique" ON "candidate_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "candidate_events_status_idx" ON "candidate_events" USING btree ("status","fired_at");--> statement-breakpoint
CREATE INDEX "candidate_events_type_idx" ON "candidate_events" USING btree ("trade_type_id","fired_at");--> statement-breakpoint
CREATE INDEX "heartbeats_source_ts_idx" ON "heartbeats" USING btree ("source","ts");--> statement-breakpoint
CREATE UNIQUE INDEX "mined_trades_signature_unique" ON "mined_trades" USING btree ("signature");--> statement-breakpoint
CREATE INDEX "mined_trades_type_idx" ON "mined_trades" USING btree ("trade_type_id");--> statement-breakpoint
CREATE INDEX "mined_trades_profit_idx" ON "mined_trades" USING btree ("profit_usd");--> statement-breakpoint
CREATE INDEX "mined_trades_slot_idx" ON "mined_trades" USING btree ("slot");--> statement-breakpoint
CREATE UNIQUE INDEX "program_taxonomy_program_id_unique" ON "program_taxonomy" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "replay_proofs_trade_idx" ON "replay_proofs" USING btree ("mined_trade_id");--> statement-breakpoint
CREATE INDEX "replay_proofs_status_idx" ON "replay_proofs" USING btree ("status","ran_at");--> statement-breakpoint
CREATE UNIQUE INDEX "trade_taxonomy_name_version_unique" ON "trade_taxonomy" USING btree ("name","version");