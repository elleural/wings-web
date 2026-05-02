/**
 * POST /api/v1/mined-trades  — store a mined profitable trade
 * GET  /api/v1/mined-trades  — list mined trades
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { minedTradeCreateSchema } from '$lib/server/validation';
import { desc, eq, isNull, isNotNull } from 'drizzle-orm';

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, minedTradeCreateSchema);

	const [row] = await db
		.insert(schema.minedTrades)
		.values({
			signature: body.signature,
			slot: body.slot,
			sender: body.sender,
			profitUsd: body.profitUsd,
			holdSeconds: body.holdSeconds,
			capitalInUsd: body.capitalInUsd,
			programs: body.programs,
			tradeTypeId: body.tradeTypeId ?? null,
			rawData: (body.rawData ?? null) as never
		})
		.onConflictDoNothing()
		.returning();

	if (!row) {
		// Duplicate signature — return existing
		const existing = await db
			.select()
			.from(schema.minedTrades)
			.where(eq(schema.minedTrades.signature, body.signature))
			.limit(1);
		return ok({ minedTrade: existing[0] });
	}

	return created({ minedTrade: row });
}

export async function GET({ url }) {
	const tradeTypeId = url.searchParams.get('tradeTypeId');
	const classified = url.searchParams.get('classified');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500);

	let baseQuery = db.select().from(schema.minedTrades);

	if (tradeTypeId) {
		const rows = await baseQuery
			.where(eq(schema.minedTrades.tradeTypeId, parseInt(tradeTypeId, 10)))
			.orderBy(desc(schema.minedTrades.minedAt))
			.limit(limit);
		return ok({ minedTrades: rows });
	}
	if (classified === 'true') {
		const rows = await baseQuery
			.where(isNotNull(schema.minedTrades.classifiedAt))
			.orderBy(desc(schema.minedTrades.minedAt))
			.limit(limit);
		return ok({ minedTrades: rows });
	}
	if (classified === 'false') {
		const rows = await baseQuery
			.where(isNull(schema.minedTrades.classifiedAt))
			.orderBy(desc(schema.minedTrades.minedAt))
			.limit(limit);
		return ok({ minedTrades: rows });
	}

	const rows = await baseQuery.orderBy(desc(schema.minedTrades.minedAt)).limit(limit);
	return ok({ minedTrades: rows });
}
