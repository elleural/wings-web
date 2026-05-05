/**
 * POST /api/v1/dlmm-lp-positions  — upsert a batch of Meteora-DLMM LP paper
 *                                    trades pushed from copycat (a3_dlmm_sync
 *                                    worker). Idempotent on copycatId.
 *                                    Mirror of /api/v1/pump-rider-positions
 *                                    with a richer payload (LVR-gate inputs,
 *                                    bin-level liquidity, convergence linkage).
 * GET  /api/v1/dlmm-lp-positions  — list recent rows for the dashboard.
 *                                    ?status=open|closed (optional),
 *                                    ?strategy=a3_dlmm_lp (optional),
 *                                    ?limit=N (max 500).
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { dlmmLpBatchSchema } from '$lib/server/validation';
import { and, desc, eq } from 'drizzle-orm';

function toDecimalString(n: number | null | undefined): string | null {
	if (n === null || n === undefined) return null;
	if (!Number.isFinite(n)) return null;
	return n.toString();
}

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, dlmmLpBatchSchema);

	if (body.positions.length === 0) {
		return ok({ upserted: 0 });
	}

	let upserted = 0;
	for (const p of body.positions) {
		const values = {
			copycatId: p.copycatId,
			strategy: p.strategy,
			poolAddress: p.poolAddress,
			tokenMintX: p.tokenMintX ?? null,
			binIdLow: p.binIdLow ?? null,
			binIdHigh: p.binIdHigh ?? null,
			geometry: p.geometry ?? null,
			openedAt: new Date(p.openedAt),
			closedAt: p.closedAt ? new Date(p.closedAt) : null,
			status: p.status,
			exitStrategy: p.exitStrategy ?? null,
			exitReason: p.exitReason ?? null,
			entryValueUsd: toDecimalString(p.entryValueUsd) as never,
			exitValueUsd: toDecimalString(p.exitValueUsd) as never,
			realizedFeesUsd: toDecimalString(p.realizedFeesUsd) as never,
			realizedLvrUsd: toDecimalString(p.realizedLvrUsd) as never,
			realizedPnlUsd: toDecimalString(p.realizedPnlUsd) as never,
			realizedYieldRate: toDecimalString(p.realizedYieldRate) as never,
			gasCostUsd: toDecimalString(p.gasCostUsd) as never,
			nRebalances: p.nRebalances ?? null,
			holdSeconds: p.holdSeconds ?? null,
			outOfRangeSeconds: p.outOfRangeSeconds ?? null,
			sigmaAtEntry: toDecimalString(p.sigmaAtEntry) as never,
			feeYieldRateAtEntry: toDecimalString(p.feeYieldRateAtEntry) as never,
			lvrRateAtEntry: toDecimalString(p.lvrRateAtEntry) as never,
			safetyMarginUsed: toDecimalString(p.safetyMarginUsed) as never,
			predictedYieldRate: toDecimalString(p.predictedYieldRate) as never,
			feeMultiplierUsed: toDecimalString(p.feeMultiplierUsed) as never,
			feeMultiplierSource: p.feeMultiplierSource ?? null,
			binActiveUsdAtEntry: toDecimalString(p.binActiveUsdAtEntry) as never,
			binActiveIdAtEntry: p.binActiveIdAtEntry ?? null,
			paramSetId: p.paramSetId ?? null,
			lastSnapTs: p.lastSnapTs ? new Date(p.lastSnapTs) : null,
			openPositionValueUsd: toDecimalString(p.openPositionValueUsd) as never,
			syncedAt: new Date()
		};

		await db
			.insert(schema.dlmmLpPositions)
			.values(values)
			.onConflictDoUpdate({
				target: schema.dlmmLpPositions.copycatId,
				set: {
					closedAt: values.closedAt,
					status: values.status,
					exitReason: values.exitReason,
					exitValueUsd: values.exitValueUsd,
					realizedFeesUsd: values.realizedFeesUsd,
					realizedLvrUsd: values.realizedLvrUsd,
					realizedPnlUsd: values.realizedPnlUsd,
					realizedYieldRate: values.realizedYieldRate,
					gasCostUsd: values.gasCostUsd,
					nRebalances: values.nRebalances,
					holdSeconds: values.holdSeconds,
					outOfRangeSeconds: values.outOfRangeSeconds,
					lastSnapTs: values.lastSnapTs,
					openPositionValueUsd: values.openPositionValueUsd,
					syncedAt: new Date()
				}
			});
		upserted++;
	}

	return created({ upserted });
}

export async function GET({ url }) {
	const status = url.searchParams.get('status');
	const strategy = url.searchParams.get('strategy');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500);

	const filters = [];
	if (status === 'open' || status === 'closed' || status === 'reserved') {
		filters.push(eq(schema.dlmmLpPositions.status, status));
	}
	if (strategy) {
		filters.push(eq(schema.dlmmLpPositions.strategy, strategy));
	}

	const baseQ = db.select().from(schema.dlmmLpPositions);
	const q = filters.length > 0 ? baseQ.where(and(...filters)) : baseQ;
	const rows = await q.orderBy(desc(schema.dlmmLpPositions.openedAt)).limit(limit);
	return ok({ positions: rows });
}
