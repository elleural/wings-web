/**
 * POST /api/v1/candidate-events  — log a watcher-detected candidate
 * GET  /api/v1/candidate-events  — list candidate events
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { candidateEventCreateSchema } from '$lib/server/validation';
import { and, desc, eq } from 'drizzle-orm';

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, candidateEventCreateSchema);

	const [row] = await db
		.insert(schema.candidateEvents)
		.values({
			tradeTypeId: body.tradeTypeId,
			programId: body.programId,
			assetMint: body.assetMint ?? null,
			idempotencyKey: body.idempotencyKey,
			ttlMs: body.ttlMs,
			rawEvent: (body.rawEvent ?? null) as never
		})
		.onConflictDoNothing()
		.returning();

	if (!row) {
		const existing = await db
			.select()
			.from(schema.candidateEvents)
			.where(eq(schema.candidateEvents.idempotencyKey, body.idempotencyKey))
			.limit(1);
		return ok({ candidateEvent: existing[0] });
	}

	return created({ candidateEvent: row });
}

export async function GET({ url }) {
	const status = url.searchParams.get('status');
	const tradeTypeId = url.searchParams.get('tradeTypeId');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500);

	const conditions = [];
	if (status) conditions.push(eq(schema.candidateEvents.status, status as never));
	if (tradeTypeId) conditions.push(eq(schema.candidateEvents.tradeTypeId, parseInt(tradeTypeId, 10)));

	const baseQuery = db.select().from(schema.candidateEvents);
	const rows = await (conditions.length
		? baseQuery.where(and(...conditions)).orderBy(desc(schema.candidateEvents.firedAt)).limit(limit)
		: baseQuery.orderBy(desc(schema.candidateEvents.firedAt)).limit(limit));

	return ok({ candidateEvents: rows });
}
