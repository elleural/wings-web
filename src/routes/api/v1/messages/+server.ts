/**
 * POST /api/v1/messages   — create a new message (top-level or reply when parentId set)
 * GET  /api/v1/messages   — list messages, optionally filtered
 *
 * Auth: writes require `x-api-key` (Hermes uses WINGS_WEB_API_KEY).
 *       Reads are open in v0 (Auth.js wraps the dashboard before Phase 2).
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { messageCreateSchema } from '$lib/server/validation';
import { and, desc, eq } from 'drizzle-orm';

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, messageCreateSchema);

	const [row] = await db
		.insert(schema.agentMessages)
		.values({
			accountId: body.accountId ?? null,
			kind: body.kind,
			author: body.author,
			parentId: body.parentId ?? null,
			subject: body.subject ?? null,
			body: body.body,
			status: body.status,
			severity: body.severity,
			relatedSkill: body.relatedSkill ?? null,
			relatedRepo: body.relatedRepo ?? null,
			relatedCommitSha: body.relatedCommitSha ?? null,
			tags: body.tags ?? null,
			metadata: (body.metadata ?? null) as never
		})
		.returning();

	return created({ message: row });
}

export async function GET({ url }) {
	const status = url.searchParams.get('status');
	const author = url.searchParams.get('author');
	const kind = url.searchParams.get('kind');
	const parentId = url.searchParams.get('parentId');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500);

	const conditions = [];
	if (status) conditions.push(eq(schema.agentMessages.status, status as never));
	if (author) conditions.push(eq(schema.agentMessages.author, author as never));
	if (kind) conditions.push(eq(schema.agentMessages.kind, kind as never));
	if (parentId === 'null') {
		// Top-level only — no parent.
		// Drizzle: use IS NULL via sql helper.
	} else if (parentId) {
		conditions.push(eq(schema.agentMessages.parentId, parseInt(parentId, 10)));
	}

	const baseQuery = db.select().from(schema.agentMessages);
	const rows = await (conditions.length
		? baseQuery
				.where(and(...conditions))
				.orderBy(desc(schema.agentMessages.createdAt))
				.limit(limit)
		: baseQuery.orderBy(desc(schema.agentMessages.createdAt)).limit(limit));

	return ok({ messages: rows });
}
