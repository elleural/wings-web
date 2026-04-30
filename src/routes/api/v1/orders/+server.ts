import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { orderCreateSchema } from '$lib/server/validation';
import { desc, eq } from 'drizzle-orm';

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, orderCreateSchema);

	const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

	const [row] = await db
		.insert(schema.orders)
		.values({
			accountId: body.accountId,
			positionId: body.positionId ?? null,
			venue: body.venue,
			marketId: body.marketId,
			marketCategory: body.marketCategory ?? null,
			side: body.side,
			type: body.type,
			size: body.size,
			price: body.price ?? null,
			notionalUsd: body.notionalUsd ?? null,
			status: body.status,
			isMaker: body.isMaker,
			venueOrderId: body.venueOrderId ?? null,
			tickSize: body.tickSize ?? null,
			reason: body.reason ?? null,
			rejectReason: body.rejectReason ?? null,
			params: body.params ?? null,
			expiresAt
		})
		.returning();

	return created({ order: row });
}

export async function GET({ url }) {
	const accountId = url.searchParams.get('accountId');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500);

	const query = db.select().from(schema.orders);
	const rows = await (accountId
		? query.where(eq(schema.orders.accountId, parseInt(accountId, 10))).orderBy(desc(schema.orders.proposedAt)).limit(limit)
		: query.orderBy(desc(schema.orders.proposedAt)).limit(limit));

	return ok({ orders: rows });
}
