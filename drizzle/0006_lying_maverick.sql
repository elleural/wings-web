CREATE TABLE "pump_rider_missed_opportunities" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"pool" text NOT NULL,
	"base_mint" text NOT NULL,
	"creator" text,
	"detected_at" timestamp with time zone NOT NULL,
	"score" numeric(8, 6),
	"prob_threshold" numeric(8, 6),
	"decision" text,
	"outcome" text NOT NULL,
	"peak_pda_lamports" bigint,
	"phase2_duration_seconds" integer,
	"issuer_profit_lamports" bigint,
	"estimated_missed_usd" numeric(10, 2),
	"token_name" text,
	"token_symbol" text,
	"image_uri" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pump_rider_missed_pool_unique" ON "pump_rider_missed_opportunities" USING btree ("pool");--> statement-breakpoint
CREATE INDEX "pump_rider_missed_detected_idx" ON "pump_rider_missed_opportunities" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "pump_rider_missed_outcome_idx" ON "pump_rider_missed_opportunities" USING btree ("outcome");