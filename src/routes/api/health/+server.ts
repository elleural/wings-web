/**
 * GET /api/health
 *
 * Round-trips the database with a trivial query.
 * 200 -> functions and DB are reachable.
 */
import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

export async function GET() {
	const started = Date.now();
	try {
		const result = await db.execute(sql`SELECT version() AS version, now() AS now`);
		const row = (result as unknown as { rows?: Array<{ version: string; now: string }> }).rows?.[0];
		return json({
			ok: true,
			latencyMs: Date.now() - started,
			db: {
				version: row?.version ?? null,
				now: row?.now ?? null
			}
		});
	} catch (err) {
		return json(
			{
				ok: false,
				latencyMs: Date.now() - started,
				error: err instanceof Error ? err.message : String(err)
			},
			{ status: 503 }
		);
	}
}
