import { db, schema } from '$lib/server/db';
import { asc, desc, eq, isNull } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

/**
 * The /messages page lists top-level threads. Selecting one (?id=N) loads its
 * replies. The reply form posts back here as a SvelteKit action; the action
 * authenticates against WINGS_WEB_API_KEY (same secret Hermes uses) so the
 * dashboard can do double-duty as the user's reply UI without us spinning up
 * a real auth provider tonight.
 */
export const load: PageServerLoad = async ({ url }) => {
	try {
		const filter = url.searchParams.get('filter') ?? 'open';
		const selectedIdRaw = url.searchParams.get('id');
		const selectedId = selectedIdRaw ? parseInt(selectedIdRaw, 10) : null;

		// Top-level threads only (parentId IS NULL).
		const baseQuery = db.select().from(schema.agentMessages);

		const threads = await (filter === 'all'
			? baseQuery
					.where(isNull(schema.agentMessages.parentId))
					.orderBy(desc(schema.agentMessages.updatedAt))
					.limit(100)
			: baseQuery
					.where(
						eq(schema.agentMessages.status, filter as 'open' | 'acked' | 'in_progress' | 'resolved' | 'wont_fix')
					)
					.orderBy(desc(schema.agentMessages.updatedAt))
					.limit(100));

		const topLevel = threads.filter((t) => t.parentId == null);

		let selected = null;
		let replies: typeof threads = [];
		if (selectedId) {
			const found = topLevel.find((t) => t.id === selectedId) ?? null;
			if (found) {
				selected = found;
				replies = await db
					.select()
					.from(schema.agentMessages)
					.where(eq(schema.agentMessages.parentId, selectedId))
					.orderBy(asc(schema.agentMessages.createdAt));
			}
		}

		return { threads: topLevel, selected, replies, filter };
	} catch (err) {
		return {
			threads: [],
			selected: null,
			replies: [],
			filter: 'open',
			dbError: err instanceof Error ? err.message : String(err)
		};
	}
};

export const actions: Actions = {
	reply: async ({ request, url }) => {
		const data = await request.formData();
		const body = String(data.get('body') ?? '').trim();
		const apiKey = String(data.get('apiKey') ?? '');
		const parentId = parseInt(String(data.get('parentId') ?? ''), 10);
		const status = String(data.get('status') ?? '');
		const author = (String(data.get('author') ?? 'user') as 'user' | 'claude');

		if (!body) return fail(400, { ok: false, error: 'reply body required' });
		if (!Number.isFinite(parentId)) return fail(400, { ok: false, error: 'invalid parentId' });

		const expected = env.WINGS_WEB_API_KEY;
		if (!expected) return fail(500, { ok: false, error: 'server missing WINGS_WEB_API_KEY' });
		if (apiKey !== expected)
			return fail(401, { ok: false, error: 'invalid api key' });

		// Insert reply.
		await db.insert(schema.agentMessages).values({
			kind: 'reply',
			author,
			parentId,
			body,
			status: 'open',
			severity: 'normal'
		});

		// If status update requested, apply to the parent.
		if (
			status === 'open' ||
			status === 'acked' ||
			status === 'in_progress' ||
			status === 'resolved' ||
			status === 'wont_fix'
		) {
			const update: Partial<typeof schema.agentMessages.$inferInsert> = {
				status,
				updatedAt: new Date()
			};
			if (status === 'resolved' || status === 'wont_fix') update.resolvedAt = new Date();
			await db
				.update(schema.agentMessages)
				.set(update)
				.where(eq(schema.agentMessages.id, parentId));
		}

		return { ok: true };
	}
};
