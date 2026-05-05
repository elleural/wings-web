CREATE TABLE "pump_rider_positions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"copycat_id" bigint NOT NULL,
	"pool_address" text NOT NULL,
	"token_mint" text NOT NULL,
	"creator" text,
	"trigger_signature" text,
	"score" numeric(8, 6),
	"predicted_max_hold_s" integer,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"entry_sol_lamports" bigint NOT NULL,
	"exit_sol_lamports" bigint,
	"pnl_lamports" bigint,
	"pnl_pct" numeric(10, 6),
	"status" "position_status" DEFAULT 'open' NOT NULL,
	"exit_reason" text,
	"token_name" text,
	"token_symbol" text,
	"image_uri" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pump_rider_copycat_id_unique" ON "pump_rider_positions" USING btree ("copycat_id");--> statement-breakpoint
CREATE INDEX "pump_rider_status_opened_idx" ON "pump_rider_positions" USING btree ("status","opened_at");--> statement-breakpoint
CREATE INDEX "pump_rider_closed_at_idx" ON "pump_rider_positions" USING btree ("closed_at");