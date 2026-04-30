import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { snapshotCreateSchema } from '$lib/server/validation';
import { desc, eq } from 'drizzle-orm';

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, snapshotCreateSchema);

	const [row] = await db
		.insert(schema.pnlSnapshots)
		.values({
			accountId: body.accountId,
			hour: new Date(body.hour),
			equityUsd: body.equityUsd,
			realizedUsd: body.realizedUsd,
			unrealizedUsd: body.unrealizedUsd,
			highWaterMarkUsd: body.highWaterMarkUsd,
			drawdownPct: body.drawdownPct,
			sharpe30d: body.sharpe30d ?? null,
			mdd30dPct: body.mdd30dPct ?? null,
			var95Usd: body.var95Usd ?? null,
			openPositionsCount: body.openPositionsCount,
			reserveUsd: body.reserveUsd
		})
		.onConflictDoUpdate({
			target: [schema.pnlSnapshots.accountId, schema.pnlSnapshots.hour],
			set: {
				equityUsd: body.equityUsd,
				realizedUsd: body.realizedUsd,
				unrealizedUsd: body.unrealizedUsd,
				highWaterMarkUsd: body.highWaterMarkUsd,
				drawdownPct: body.drawdownPct,
				sharpe30d: body.sharpe30d ?? null,
				mdd30dPct: body.mdd30dPct ?? null,
				var95Usd: body.var95Usd ?? null,
				openPositionsCount: body.openPositionsCount,
				reserveUsd: body.reserveUsd
			}
		})
		.returning();

	return created({ snapshot: row });
}

export async function GET({ url }) {
	const accountId = url.searchParams.get('accountId');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '720', 10) || 720, 8760);

	const baseQuery = db.select().from(schema.pnlSnapshots);
	const rows = await (accountId
		? baseQuery.where(eq(schema.pnlSnapshots.accountId, parseInt(accountId, 10))).orderBy(desc(schema.pnlSnapshots.hour)).limit(limit)
		: baseQuery.orderBy(desc(schema.pnlSnapshots.hour)).limit(limit));

	return ok({ snapshots: rows });
}
