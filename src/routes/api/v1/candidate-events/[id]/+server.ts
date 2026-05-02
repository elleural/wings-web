/**
 * PATCH /api/v1/candidate-events/:id  — update status / decision_id
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok } from '$lib/server/json';
import { candidateEventUpdateSchema } from '$lib/server/validation';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export async function PATCH({ request, params }) {
	requireWriteAuth(request);
	const id = parseInt(params.id, 10);
	const body = await parseBody(request, candidateEventUpdateSchema);

	const updateValues: Record<string, unknown> = { status: body.status };
	if (body.decisionId !== undefined) updateValues.decisionId = body.decisionId;

	const [row] = await db
		.update(schema.candidateEvents)
		.set(updateValues)
		.where(eq(schema.candidateEvents.id, id))
		.returning();

	if (!row) throw error(404, 'Candidate event not found');
	return ok({ candidateEvent: row });
}
