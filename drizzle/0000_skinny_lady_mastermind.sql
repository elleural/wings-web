CREATE TYPE "public"."order_side" AS ENUM('buy', 'sell');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('proposed', 'submitted', 'partial', 'filled', 'cancelled', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."order_type" AS ENUM('gtc', 'gtd', 'fok', 'fak', 'lp_open', 'lp_close', 'lp_rebalance', 'bridge');--> statement-breakpoint
CREATE TYPE "public"."position_status" AS ENUM('open', 'closed', 'reserved');--> statement-breakpoint
CREATE TYPE "public"."sub_agent" AS ENUM('orchestrator', 'quant_scanner', 'macro_analyst', 'risk_manager', 'execution_agent');--> statement-breakpoint
CREATE TYPE "public"."trading_mode" AS ENUM('paper', 'live');--> statement-breakpoint
CREATE TYPE "public"."venue" AS ENUM('polymarket', 'meteora_dlmm', 'meteora_damm_v2', 'meteora_damm_v1', 'bridge_mayan', 'bridge_debridge', 'bridge_cctp', 'other');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'default' NOT NULL,
	"mode" "trading_mode" DEFAULT 'paper' NOT NULL,
	"equity_usd" numeric(20, 8) NOT NULL,
	"starting_equity_usd" numeric(20, 8) NOT NULL,
	"high_water_mark_usd" numeric(20, 8) NOT NULL,
	"reserve_usd" numeric(20, 8) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_pnl_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "agent_decisions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"sub_agent" "sub_agent" NOT NULL,
	"skill_invoked" text,
	"inputs" jsonb,
	"output" jsonb,
	"rationale" text,
	"order_id" integer,
	"position_id" integer,
	"approved" boolean,
	"reject_reason" text,
	"llm_tokens_in" integer,
	"llm_tokens_out" integer,
	"llm_cost_usd" numeric(20, 8),
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_accruals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"day" timestamp with time zone NOT NULL,
	"venue" "venue" NOT NULL,
	"market_category" text,
	"taker_fees_usd" numeric(20, 8) DEFAULT '0' NOT NULL,
	"maker_rebates_usd" numeric(20, 8) DEFAULT '0' NOT NULL,
	"gas_usd" numeric(20, 8) DEFAULT '0' NOT NULL,
	"bridge_fees_usd" numeric(20, 8) DEFAULT '0' NOT NULL,
	"dlmm_fees_earned_usd" numeric(20, 8) DEFAULT '0' NOT NULL,
	"lvr_modeled_usd" numeric(20, 8) DEFAULT '0' NOT NULL,
	"fee_equivalent_sum" numeric(20, 8) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fills" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"is_paper" boolean DEFAULT true NOT NULL,
	"size" numeric(38, 18) NOT NULL,
	"price" numeric(20, 8) NOT NULL,
	"notional_usd" numeric(20, 8) NOT NULL,
	"fee_usd" numeric(20, 8) DEFAULT '0' NOT NULL,
	"rebate_usd" numeric(20, 8) DEFAULT '0' NOT NULL,
	"slippage_usd" numeric(20, 8) DEFAULT '0' NOT NULL,
	"gas_usd" numeric(20, 8) DEFAULT '0' NOT NULL,
	"bridge_fee_usd" numeric(20, 8) DEFAULT '0' NOT NULL,
	"lvr_modeled_usd" numeric(20, 8),
	"tx_sig" text,
	"filled_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"position_id" integer,
	"venue" "venue" NOT NULL,
	"market_id" text NOT NULL,
	"market_category" text,
	"side" "order_side" NOT NULL,
	"type" "order_type" NOT NULL,
	"size" numeric(38, 18) NOT NULL,
	"filled_size" numeric(38, 18) DEFAULT '0' NOT NULL,
	"price" numeric(20, 8),
	"notional_usd" numeric(20, 8),
	"status" "order_status" DEFAULT 'proposed' NOT NULL,
	"is_maker" boolean DEFAULT true NOT NULL,
	"venue_order_id" text,
	"tick_size" numeric(20, 8),
	"reason" text,
	"reject_reason" text,
	"params" jsonb,
	"proposed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "pnl_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"hour" timestamp with time zone NOT NULL,
	"equity_usd" numeric(20, 8) NOT NULL,
	"realized_usd" numeric(20, 8) NOT NULL,
	"unrealized_usd" numeric(20, 8) NOT NULL,
	"high_water_mark_usd" numeric(20, 8) NOT NULL,
	"drawdown_pct" numeric(10, 6) NOT NULL,
	"sharpe_30d" numeric(10, 4),
	"mdd_30d_pct" numeric(10, 6),
	"var_95_usd" numeric(20, 8),
	"open_positions_count" integer DEFAULT 0 NOT NULL,
	"reserve_usd" numeric(20, 8) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"venue" "venue" NOT NULL,
	"market_id" text NOT NULL,
	"market_category" text,
	"side" "order_side",
	"size" numeric(38, 18) NOT NULL,
	"entry_price" numeric(20, 8) NOT NULL,
	"entry_notional_usd" numeric(20, 8) NOT NULL,
	"current_price" numeric(20, 8),
	"unrealized_pnl_usd" numeric(20, 8),
	"status" "position_status" DEFAULT 'open' NOT NULL,
	"dlmm_geometry" text,
	"dlmm_bin_lower" integer,
	"dlmm_bin_upper" integer,
	"pm_token_id" text,
	"pm_dispute_risk" numeric(10, 8),
	"state" jsonb,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"realized_pnl_usd" numeric(20, 8)
);
--> statement-breakpoint
CREATE TABLE "skill_invocations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"account_id" integer,
	"skill_name" text NOT NULL,
	"skill_version" text,
	"skill_category" text,
	"latency_ms" integer,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"llm_cost_usd" numeric(20, 8),
	"shadow" boolean DEFAULT false NOT NULL,
	"invoked_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_name_unique" ON "accounts" USING btree ("name");--> statement-breakpoint
CREATE INDEX "agent_decisions_account_idx" ON "agent_decisions" USING btree ("account_id","decided_at");--> statement-breakpoint
CREATE INDEX "agent_decisions_sub_agent_idx" ON "agent_decisions" USING btree ("sub_agent","decided_at");--> statement-breakpoint
CREATE INDEX "agent_decisions_skill_idx" ON "agent_decisions" USING btree ("skill_invoked","decided_at");--> statement-breakpoint
CREATE UNIQUE INDEX "fee_accruals_unique_idx" ON "fee_accruals" USING btree ("account_id","day","venue","market_category");--> statement-breakpoint
CREATE INDEX "fee_accruals_day_idx" ON "fee_accruals" USING btree ("day");--> statement-breakpoint
CREATE INDEX "fills_order_idx" ON "fills" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "fills_account_filled_idx" ON "fills" USING btree ("account_id","filled_at");--> statement-breakpoint
CREATE INDEX "fills_filled_at_idx" ON "fills" USING btree ("filled_at");--> statement-breakpoint
CREATE INDEX "orders_account_status_idx" ON "orders" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "orders_market_idx" ON "orders" USING btree ("venue","market_id","proposed_at");--> statement-breakpoint
CREATE INDEX "orders_proposed_idx" ON "orders" USING btree ("proposed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "pnl_snapshots_account_hour_idx" ON "pnl_snapshots" USING btree ("account_id","hour");--> statement-breakpoint
CREATE INDEX "pnl_snapshots_hour_idx" ON "pnl_snapshots" USING btree ("hour");--> statement-breakpoint
CREATE INDEX "positions_account_status_idx" ON "positions" USING btree ("account_id","status");--> statement-breakpoint
CREATE INDEX "positions_market_idx" ON "positions" USING btree ("venue","market_id");--> statement-breakpoint
CREATE INDEX "positions_opened_at_idx" ON "positions" USING btree ("opened_at");--> statement-breakpoint
CREATE INDEX "skill_invocations_skill_idx" ON "skill_invocations" USING btree ("skill_name","invoked_at");--> statement-breakpoint
CREATE INDEX "skill_invocations_invoked_idx" ON "skill_invocations" USING btree ("invoked_at");