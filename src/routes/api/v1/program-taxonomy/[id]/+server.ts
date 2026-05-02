/**
 * GET   /api/v1/program-taxonomy/:id  — get a program by program_id
 * PATCH /api/v1/program-taxonomy/:id  — update audit status / blocked / verified
 */
import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok } from '$lib/server/json';
import { programUpdateSchema } from '$lib/server/validation';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export async function GET({ params }) {
	const rows = await db
		.select()
		.from(schema.programTaxonomy)
		.where(eq(schema.programTaxonomy.programId, params.id))
		.limit(1);

	if (!rows.length) throw error(404, 'Program not found');
	return ok({ program: rows[0] });
}

export async function PATCH({ request, params }) {
	requireWriteAuth(request);
	const body = await parseBody(request, programUpdateSchema);

	const updateValues: Record<string, unknown> = {};
	if (body.sourceAuditStatus !== undefined) updateValues.sourceAuditStatus = body.sourceAuditStatus;
	if (body.blocked !== undefined) updateValues.blocked = body.blocked;
	if (body.verified !== undefined) updateValues.verified = body.verified;
	if (body.ottersecRepoUrl !== undefined) updateValues.ottersecRepoUrl = body.ottersecRepoUrl;

	const [row] = await db
		.update(schema.programTaxonomy)
		.set(updateValues)
		.where(eq(schema.programTaxonomy.programId, params.id))
		.returning();

	if (!row) throw error(404, 'Program not found');
	return ok({ program: row });
}
