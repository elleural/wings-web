/**
 * POST /api/v1/pump-rider-positions  — upsert a batch of pump_rider paper trades
 *                                      from copycat. Used by the local
 *                                      pump_rider_sync worker; idempotent on
 *                                      copycatId.
 * GET  /api/v1/pump-rider-positions  — list recent rows for the dashboard.
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { pumpRiderBatchSchema } from '$lib/server/validation';
import { desc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

function toDecimalString(n: number | null | undefined): string | null {
	if (n === null || n === undefined) return null;
	if (!Number.isFinite(n)) return null;
	return n.toString();
}

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, pumpRiderBatchSchema);

	if (body.positions.length === 0) {
		return ok({ inserted: 0, updated: 0 });
	}

	// Insert with ON CONFLICT on copycatId — Drizzle's onConflictDoUpdate
	// gives us idempotent upsert.
	let upserted = 0;
	for (const p of body.positions) {
		await db
			.insert(schema.pumpRiderPositions)
			.values({
				copycatId: p.copycatId,
				poolAddress: p.poolAddress,
				tokenMint: p.tokenMint,
				creator: p.creator ?? null,
				triggerSignature: p.triggerSignature ?? null,
				score: toDecimalString(p.score) as never,
				predictedMaxHoldS: p.predictedMaxHoldS ?? null,
				openedAt: new Date(p.openedAt),
				closedAt: p.closedAt ? new Date(p.closedAt) : null,
				entrySolLamports: p.entrySolLamports,
				exitSolLamports: p.exitSolLamports ?? null,
				pnlLamports: p.pnlLamports ?? null,
				pnlPct: toDecimalString(p.pnlPct) as never,
				status: p.status,
				exitReason: p.exitReason ?? null,
				tokenName: p.tokenName ?? null,
				tokenSymbol: p.tokenSymbol ?? null,
				imageUri: p.imageUri ?? null,
				syncedAt: new Date()
			})
			.onConflictDoUpdate({
				target: schema.pumpRiderPositions.copycatId,
				set: {
					closedAt: p.closedAt ? new Date(p.closedAt) : null,
					exitSolLamports: p.exitSolLamports ?? null,
					pnlLamports: p.pnlLamports ?? null,
					pnlPct: toDecimalString(p.pnlPct) as never,
					status: p.status,
					exitReason: p.exitReason ?? null,
					syncedAt: new Date()
				}
			});
		upserted++;
	}

	return created({ upserted });
}

export async function GET({ url }) {
	const status = url.searchParams.get('status');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500);
	let q = db.select().from(schema.pumpRiderPositions);
	if (status === 'open') {
		const rows = await q
			.where(eq(schema.pumpRiderPositions.status, 'open'))
			.orderBy(desc(schema.pumpRiderPositions.openedAt))
			.limit(limit);
		return ok({ positions: rows });
	}
	const rows = await q
		.orderBy(desc(schema.pumpRiderPositions.openedAt))
		.limit(limit);
	return ok({ positions: rows });
}
