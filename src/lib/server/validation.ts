/**
 * Zod schemas shared by the API route handlers.
 * Numerics are accepted as strings (preserve precision through Postgres NUMERIC).
 */
import { z } from 'zod';

const decimalString = z
	.string()
	.regex(/^-?\d+(\.\d+)?$/, 'Must be a decimal string like "12.345"');

const isoDate = z.union([
	z.string().datetime({ offset: true }),
	z.string().datetime() // also accept Z form
]);

export const venueSchema = z.enum([
	'polymarket',
	'meteora_dlmm',
	'meteora_damm_v2',
	'meteora_damm_v1',
	'bridge_mayan',
	'bridge_debridge',
	'bridge_cctp',
	'other'
]);

export const sideSchema = z.enum(['buy', 'sell']);

export const orderTypeSchema = z.enum([
	'gtc',
	'gtd',
	'fok',
	'fak',
	'lp_open',
	'lp_close',
	'lp_rebalance',
	'bridge'
]);

export const orderStatusSchema = z.enum([
	'proposed',
	'submitted',
	'partial',
	'filled',
	'cancelled',
	'rejected',
	'expired'
]);

export const subAgentSchema = z.enum([
	'orchestrator',
	'quant_scanner',
	'macro_analyst',
	'risk_manager',
	'execution_agent'
]);

// ---------- request bodies --------------------------------------------------

export const orderCreateSchema = z.object({
	accountId: z.number().int().positive(),
	positionId: z.number().int().positive().nullish(),
	venue: venueSchema,
	marketId: z.string().min(1),
	marketCategory: z.string().nullish(),
	side: sideSchema,
	type: orderTypeSchema,
	size: decimalString,
	price: decimalString.nullish(),
	notionalUsd: decimalString.nullish(),
	status: orderStatusSchema.default('proposed'),
	isMaker: z.boolean().default(true),
	venueOrderId: z.string().nullish(),
	tickSize: decimalString.nullish(),
	reason: z.string().nullish(),
	rejectReason: z.string().nullish(),
	params: z.record(z.string(), z.unknown()).nullish(),
	expiresAt: isoDate.nullish()
});
export type OrderCreate = z.infer<typeof orderCreateSchema>;

export const fillCreateSchema = z.object({
	accountId: z.number().int().positive(),
	orderId: z.number().int().positive(),
	isPaper: z.boolean().default(true),
	size: decimalString,
	price: decimalString,
	notionalUsd: decimalString,
	feeUsd: decimalString.default('0'),
	rebateUsd: decimalString.default('0'),
	slippageUsd: decimalString.default('0'),
	gasUsd: decimalString.default('0'),
	bridgeFeeUsd: decimalString.default('0'),
	lvrModeledUsd: decimalString.nullish(),
	txSig: z.string().nullish(),
	filledAt: isoDate.nullish()
});
export type FillCreate = z.infer<typeof fillCreateSchema>;

export const decisionCreateSchema = z.object({
	accountId: z.number().int().positive(),
	subAgent: subAgentSchema,
	skillInvoked: z.string().nullish(),
	inputs: z.unknown().nullish(),
	output: z.unknown().nullish(),
	rationale: z.string().nullish(),
	orderId: z.number().int().positive().nullish(),
	positionId: z.number().int().positive().nullish(),
	approved: z.boolean().nullish(),
	rejectReason: z.string().nullish(),
	llmTokensIn: z.number().int().nonnegative().nullish(),
	llmTokensOut: z.number().int().nonnegative().nullish(),
	llmCostUsd: decimalString.nullish(),
	decidedAt: isoDate.nullish()
});
export type DecisionCreate = z.infer<typeof decisionCreateSchema>;

export const snapshotCreateSchema = z.object({
	accountId: z.number().int().positive(),
	hour: isoDate,
	equityUsd: decimalString,
	realizedUsd: decimalString,
	unrealizedUsd: decimalString,
	highWaterMarkUsd: decimalString,
	drawdownPct: decimalString,
	sharpe30d: decimalString.nullish(),
	mdd30dPct: decimalString.nullish(),
	var95Usd: decimalString.nullish(),
	openPositionsCount: z.number().int().nonnegative().default(0),
	reserveUsd: decimalString.default('0')
});
export type SnapshotCreate = z.infer<typeof snapshotCreateSchema>;

export const skillInvocationCreateSchema = z.object({
	accountId: z.number().int().positive().nullish(),
	skillName: z.string().min(1),
	skillVersion: z.string().nullish(),
	skillCategory: z.string().nullish(),
	latencyMs: z.number().int().nonnegative().nullish(),
	success: z.boolean().default(true),
	errorMessage: z.string().nullish(),
	llmCostUsd: decimalString.nullish(),
	shadow: z.boolean().default(false),
	invokedAt: isoDate.nullish()
});
export type SkillInvocationCreate = z.infer<typeof skillInvocationCreateSchema>;

export const accountUpsertSchema = z.object({
	name: z.string().min(1).default('default'),
	mode: z.enum(['paper', 'live']).default('paper'),
	equityUsd: decimalString,
	startingEquityUsd: decimalString,
	highWaterMarkUsd: decimalString,
	reserveUsd: decimalString.default('0')
});
export type AccountUpsert = z.infer<typeof accountUpsertSchema>;
