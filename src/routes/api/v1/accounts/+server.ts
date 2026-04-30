import { db, schema } from '$lib/server/db';
import { requireWriteAuth } from '$lib/server/auth';
import { parseBody, ok, created } from '$lib/server/json';
import { accountUpsertSchema } from '$lib/server/validation';

/**
 * Upsert an account by name.
 * Used by the host on first boot to register `default` (and a `live` row when
 * we promote out of paper).
 */
export async function POST({ request }) {
	requireWriteAuth(request);
	const body = await parseBody(request, accountUpsertSchema);

	const [row] = await db
		.insert(schema.accounts)
		.values({
			name: body.name,
			mode: body.mode,
			equityUsd: body.equityUsd,
			startingEquityUsd: body.startingEquityUsd,
			highWaterMarkUsd: body.highWaterMarkUsd,
			reserveUsd: body.reserveUsd
		})
		.onConflictDoUpdate({
			target: schema.accounts.name,
			set: {
				mode: body.mode,
				equityUsd: body.equityUsd,
				highWaterMarkUsd: body.highWaterMarkUsd,
				reserveUsd: body.reserveUsd,
				updatedAt: new Date()
			}
		})
		.returning();

	return created({ account: row });
}

export async function GET() {
	const rows = await db.select().from(schema.accounts);
	return ok({ accounts: rows });
}
