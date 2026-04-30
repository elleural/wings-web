import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { fillCreateSchema } from '$lib/server/validation';
import { desc, eq } from 'drizzle-orm';

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, fillCreateSchema);

	const filledAt = body.filledAt ? new Date(body.filledAt) : new Date();

	const [row] = await db
		.insert(schema.fills)
		.values({
			accountId: body.accountId,
			orderId: body.orderId,
			isPaper: body.isPaper,
			size: body.size,
			price: body.price,
			notionalUsd: body.notionalUsd,
			feeUsd: body.feeUsd,
			rebateUsd: body.rebateUsd,
			slippageUsd: body.slippageUsd,
			gasUsd: body.gasUsd,
			bridgeFeeUsd: body.bridgeFeeUsd,
			lvrModeledUsd: body.lvrModeledUsd ?? null,
			txSig: body.txSig ?? null,
			filledAt
		})
		.returning();

	return created({ fill: row });
}

export async function GET({ url }) {
	const accountId = url.searchParams.get('accountId');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500);

	const query = db.select().from(schema.fills);
	const rows = await (accountId
		? query.where(eq(schema.fills.accountId, parseInt(accountId, 10))).orderBy(desc(schema.fills.filledAt)).limit(limit)
		: query.orderBy(desc(schema.fills.filledAt)).limit(limit));

	return ok({ fills: rows });
}
