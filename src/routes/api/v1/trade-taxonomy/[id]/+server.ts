/**
 * PATCH /api/v1/trade-taxonomy/:id  — update replay stats
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok } from '$lib/server/json';
import { tradeTypeUpdateSchema } from '$lib/server/validation';
import { eq } from 'drizzle-orm';

export async function PATCH({ request, params }) {
	requireWriteAuth(request);
	const id = parseInt(params.id, 10);
	const body = await parseBody(request, tradeTypeUpdateSchema);

	const updateValues: Record<string, unknown> = {};
	if (body.replayPassRate !== undefined) updateValues.replayPassRate = body.replayPassRate;
	if (body.replayGated !== undefined) updateValues.replayGated = body.replayGated;

	const [row] = await db
		.update(schema.tradeTaxonomy)
		.set(updateValues)
		.where(eq(schema.tradeTaxonomy.id, id))
		.returning();

	return ok({ tradeType: row });
}
