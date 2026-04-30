/**
 * GET /api/v1/state?accountId=N
 * Compact dashboard snapshot used by the overview page.
 */
import { db, schema } from '$lib/server/db';
import { ok } from '$lib/server/json';
import { and, desc, eq } from 'drizzle-orm';

export async function GET({ url }) {
	const accountIdParam = url.searchParams.get('accountId');

	const accounts = await db.select().from(schema.accounts);
	const account = accountIdParam
		? accounts.find((a) => a.id === parseInt(accountIdParam, 10))
		: accounts[0];

	if (!account) {
		return ok({ account: null, openPositions: [], recentDecisions: [], recentFills: [], snapshots: [] });
	}

	const [openPositions, recentDecisions, recentFills, snapshots] = await Promise.all([
		db
			.select()
			.from(schema.positions)
			.where(and(eq(schema.positions.accountId, account.id), eq(schema.positions.status, 'open')))
			.orderBy(desc(schema.positions.openedAt))
			.limit(50),
		db
			.select()
			.from(schema.agentDecisions)
			.where(eq(schema.agentDecisions.accountId, account.id))
			.orderBy(desc(schema.agentDecisions.decidedAt))
			.limit(20),
		db
			.select()
			.from(schema.fills)
			.where(eq(schema.fills.accountId, account.id))
			.orderBy(desc(schema.fills.filledAt))
			.limit(20),
		db
			.select()
			.from(schema.pnlSnapshots)
			.where(eq(schema.pnlSnapshots.accountId, account.id))
			.orderBy(desc(schema.pnlSnapshots.hour))
			.limit(168) // 7 days of hourly
	]);

	return ok({ account, openPositions, recentDecisions, recentFills, snapshots });
}
