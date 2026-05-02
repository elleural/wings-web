/**
 * POST /api/v1/program-taxonomy  — upsert a program entry
 * GET  /api/v1/program-taxonomy  — list programs
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { programCreateSchema } from '$lib/server/validation';
import { and, eq } from 'drizzle-orm';

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, programCreateSchema);

	const [row] = await db
		.insert(schema.programTaxonomy)
		.values({
			programId: body.programId,
			name: body.name,
			type: body.type,
			verified: body.verified,
			ottersecRepoUrl: body.ottersecRepoUrl ?? null,
			sourceAuditStatus: body.sourceAuditStatus
		})
		.onConflictDoUpdate({
			target: [schema.programTaxonomy.programId],
			set: {
				name: body.name,
				type: body.type,
				verified: body.verified,
				ottersecRepoUrl: body.ottersecRepoUrl ?? null,
				sourceAuditStatus: body.sourceAuditStatus
			}
		})
		.returning();

	return created({ program: row });
}

export async function GET({ url }) {
	const type = url.searchParams.get('type');
	const blocked = url.searchParams.get('blocked');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '200', 10) || 200, 1000);

	const conditions = [];
	if (type) conditions.push(eq(schema.programTaxonomy.type, type));
	if (blocked === 'true') conditions.push(eq(schema.programTaxonomy.blocked, true));
	if (blocked === 'false') conditions.push(eq(schema.programTaxonomy.blocked, false));

	const baseQuery = db.select().from(schema.programTaxonomy);
	const rows = await (conditions.length
		? baseQuery.where(and(...conditions)).limit(limit)
		: baseQuery.limit(limit));

	return ok({ programs: rows });
}
