/**
 * POST /api/v1/trade-taxonomy  — create / seed a trade type
 * GET  /api/v1/trade-taxonomy  — list all trade types
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { tradeTypeCreateSchema } from '$lib/server/validation';
import { eq } from 'drizzle-orm';

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, tradeTypeCreateSchema);

	const [row] = await db
		.insert(schema.tradeTaxonomy)
		.values({
			name: body.name,
			version: body.version,
			description: body.description ?? null,
			exemplarSignatures: body.exemplarSignatures ?? null
		})
		.onConflictDoUpdate({
			target: [schema.tradeTaxonomy.name, schema.tradeTaxonomy.version],
			set: {
				description: body.description ?? null,
				exemplarSignatures: body.exemplarSignatures ?? null
			}
		})
		.returning();

	return created({ tradeType: row });
}

export async function GET() {
	const rows = await db.select().from(schema.tradeTaxonomy);
	return ok({ tradeTypes: rows });
}
