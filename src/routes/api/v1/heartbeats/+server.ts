/**
 * POST /api/v1/heartbeats  — record a supervisor heartbeat
 * GET  /api/v1/heartbeats  — get recent heartbeats
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { heartbeatCreateSchema } from '$lib/server/validation';
import { desc, eq } from 'drizzle-orm';

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, heartbeatCreateSchema);

	const [row] = await db
		.insert(schema.heartbeats)
		.values({
			source: body.source,
			host: body.host,
			mode: body.mode,
			memUsedMb: body.memUsedMb ?? null,
			ollamaModelResident: body.ollamaModelResident ?? null,
			watcherLagMs: body.watcherLagMs ?? null,
			metadata: (body.metadata ?? null) as never
		})
		.returning();

	return created({ heartbeat: row });
}

export async function GET({ url }) {
	const source = url.searchParams.get('source');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '10', 10) || 10, 100);

	let query = db.select().from(schema.heartbeats);
	if (source) {
		const rows = await query
			.where(eq(schema.heartbeats.source, source as never))
			.orderBy(desc(schema.heartbeats.ts))
			.limit(limit);
		return ok({ heartbeats: rows });
	}
	const rows = await query.orderBy(desc(schema.heartbeats.ts)).limit(limit);
	return ok({ heartbeats: rows });
}
