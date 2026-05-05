CREATE TABLE "dlmm_lp_positions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"copycat_id" bigint NOT NULL,
	"strategy" text NOT NULL,
	"pool_address" text NOT NULL,
	"token_mint_x" text,
	"bin_id_low" integer,
	"bin_id_high" integer,
	"geometry" text,
	"opened_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"status" "position_status" DEFAULT 'open' NOT NULL,
	"exit_strategy" text,
	"exit_reason" text,
	"entry_value_usd" numeric(20, 8),
	"exit_value_usd" numeric(20, 8),
	"realized_fees_usd" numeric(20, 8),
	"realized_lvr_usd" numeric(20, 8),
	"realized_pnl_usd" numeric(20, 8),
	"realized_yield_rate" numeric(12, 8),
	"gas_cost_usd" numeric(20, 8),
	"n_rebalances" integer,
	"hold_seconds" integer,
	"out_of_range_seconds" integer,
	"sigma_at_entry" numeric(12, 8),
	"fee_yield_rate_at_entry" numeric(20, 8),
	"lvr_rate_at_entry" numeric(20, 8),
	"safety_margin_used" numeric(8, 4),
	"predicted_yield_rate" numeric(12, 8),
	"fee_multiplier_used" numeric(12, 6),
	"fee_multiplier_source" text,
	"bin_active_usd_at_entry" numeric(20, 8),
	"bin_active_id_at_entry" integer,
	"param_set_id" bigint,
	"last_snap_ts" timestamp with time zone,
	"open_position_value_usd" numeric(20, 8),
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "dlmm_lp_copycat_id_unique" ON "dlmm_lp_positions" USING btree ("copycat_id");--> statement-breakpoint
CREATE INDEX "dlmm_lp_strategy_status_idx" ON "dlmm_lp_positions" USING btree ("strategy","status");--> statement-breakpoint
CREATE INDEX "dlmm_lp_status_opened_idx" ON "dlmm_lp_positions" USING btree ("status","opened_at");--> statement-breakpoint
CREATE INDEX "dlmm_lp_closed_at_idx" ON "dlmm_lp_positions" USING btree ("closed_at");