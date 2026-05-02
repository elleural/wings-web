/**
 * POST /api/v1/replay-proofs  — record a replay proof result
 * GET  /api/v1/replay-proofs  — list replay proofs
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { replayProofCreateSchema } from '$lib/server/validation';
import { and, desc, eq } from 'drizzle-orm';

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, replayProofCreateSchema);

	const [row] = await db
		.insert(schema.replayProofs)
		.values({
			minedTradeId: body.minedTradeId,
			slot: body.slot,
			status: body.status,
			balanceDeltaMatch: body.balanceDeltaMatch,
			lamportToleranceUsed: body.lamportToleranceUsed,
			failureHypothesis: body.failureHypothesis ?? null
		})
		.returning();

	return created({ replayProof: row });
}

export async function GET({ url }) {
	const minedTradeId = url.searchParams.get('minedTradeId');
	const status = url.searchParams.get('status');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500);

	const conditions = [];
	if (minedTradeId) conditions.push(eq(schema.replayProofs.minedTradeId, parseInt(minedTradeId, 10)));
	if (status) conditions.push(eq(schema.replayProofs.status, status as never));

	const baseQuery = db.select().from(schema.replayProofs);
	const rows = await (conditions.length
		? baseQuery.where(and(...conditions)).orderBy(desc(schema.replayProofs.ranAt)).limit(limit)
		: baseQuery.orderBy(desc(schema.replayProofs.ranAt)).limit(limit));

	return ok({ replayProofs: rows });
}
