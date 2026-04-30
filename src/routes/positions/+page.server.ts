import { db, schema } from '$lib/server/db';
import { desc, eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const [open, recentClosed] = await Promise.all([
			db
				.select()
				.from(schema.positions)
				.where(eq(schema.positions.status, 'open'))
				.orderBy(desc(schema.positions.openedAt))
				.limit(100),
			db
				.select()
				.from(schema.positions)
				.where(eq(schema.positions.status, 'closed'))
				.orderBy(desc(schema.positions.closedAt))
				.limit(50)
		]);
		return { open, recentClosed };
	} catch (err) {
		return { open: [], recentClosed: [], dbError: err instanceof Error ? err.message : String(err) };
	}
};
