import { db, schema } from '$lib/server/db';
import { and, desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const accountsList = await db.select().from(schema.accounts);
		const account = accountsList[0] ?? null;

		if (!account) {
			return { account: null, openPositions: [], recentDecisions: [], recentFills: [], snapshots: [] };
		}

		const [openPositions, recentDecisions, recentFills, snapshots] = await Promise.all([
			db
				.select()
				.from(schema.positions)
				.where(and(eq(schema.positions.accountId, account.id), eq(schema.positions.status, 'open')))
				.orderBy(desc(schema.positions.openedAt))
				.limit(20),
			db
				.select()
				.from(schema.agentDecisions)
				.where(eq(schema.agentDecisions.accountId, account.id))
				.orderBy(desc(schema.agentDecisions.decidedAt))
				.limit(15),
			db
				.select()
				.from(schema.fills)
				.where(eq(schema.fills.accountId, account.id))
				.orderBy(desc(schema.fills.filledAt))
				.limit(15),
			db
				.select()
				.from(schema.pnlSnapshots)
				.where(eq(schema.pnlSnapshots.accountId, account.id))
				.orderBy(desc(schema.pnlSnapshots.hour))
				.limit(168)
		]);

		return { account, openPositions, recentDecisions, recentFills, snapshots };
	} catch (err) {
		// DB might not be migrated yet on first deploy. Surface the error so the
		// page can render a "schema not yet initialized" state instead of crashing.
		return {
			account: null,
			openPositions: [],
			recentDecisions: [],
			recentFills: [],
			snapshots: [],
			dbError: err instanceof Error ? err.message : String(err)
		};
	}
};
