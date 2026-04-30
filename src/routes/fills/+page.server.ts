import { db, schema } from '$lib/server/db';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const fills = await db
			.select()
			.from(schema.fills)
			.orderBy(desc(schema.fills.filledAt))
			.limit(200);
		return { fills };
	} catch (err) {
		return { fills: [], dbError: err instanceof Error ? err.message : String(err) };
	}
};
