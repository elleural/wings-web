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

export const pumpRiderPositionUpsertSchema = z.object({
	copycatId: z.number().int().positive(),
	poolAddress: z.string().min(1),
	tokenMint: z.string().min(1),
	creator: z.string().nullish(),
	triggerSignature: z.string().nullish(),
	score: z.number().nullish(),
	predictedMaxHoldS: z.number().int().nullish(),
	openedAt: isoDate,
	closedAt: isoDate.nullish(),
	entrySolLamports: z.number().int().nonnegative(),
	exitSolLamports: z.number().int().nullish(),
	pnlLamports: z.number().int().nullish(),
	pnlPct: z.number().nullish(),
	status: z.enum(['open', 'closed', 'reserved']).default('open'),
	exitReason: z.string().nullish(),
	tokenName: z.string().nullish(),
	tokenSymbol: z.string().nullish(),
	imageUri: z.string().nullish()
});
export type PumpRiderPositionUpsert = z.infer<typeof pumpRiderPositionUpsertSchema>;

export const pumpRiderBatchSchema = z.object({
	positions: z.array(pumpRiderPositionUpsertSchema).max(500)
});
export type PumpRiderBatch = z.infer<typeof pumpRiderBatchSchema>;

export const pumpRiderMissedUpsertSchema = z.object({
	pool: z.string().min(1),
	baseMint: z.string().min(1),
	creator: z.string().nullish(),
	detectedAt: isoDate,
	score: z.number().nullish(),
	probThreshold: z.number().nullish(),
	decision: z.string().nullish(),
	outcome: z.string().min(1),
	peakPdaLamports: z.number().int().nullish(),
	phase2DurationSeconds: z.number().int().nullish(),
	issuerProfitLamports: z.number().int().nullish(),
	estimatedMissedUsd: z.number().nullish(),
	tokenName: z.string().nullish(),
	tokenSymbol: z.string().nullish(),
	imageUri: z.string().nullish()
});
export type PumpRiderMissedUpsert = z.infer<typeof pumpRiderMissedUpsertSchema>;

export const pumpRiderMissedBatchSchema = z.object({
	missed: z.array(pumpRiderMissedUpsertSchema).max(500)
});
export type PumpRiderMissedBatch = z.infer<typeof pumpRiderMissedBatchSchema>;

// Mirror of pumpRiderPositionUpsertSchema for DLMM-LP strategies (A3 et al).
// Field shape matches `_to_payload` in copycat/follow/a3_dlmm_sync.py.
export const dlmmLpPositionUpsertSchema = z.object({
	copycatId: z.number().int().positive(),
	strategy: z.string().min(1),
	poolAddress: z.string().min(1),
	tokenMintX: z.string().nullish(),
	binIdLow: z.number().int().nullish(),
	binIdHigh: z.number().int().nullish(),
	geometry: z.string().nullish(),
	openedAt: isoDate,
	closedAt: isoDate.nullish(),
	status: z.enum(['open', 'closed', 'reserved']).default('open'),
	exitStrategy: z.string().nullish(),
	exitReason: z.string().nullish(),
	// Sizing — accept numbers; route casts to decimal string for Postgres NUMERIC
	entryValueUsd: z.number().nullish(),
	exitValueUsd: z.number().nullish(),
	// Realized accounting (closed) or live accumulators (open)
	realizedFeesUsd: z.number().nullish(),
	realizedLvrUsd: z.number().nullish(),
	realizedPnlUsd: z.number().nullish(),
	realizedYieldRate: z.number().nullish(),
	gasCostUsd: z.number().nullish(),
	nRebalances: z.number().int().nullish(),
	holdSeconds: z.number().int().nullish(),
	outOfRangeSeconds: z.number().int().nullish(),
	// Gate inputs at entry — explains WHY we opened
	sigmaAtEntry: z.number().nullish(),
	feeYieldRateAtEntry: z.number().nullish(),
	lvrRateAtEntry: z.number().nullish(),
	safetyMarginUsed: z.number().nullish(),
	predictedYieldRate: z.number().nullish(),
	feeMultiplierUsed: z.number().nullish(),
	feeMultiplierSource: z.string().nullish(),
	binActiveUsdAtEntry: z.number().nullish(),
	binActiveIdAtEntry: z.number().int().nullish(),
	paramSetId: z.number().int().nullish(),
	// Live diagnostics
	lastSnapTs: isoDate.nullish(),
	openPositionValueUsd: z.number().nullish()
});
export type DlmmLpPositionUpsert = z.infer<typeof dlmmLpPositionUpsertSchema>;

export const dlmmLpBatchSchema = z.object({
	positions: z.array(dlmmLpPositionUpsertSchema).max(500)
});
export type DlmmLpBatch = z.infer<typeof dlmmLpBatchSchema>;
