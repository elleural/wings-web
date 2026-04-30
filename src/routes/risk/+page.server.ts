import { db, schema } from '$lib/server/db';
import { desc, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const accounts = await db.select().from(schema.accounts);
		const account = accounts[0] ?? null;

		const rejections = await db
			.select({
				reason: schema.agentDecisions.rejectReason,
				count: sql<number>`count(*)`
			})
			.from(schema.agentDecisions)
			.where(eq(schema.agentDecisions.approved, false))
			.groupBy(schema.agentDecisions.rejectReason)
			.orderBy(desc(sql`count(*)`));

		const recentSnapshots = account
			? await db
					.select()
					.from(schema.pnlSnapshots)
					.where(eq(schema.pnlSnapshots.accountId, account.id))
					.orderBy(desc(schema.pnlSnapshots.hour))
					.limit(168)
			: [];

		return { account, rejections, recentSnapshots };
	} catch (err) {
		return {
			account: null,
			rejections: [],
			recentSnapshots: [],
			dbError: err instanceof Error ? err.message : String(err)
		};
	}
};
