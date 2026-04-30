import { db, schema } from '$lib/server/db';
import { desc, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

/**
 * /strategies — per-strategy aggregate of decisions and P&L proxy (sum of
 * fee + slippage + bridge net per strategy_name pulled from the linked order's
 * `reason` field).
 *
 * v0 implementation: SQL aggregation over agent_decisions.skill_invoked.
 * Phase 1 will add a richer per-strategy attribution once orders carry the
 * strategy name on the order.params jsonb.
 */
export const load: PageServerLoad = async () => {
	try {
		const stats = await db
			.select({
				strategy: schema.agentDecisions.skillInvoked,
				total: sql<number>`count(*)`,
				approved: sql<number>`count(*) filter (where ${schema.agentDecisions.approved} = true)`,
				rejected: sql<number>`count(*) filter (where ${schema.agentDecisions.approved} = false)`,
				lastSeen: sql<Date>`max(${schema.agentDecisions.decidedAt})`
			})
			.from(schema.agentDecisions)
			.groupBy(schema.agentDecisions.skillInvoked)
			.orderBy(desc(sql`count(*)`));

		return { stats };
	} catch (err) {
		return { stats: [], dbError: err instanceof Error ? err.message : String(err) };
	}
};
