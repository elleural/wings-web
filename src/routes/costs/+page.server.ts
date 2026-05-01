import { db, schema } from '$lib/server/db';
import { desc, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const skillCosts = await db
			.select({
				skill: schema.skillInvocations.skillName,
				invocations: sql<number>`count(*)`,
				avgLatency: sql<number>`avg(coalesce(${schema.skillInvocations.latencyMs}, 0))`,
				totalCost: sql<string>`coalesce(sum(${schema.skillInvocations.llmCostUsd}), 0)`,
				totalComputeSeconds: sql<string>`coalesce(sum(${schema.skillInvocations.llmComputeSeconds}), 0)`,
				successes: sql<number>`count(*) filter (where ${schema.skillInvocations.success} = true)`
			})
			.from(schema.skillInvocations)
			.groupBy(schema.skillInvocations.skillName)
			.orderBy(desc(sql`coalesce(sum(${schema.skillInvocations.llmComputeSeconds}), 0)`));

		const decisionCosts = await db
			.select({
				subAgent: schema.agentDecisions.subAgent,
				count: sql<number>`count(*)`,
				totalCost: sql<string>`coalesce(sum(${schema.agentDecisions.llmCostUsd}), 0)`,
				totalComputeSeconds: sql<string>`coalesce(sum(${schema.agentDecisions.llmComputeSeconds}), 0)`
			})
			.from(schema.agentDecisions)
			.groupBy(schema.agentDecisions.subAgent);

		const modelCosts = await db
			.select({
				model: schema.agentDecisions.llmModel,
				count: sql<number>`count(*)`,
				totalCost: sql<string>`coalesce(sum(${schema.agentDecisions.llmCostUsd}), 0)`,
				totalComputeSeconds: sql<string>`coalesce(sum(${schema.agentDecisions.llmComputeSeconds}), 0)`
			})
			.from(schema.agentDecisions)
			.where(sql`${schema.agentDecisions.llmModel} is not null`)
			.groupBy(schema.agentDecisions.llmModel)
			.orderBy(desc(sql`coalesce(sum(${schema.agentDecisions.llmComputeSeconds}), 0)`));

		return { skillCosts, decisionCosts, modelCosts };
	} catch (err) {
		return {
			skillCosts: [],
			decisionCosts: [],
			modelCosts: [],
			dbError: err instanceof Error ? err.message : String(err)
		};
	}
};
