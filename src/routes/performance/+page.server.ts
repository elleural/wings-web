import { db, schema } from '$lib/server/db';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const snapshots = await db
			.select()
			.from(schema.pnlSnapshots)
			.orderBy(desc(schema.pnlSnapshots.hour))
			.limit(720);
		return { snapshots };
	} catch (err) {
		return { snapshots: [], dbError: err instanceof Error ? err.message : String(err) };
	}
};
