import { db, schema } from '$lib/server/db';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const decisions = await db
			.select()
			.from(schema.agentDecisions)
			.orderBy(desc(schema.agentDecisions.decidedAt))
			.limit(200);
		return { decisions };
	} catch (err) {
		return { decisions: [], dbError: err instanceof Error ? err.message : String(err) };
	}
};
