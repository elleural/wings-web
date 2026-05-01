/**
 * wings-web schema v1
 *
 * Tables capture the full operational state of the Hermes autonomous investor:
 *  - accounts                : root row, tracks paper-vs-live mode and current equity
 *  - positions               : open and closed positions across venues
 *  - orders                  : proposed -> submitted -> filled/cancelled lifecycle
 *  - fills                   : per-execution row (paper-simulated or live)
 *  - fee_accruals            : daily aggregated fee/rebate/gas/bridge accounting
 *  - pnl_snapshots           : hourly mark-to-market snapshots
 *  - agent_decisions         : every sub-agent decision with input/output/rationale
 *  - skill_invocations       : per-skill run latency + success metrics
 *  - agent_messages          : two-way message inbox between Hermes, the user, and Claude
 *                              (feature requests, problem reports, replies, resolutions)
 *
 * Money columns:
 *  - USD-quantity columns -> numeric(20, 8) (8dp = 1e-8 cent precision; comfortable for fiat)
 *  - share/token-quantity columns -> numeric(38, 18) (matches max-decimal SPL/ERC token precision)
 *  - probability/price-as-prob columns -> numeric(10, 8) (8dp range over [0, 1])
 */

import { sql } from 'drizzle-orm';
import {
	bigserial,
	boolean,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

// ----- ENUMS ----------------------------------------------------------------

export const tradingModeEnum = pgEnum('trading_mode', ['paper', 'live']);

export const venueEnum = pgEnum('venue', [
	'polymarket',
	'meteora_dlmm',
	'meteora_damm_v2',
	'meteora_damm_v1',
	'bridge_mayan',
	'bridge_debridge',
	'bridge_cctp',
	'other'
]);

export const positionStatusEnum = pgEnum('position_status', ['open', 'closed', 'reserved']);

export const orderSideEnum = pgEnum('order_side', ['buy', 'sell']);

export const orderTypeEnum = pgEnum('order_type', [
	'gtc', // good-til-cancelled (Polymarket)
	'gtd', // good-til-date
	'fok', // fill-or-kill
	'fak', // fill-and-kill (Polymarket's IOC equivalent)
	'lp_open', // open a Meteora LP position
	'lp_close', // close a Meteora LP position
	'lp_rebalance', // rebalance a Meteora LP position
	'bridge' // cross-chain stablecoin move
]);

export const orderStatusEnum = pgEnum('order_status', [
	'proposed', // Risk Manager approved, not yet submitted
	'submitted', // sent to venue (or simulated by paper ledger)
	'partial', // partially filled
	'filled', // fully filled
	'cancelled', // cancelled before fill
	'rejected', // venue or gate rejected
	'expired' // GTD timed out
]);

export const subAgentEnum = pgEnum('sub_agent', [
	'orchestrator',
	'quant_scanner',
	'macro_analyst',
	'risk_manager',
	'execution_agent'
]);

export const messageKindEnum = pgEnum('message_kind', [
	'feature_request', // Hermes wants new tool or behavior
	'tool_update', // Hermes wants existing tool changed
	'access_request', // Hermes needs new credential / scope
	'problem_report', // Something broke
	'question', // Hermes wants clarification
	'reply', // Threaded reply (any author)
	'note' // Free-form
]);

export const messageAuthorEnum = pgEnum('message_author', ['hermes', 'user', 'claude']);

export const messageStatusEnum = pgEnum('message_status', [
	'open', // newly filed; awaiting human read
	'acked', // human has read it
	'in_progress', // someone is working on it
	'resolved', // shipped (related_commit_sha populated when code was the answer)
	'wont_fix' // declined
]);

export const messageSeverityEnum = pgEnum('message_severity', [
	'critical',
	'high',
	'normal',
	'low'
]);

// ----- ACCOUNTS -------------------------------------------------------------

export const accounts = pgTable(
	'accounts',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		name: text('name').notNull().default('default'),
		mode: tradingModeEnum('mode').notNull().default('paper'),

		// Capital (denominated in USD)
		equityUsd: numeric('equity_usd', { precision: 20, scale: 8 }).notNull(),
		startingEquityUsd: numeric('starting_equity_usd', { precision: 20, scale: 8 }).notNull(),
		highWaterMarkUsd: numeric('high_water_mark_usd', { precision: 20, scale: 8 }).notNull(),

		// Reserved capital for disputable Polymarket positions
		reserveUsd: numeric('reserve_usd', { precision: 20, scale: 8 }).notNull().default('0'),

		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.default(sql`now()`),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.default(sql`now()`),
		lastPnlAt: timestamp('last_pnl_at', { withTimezone: true, mode: 'date' })
	},
	(t) => [uniqueIndex('accounts_name_unique').on(t.name)]
);

// ----- POSITIONS ------------------------------------------------------------

export const positions = pgTable(
	'positions',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		accountId: integer('account_id').notNull(),
		venue: venueEnum('venue').notNull(),

		// Polymarket: condition_id + tokenId; Meteora: pool address + bin range
		marketId: text('market_id').notNull(),
		marketCategory: text('market_category'), // crypto / weather / finance / etc.

		// Direction
		side: orderSideEnum('side'),

		// Quantities
		size: numeric('size', { precision: 38, scale: 18 }).notNull(),
		entryPrice: numeric('entry_price', { precision: 20, scale: 8 }).notNull(),
		entryNotionalUsd: numeric('entry_notional_usd', { precision: 20, scale: 8 }).notNull(),

		// Realtime mark
		currentPrice: numeric('current_price', { precision: 20, scale: 8 }),
		unrealizedPnlUsd: numeric('unrealized_pnl_usd', { precision: 20, scale: 8 }),

		status: positionStatusEnum('status').notNull().default('open'),

		// Meteora-specific
		dlmmGeometry: text('dlmm_geometry'), // 'spot_concentrated' | 'spot_spread' | 'spot_wide' | 'curve' | 'bid_ask'
		dlmmBinLower: integer('dlmm_bin_lower'),
		dlmmBinUpper: integer('dlmm_bin_upper'),

		// Polymarket-specific
		pmTokenId: text('pm_token_id'),
		pmDisputeRisk: numeric('pm_dispute_risk', { precision: 10, scale: 8 }), // [0,1]

		// Free-form per-position state (current bins, last rebalance time, etc.)
		state: jsonb('state'),

		openedAt: timestamp('opened_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.default(sql`now()`),
		closedAt: timestamp('closed_at', { withTimezone: true, mode: 'date' }),
		realizedPnlUsd: numeric('realized_pnl_usd', { precision: 20, scale: 8 })
	},
	(t) => [
		index('positions_account_status_idx').on(t.accountId, t.status),
		index('positions_market_idx').on(t.venue, t.marketId),
		index('positions_opened_at_idx').on(t.openedAt)
	]
);

// ----- ORDERS ---------------------------------------------------------------

export const orders = pgTable(
	'orders',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		accountId: integer('account_id').notNull(),
		positionId: integer('position_id'),

		venue: venueEnum('venue').notNull(),
		marketId: text('market_id').notNull(),
		marketCategory: text('market_category'),

		side: orderSideEnum('side').notNull(),
		type: orderTypeEnum('type').notNull(),

		size: numeric('size', { precision: 38, scale: 18 }).notNull(),
		filledSize: numeric('filled_size', { precision: 38, scale: 18 }).notNull().default('0'),
		price: numeric('price', { precision: 20, scale: 8 }), // null for market-style orders
		notionalUsd: numeric('notional_usd', { precision: 20, scale: 8 }),

		status: orderStatusEnum('status').notNull().default('proposed'),
		isMaker: boolean('is_maker').notNull().default(true),

		// Identifier on the venue (Polymarket order hash, Solana tx sig, etc.)
		venueOrderId: text('venue_order_id'),

		// Tick / minimum size info captured at submit time for audit
		tickSize: numeric('tick_size', { precision: 20, scale: 8 }),

		// Why was this submitted (or rejected)?
		reason: text('reason'),
		rejectReason: text('reject_reason'),

		// Free-form
		params: jsonb('params'),

		proposedAt: timestamp('proposed_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.default(sql`now()`),
		submittedAt: timestamp('submitted_at', { withTimezone: true, mode: 'date' }),
		expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
		closedAt: timestamp('closed_at', { withTimezone: true, mode: 'date' })
	},
	(t) => [
		index('orders_account_status_idx').on(t.accountId, t.status),
		index('orders_market_idx').on(t.venue, t.marketId, t.proposedAt),
		index('orders_proposed_idx').on(t.proposedAt)
	]
);

// ----- FILLS ----------------------------------------------------------------

export const fills = pgTable(
	'fills',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		accountId: integer('account_id').notNull(),
		orderId: integer('order_id').notNull(),

		isPaper: boolean('is_paper').notNull().default(true),

		size: numeric('size', { precision: 38, scale: 18 }).notNull(),
		price: numeric('price', { precision: 20, scale: 8 }).notNull(),
		notionalUsd: numeric('notional_usd', { precision: 20, scale: 8 }).notNull(),

		// Fee accounting (USD)
		feeUsd: numeric('fee_usd', { precision: 20, scale: 8 }).notNull().default('0'),
		rebateUsd: numeric('rebate_usd', { precision: 20, scale: 8 }).notNull().default('0'),
		slippageUsd: numeric('slippage_usd', { precision: 20, scale: 8 }).notNull().default('0'),
		gasUsd: numeric('gas_usd', { precision: 20, scale: 8 }).notNull().default('0'),
		bridgeFeeUsd: numeric('bridge_fee_usd', { precision: 20, scale: 8 }).notNull().default('0'),

		// LVR is COUNTERFACTUAL (modeled, not paid). Tracks adverse-selection cost.
		lvrModeledUsd: numeric('lvr_modeled_usd', { precision: 20, scale: 8 }),

		// On-chain refs
		txSig: text('tx_sig'),

		filledAt: timestamp('filled_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.default(sql`now()`)
	},
	(t) => [
		index('fills_order_idx').on(t.orderId),
		index('fills_account_filled_idx').on(t.accountId, t.filledAt),
		index('fills_filled_at_idx').on(t.filledAt)
	]
);

// ----- FEE ACCRUALS (daily roll-up) -----------------------------------------

export const feeAccruals = pgTable(
	'fee_accruals',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		accountId: integer('account_id').notNull(),
		day: timestamp('day', { withTimezone: true, mode: 'date' }).notNull(),
		venue: venueEnum('venue').notNull(),
		marketCategory: text('market_category'),

		takerFeesUsd: numeric('taker_fees_usd', { precision: 20, scale: 8 }).notNull().default('0'),
		makerRebatesUsd: numeric('maker_rebates_usd', { precision: 20, scale: 8 })
			.notNull()
			.default('0'),
		gasUsd: numeric('gas_usd', { precision: 20, scale: 8 }).notNull().default('0'),
		bridgeFeesUsd: numeric('bridge_fees_usd', { precision: 20, scale: 8 }).notNull().default('0'),
		dlmmFeesEarnedUsd: numeric('dlmm_fees_earned_usd', { precision: 20, scale: 8 })
			.notNull()
			.default('0'),
		lvrModeledUsd: numeric('lvr_modeled_usd', { precision: 20, scale: 8 })
			.notNull()
			.default('0'),

		// Auxiliary maker-rebate-pool tracking (Polymarket): your_fee_equivalent / total
		feeEquivalentSum: numeric('fee_equivalent_sum', { precision: 20, scale: 8 })
			.notNull()
			.default('0'),

		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.default(sql`now()`)
	},
	(t) => [
		uniqueIndex('fee_accruals_unique_idx').on(t.accountId, t.day, t.venue, t.marketCategory),
		index('fee_accruals_day_idx').on(t.day)
	]
);

// ----- PNL SNAPSHOTS (hourly mark) ------------------------------------------

export const pnlSnapshots = pgTable(
	'pnl_snapshots',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		accountId: integer('account_id').notNull(),

		// Truncated to the hour
		hour: timestamp('hour', { withTimezone: true, mode: 'date' }).notNull(),

		equityUsd: numeric('equity_usd', { precision: 20, scale: 8 }).notNull(),
		realizedUsd: numeric('realized_usd', { precision: 20, scale: 8 }).notNull(),
		unrealizedUsd: numeric('unrealized_usd', { precision: 20, scale: 8 }).notNull(),
		highWaterMarkUsd: numeric('high_water_mark_usd', { precision: 20, scale: 8 }).notNull(),
		drawdownPct: numeric('drawdown_pct', { precision: 10, scale: 6 }).notNull(),

		// Rolling stats
		sharpe30d: numeric('sharpe_30d', { precision: 10, scale: 4 }),
		mdd30dPct: numeric('mdd_30d_pct', { precision: 10, scale: 6 }),
		var95Usd: numeric('var_95_usd', { precision: 20, scale: 8 }),

		openPositionsCount: integer('open_positions_count').notNull().default(0),
		reserveUsd: numeric('reserve_usd', { precision: 20, scale: 8 }).notNull().default('0'),

		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.default(sql`now()`)
	},
	(t) => [
		uniqueIndex('pnl_snapshots_account_hour_idx').on(t.accountId, t.hour),
		index('pnl_snapshots_hour_idx').on(t.hour)
	]
);

// ----- AGENT DECISIONS ------------------------------------------------------

export const agentDecisions = pgTable(
	'agent_decisions',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		accountId: integer('account_id').notNull(),

		subAgent: subAgentEnum('sub_agent').notNull(),
		skillInvoked: text('skill_invoked'),

		// Free-form input/output/rationale (jsonb so we can query into it later)
		inputs: jsonb('inputs'),
		output: jsonb('output'),
		rationale: text('rationale'),

		// Linkage to the order/position it produced (if any)
		orderId: integer('order_id'),
		positionId: integer('position_id'),

		// Was it gate-approved? Why not, if not?
		approved: boolean('approved'),
		rejectReason: text('reject_reason'),

		// Cost tracking
		llmTokensIn: integer('llm_tokens_in'),
		llmTokensOut: integer('llm_tokens_out'),
		llmCostUsd: numeric('llm_cost_usd', { precision: 20, scale: 8 }),
		// Wall-clock seconds of inference. Primary cost signal under local-Ollama
		// architecture; llmCostUsd stays for any rare fallback API calls.
		llmComputeSeconds: numeric('llm_compute_seconds', { precision: 12, scale: 4 }),
		llmModel: text('llm_model'), // e.g. 'ollama:hermes3:8b'

		decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.default(sql`now()`)
	},
	(t) => [
		index('agent_decisions_account_idx').on(t.accountId, t.decidedAt),
		index('agent_decisions_sub_agent_idx').on(t.subAgent, t.decidedAt),
		index('agent_decisions_skill_idx').on(t.skillInvoked, t.decidedAt)
	]
);

// ----- SKILL INVOCATIONS ----------------------------------------------------

export const skillInvocations = pgTable(
	'skill_invocations',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		accountId: integer('account_id'),

		skillName: text('skill_name').notNull(),
		skillVersion: text('skill_version'),
		skillCategory: text('skill_category'),

		latencyMs: integer('latency_ms'),
		success: boolean('success').notNull().default(true),
		errorMessage: text('error_message'),

		// Optional: aggregated per-invocation cost
		llmCostUsd: numeric('llm_cost_usd', { precision: 20, scale: 8 }),
		// Wall-clock inference seconds aggregated across the skill's run
		llmComputeSeconds: numeric('llm_compute_seconds', { precision: 12, scale: 4 }),
		llmModel: text('llm_model'),

		// Was this a shadow-mode A/B run?
		shadow: boolean('shadow').notNull().default(false),

		invokedAt: timestamp('invoked_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.default(sql`now()`)
	},
	(t) => [
		index('skill_invocations_skill_idx').on(t.skillName, t.invokedAt),
		index('skill_invocations_invoked_idx').on(t.invokedAt)
	]
);

// ----- AGENT MESSAGES (two-way inbox) ---------------------------------------

export const agentMessages = pgTable(
	'agent_messages',
	{
		id: bigserial('id', { mode: 'number' }).primaryKey(),
		accountId: integer('account_id'), // optional — system-wide messages don't need one

		kind: messageKindEnum('kind').notNull(),
		author: messageAuthorEnum('author').notNull(),

		// Threading: replies set parentId to the top-level message they reply to.
		// Top-level messages have parentId = NULL.
		parentId: integer('parent_id'),

		subject: text('subject'), // one-line summary (top-level only, typically)
		body: text('body').notNull(), // markdown allowed

		status: messageStatusEnum('status').notNull().default('open'),
		severity: messageSeverityEnum('severity').notNull().default('normal'),

		// Optional context
		relatedSkill: text('related_skill'),
		relatedRepo: text('related_repo'), // 'wings' | 'wings-web' | etc.
		relatedCommitSha: text('related_commit_sha'), // populated when resolved by code

		// Free-form
		tags: text('tags').array(),
		metadata: jsonb('metadata'),

		createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.default(sql`now()`),
		updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
			.notNull()
			.default(sql`now()`),
		resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' })
	},
	(t) => [
		index('agent_messages_status_idx').on(t.status, t.createdAt),
		index('agent_messages_thread_idx').on(t.parentId),
		index('agent_messages_author_idx').on(t.author, t.createdAt),
		index('agent_messages_kind_idx').on(t.kind, t.createdAt)
	]
);

// ----- TYPE EXPORTS ---------------------------------------------------------

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Position = typeof positions.$inferSelect;
export type NewPosition = typeof positions.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type Fill = typeof fills.$inferSelect;
export type NewFill = typeof fills.$inferInsert;
export type FeeAccrual = typeof feeAccruals.$inferSelect;
export type NewFeeAccrual = typeof feeAccruals.$inferInsert;
export type PnlSnapshot = typeof pnlSnapshots.$inferSelect;
export type NewPnlSnapshot = typeof pnlSnapshots.$inferInsert;
export type AgentDecision = typeof agentDecisions.$inferSelect;
export type NewAgentDecision = typeof agentDecisions.$inferInsert;
export type SkillInvocation = typeof skillInvocations.$inferSelect;
export type NewSkillInvocation = typeof skillInvocations.$inferInsert;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type NewAgentMessage = typeof agentMessages.$inferInsert;
