import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { skillInvocationCreateSchema } from '$lib/server/validation';
import { desc, eq } from 'drizzle-orm';

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, skillInvocationCreateSchema);

	const invokedAt = body.invokedAt ? new Date(body.invokedAt) : new Date();

	const [row] = await db
		.insert(schema.skillInvocations)
		.values({
			accountId: body.accountId ?? null,
			skillName: body.skillName,
			skillVersion: body.skillVersion ?? null,
			skillCategory: body.skillCategory ?? null,
			latencyMs: body.latencyMs ?? null,
			success: body.success,
			errorMessage: body.errorMessage ?? null,
			llmCostUsd: body.llmCostUsd ?? null,
			shadow: body.shadow,
			invokedAt
		})
		.returning();

	return created({ invocation: row });
}

export async function GET({ url }) {
	const skillName = url.searchParams.get('skillName');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500);

	const baseQuery = db.select().from(schema.skillInvocations);
	const rows = await (skillName
		? baseQuery.where(eq(schema.skillInvocations.skillName, skillName)).orderBy(desc(schema.skillInvocations.invokedAt)).limit(limit)
		: baseQuery.orderBy(desc(schema.skillInvocations.invokedAt)).limit(limit));

	return ok({ invocations: rows });
}
