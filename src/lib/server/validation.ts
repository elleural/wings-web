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
	llmComputeSeconds: decimalString.nullish(),
	llmModel: z.string().nullish(),
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
	llmComputeSeconds: decimalString.nullish(),
	llmModel: z.string().nullish(),
	shadow: z.boolean().default(false),
	invokedAt: isoDate.nullish()
});
export type SkillInvocationCreate = z.infer<typeof skillInvocationCreateSchema>;

export const messageKindSchema = z.enum([
	'feature_request',
	'tool_update',
	'access_request',
	'problem_report',
	'question',
	'reply',
	'note'
]);

export const messageAuthorSchema = z.enum(['hermes', 'copycat', 'user', 'claude']);
export const agentSourceSchema = z.enum(['hermes', 'copycat']);

export const messageStatusSchema = z.enum([
	'open',
	'acked',
	'in_progress',
	'resolved',
	'wont_fix'
]);

export const messageSeveritySchema = z.enum(['critical', 'high', 'normal', 'low']);

export const messageCreateSchema = z.object({
	accountId: z.number().int().positive().nullish(),
	kind: messageKindSchema,
	author: messageAuthorSchema,
	parentId: z.number().int().positive().nullish(),
	subject: z.string().nullish(),
	body: z.string().min(1),
	status: messageStatusSchema.default('open'),
	severity: messageSeveritySchema.default('normal'),
	source: agentSourceSchema.default('hermes'),
	relatedSkill: z.string().nullish(),
	relatedRepo: z.string().nullish(),
	relatedCommitSha: z.string().nullish(),
	tags: z.array(z.string()).nullish(),
	metadata: z.unknown().nullish()
});
export type MessageCreate = z.infer<typeof messageCreateSchema>;

export const messageUpdateSchema = z.object({
	status: messageStatusSchema.optional(),
	severity: messageSeveritySchema.optional(),
	relatedCommitSha: z.string().nullish().optional(),
	relatedSkill: z.string().nullish().optional(),
	tags: z.array(z.string()).nullish().optional()
});
export type MessageUpdate = z.infer<typeof messageUpdateSchema>;

// ----- copycat schemas -------------------------------------------------------

const decimalString = z.string().regex(/^-?\d+(\.\d+)?$/, 'Must be a decimal string like "12.345"');

export const heartbeatCreateSchema = z.object({
	source: agentSourceSchema.default('copycat'),
	host: z.string().min(1),
	mode: z.enum(['paper', 'live', 'paused']).default('paper'),
	memUsedMb: z.number().int().nonnegative().nullish(),
	ollamaModelResident: z.string().nullish(),
	watcherLagMs: z.number().int().nonnegative().nullish(),
	metadata: z.unknown().nullish()
});
export type HeartbeatCreate = z.infer<typeof heartbeatCreateSchema>;

export const minedTradeCreateSchema = z.object({
	signature: z.string().min(1),
	slot: z.number().int().nonnegative(),
	sender: z.string().min(1),
	profitUsd: z.string(),
	holdSeconds: z.number().int().nonnegative().default(0),
	capitalInUsd: z.string(),
	programs: z.array(z.string()),
	tradeTypeId: z.number().int().positive().nullish(),
	rawData: z.unknown().nullish()
});
export type MinedTradeCreate = z.infer<typeof minedTradeCreateSchema>;

export const tradeTypeCreateSchema = z.object({
	name: z.string().min(1),
	version: z.number().int().nonnegative().default(0),
	description: z.string().nullish(),
	exemplarSignatures: z.array(z.string()).nullish()
});
export type TradeTypeCreate = z.infer<typeof tradeTypeCreateSchema>;

export const tradeTypeUpdateSchema = z.object({
	replayPassRate: z.string().nullish(),
	replayGated: z.boolean().nullish()
});
export type TradeTypeUpdate = z.infer<typeof tradeTypeUpdateSchema>;

export const programCreateSchema = z.object({
	programId: z.string().min(1),
	name: z.string().min(1),
	type: z.string().min(1),
	verified: z.boolean().default(false),
	ottersecRepoUrl: z.string().nullish(),
	sourceAuditStatus: z.string().default('pending')
});
export type ProgramCreate = z.infer<typeof programCreateSchema>;

export const programUpdateSchema = z.object({
	sourceAuditStatus: z.string().nullish(),
	blocked: z.boolean().nullish(),
	verified: z.boolean().nullish(),
	ottersecRepoUrl: z.string().nullish()
});
export type ProgramUpdate = z.infer<typeof programUpdateSchema>;

export const replayProofCreateSchema = z.object({
	minedTradeId: z.number().int().positive(),
	slot: z.number().int().nonnegative(),
	status: z.enum(['pass', 'fail', 'timeout']),
	balanceDeltaMatch: z.boolean(),
	lamportToleranceUsed: z.number().int().nonnegative().default(0),
	failureHypothesis: z.string().nullish()
});
export type ReplayProofCreate = z.infer<typeof replayProofCreateSchema>;

export const candidateEventCreateSchema = z.object({
	tradeTypeId: z.number().int().positive(),
	programId: z.string().min(1),
	assetMint: z.string().nullish(),
	idempotencyKey: z.string().min(1),
	ttlMs: z.number().int().nonnegative().default(5000),
	rawEvent: z.unknown().nullish()
});
export type CandidateEventCreate = z.infer<typeof candidateEventCreateSchema>;

export const candidateEventUpdateSchema = z.object({
	status: z.enum(['pending', 'decided', 'expired']),
	decisionId: z.number().int().positive().nullish()
});
export type CandidateEventUpdate = z.infer<typeof candidateEventUpdateSchema>;

export const accountUpsertSchema = z.object({
	name: z.string().min(1).default('default'),
	mode: z.enum(['paper', 'live']).default('paper'),
	equityUsd: decimalString,
	startingEquityUsd: decimalString,
	highWaterMarkUsd: decimalString,
	reserveUsd: decimalString.default('0')
});
export type AccountUpsert = z.infer<typeof accountUpsertSchema>;
