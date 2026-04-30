CREATE TYPE "public"."message_author" AS ENUM('hermes', 'user', 'claude');--> statement-breakpoint
CREATE TYPE "public"."message_kind" AS ENUM('feature_request', 'tool_update', 'access_request', 'problem_report', 'question', 'reply', 'note');--> statement-breakpoint
CREATE TYPE "public"."message_severity" AS ENUM('critical', 'high', 'normal', 'low');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('open', 'acked', 'in_progress', 'resolved', 'wont_fix');--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer,
	"kind" "message_kind" NOT NULL,
	"author" "message_author" NOT NULL,
	"parent_id" integer,
	"subject" text,
	"body" text NOT NULL,
	"status" "message_status" DEFAULT 'open' NOT NULL,
	"severity" "message_severity" DEFAULT 'normal' NOT NULL,
	"related_skill" text,
	"related_repo" text,
	"related_commit_sha" text,
	"tags" text[],
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "agent_messages_status_idx" ON "agent_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "agent_messages_thread_idx" ON "agent_messages" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "agent_messages_author_idx" ON "agent_messages" USING btree ("author","created_at");--> statement-breakpoint
CREATE INDEX "agent_messages_kind_idx" ON "agent_messages" USING btree ("kind","created_at");