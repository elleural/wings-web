/**
 * GET   /api/v1/messages/:id  — single message + thread
 * PATCH /api/v1/messages/:id  — status / severity / tags update
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok } from '$lib/server/json';
import { messageUpdateSchema } from '$lib/server/validation';
import { error } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';

export async function GET({ params }) {
	const id = parseInt(params.id, 10);
	if (!Number.isFinite(id)) error(400, 'invalid id');

	const [root] = await db
		.select()
		.from(schema.agentMessages)
		.where(eq(schema.agentMessages.id, id))
		.limit(1);

	if (!root) error(404, 'message not found');

	const replies = await db
		.select()
		.from(schema.agentMessages)
		.where(eq(schema.agentMessages.parentId, id))
		.orderBy(asc(schema.agentMessages.createdAt));

	return ok({ message: root, replies });
}

export async function PATCH({ params, request }) {
	requireWriteAuth(request);
	const id = parseInt(params.id, 10);
	if (!Number.isFinite(id)) error(400, 'invalid id');

	const body = await parseBody(request, messageUpdateSchema);

	// If transitioning to resolved/wont_fix, stamp resolvedAt automatically.
	const wantsResolution = body.status === 'resolved' || body.status === 'wont_fix';

	const update: Partial<typeof schema.agentMessages.$inferInsert> = {
		updatedAt: new Date()
	};
	if (body.status !== undefined) update.status = body.status;
	if (body.severity !== undefined) update.severity = body.severity;
	if (body.relatedCommitSha !== undefined) update.relatedCommitSha = body.relatedCommitSha ?? null;
	if (body.relatedSkill !== undefined) update.relatedSkill = body.relatedSkill ?? null;
	if (body.tags !== undefined) update.tags = body.tags ?? null;
	if (wantsResolution) update.resolvedAt = new Date();

	const [row] = await db
		.update(schema.agentMessages)
		.set(update)
		.where(eq(schema.agentMessages.id, id))
		.returning();

	return ok({ message: row });
}
