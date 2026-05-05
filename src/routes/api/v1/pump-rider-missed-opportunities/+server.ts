/**
 * POST /api/v1/pump-rider-missed-opportunities  — upsert a batch of
 *   classifier-skipped coins that the postmortem labeler later flagged
 *   as winners. Idempotent on (pool).
 * GET  /api/v1/pump-rider-missed-opportunities  — list, sorted by
 *   estimated missed USD descending.
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { pumpRiderMissedBatchSchema } from '$lib/server/validation';
import { desc } from 'drizzle-orm';

function decString(n: number | null | undefined): string | null {
	if (n === null || n === undefined) return null;
	if (!Number.isFinite(n)) return null;
	return n.toString();
}

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, pumpRiderMissedBatchSchema);
	if (body.missed.length === 0) return ok({ upserted: 0 });

	let upserted = 0;
	for (const m of body.missed) {
		await db
			.insert(schema.pumpRiderMissed)
			.values({
				pool: m.pool,
				baseMint: m.baseMint,
				creator: m.creator ?? null,
				detectedAt: new Date(m.detectedAt),
				score: decString(m.score) as never,
				probThreshold: decString(m.probThreshold) as never,
				decision: m.decision ?? null,
				outcome: m.outcome,
				peakPdaLamports: m.peakPdaLamports ?? null,
				phase2DurationSeconds: m.phase2DurationSeconds ?? null,
				issuerProfitLamports: m.issuerProfitLamports ?? null,
				estimatedMissedUsd: decString(m.estimatedMissedUsd) as never,
				tokenName: m.tokenName ?? null,
				tokenSymbol: m.tokenSymbol ?? null,
				imageUri: m.imageUri ?? null,
				syncedAt: new Date()
			})
			.onConflictDoUpdate({
				target: schema.pumpRiderMissed.pool,
				set: {
					outcome: m.outcome,
					peakPdaLamports: m.peakPdaLamports ?? null,
					phase2DurationSeconds: m.phase2DurationSeconds ?? null,
					issuerProfitLamports: m.issuerProfitLamports ?? null,
					estimatedMissedUsd: decString(m.estimatedMissedUsd) as never,
					syncedAt: new Date()
				}
			});
		upserted++;
	}
	return created({ upserted });
}

export async function GET({ url }) {
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500);
	const rows = await db
		.select()
		.from(schema.pumpRiderMissed)
		.orderBy(desc(schema.pumpRiderMissed.detectedAt))
		.limit(limit);
	return ok({ missed: rows });
}
