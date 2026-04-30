import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { decisionCreateSchema } from '$lib/server/validation';
import { desc, eq, and } from 'drizzle-orm';

export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, decisionCreateSchema);

	const decidedAt = body.decidedAt ? new Date(body.decidedAt) : new Date();

	const [row] = await db
		.insert(schema.agentDecisions)
		.values({
			accountId: body.accountId,
			subAgent: body.subAgent,
			skillInvoked: body.skillInvoked ?? null,
			inputs: (body.inputs ?? null) as never,
			output: (body.output ?? null) as never,
			rationale: body.rationale ?? null,
			orderId: body.orderId ?? null,
			positionId: body.positionId ?? null,
			approved: body.approved ?? null,
			rejectReason: body.rejectReason ?? null,
			llmTokensIn: body.llmTokensIn ?? null,
			llmTokensOut: body.llmTokensOut ?? null,
			llmCostUsd: body.llmCostUsd ?? null,
			decidedAt
		})
		.returning();

	return created({ decision: row });
}

export async function GET({ url }) {
	const accountId = url.searchParams.get('accountId');
	const subAgent = url.searchParams.get('subAgent');
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100', 10) || 100, 500);

	const where = [];
	if (accountId) where.push(eq(schema.agentDecisions.accountId, parseInt(accountId, 10)));
	if (subAgent)
		where.push(
			eq(schema.agentDecisions.subAgent, subAgent as typeof schema.agentDecisions.subAgent.enumValues[number])
		);

	const baseQuery = db.select().from(schema.agentDecisions);
	const rows = await (where.length
		? baseQuery.where(and(...where)).orderBy(desc(schema.agentDecisions.decidedAt)).limit(limit)
		: baseQuery.orderBy(desc(schema.agentDecisions.decidedAt)).limit(limit));

	return ok({ decisions: rows });
}
