/**
 * Authentication for write endpoints.
 *
 * The Hermes host writer authenticates with a single shared secret in the
 * `x-api-key` header (or `Authorization: Bearer <key>`). Read endpoints used by
 * the dashboard are open at v0; auth lands on those before Phase 2.
 */
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export function requireWriteAuth(request: Request): void {
	const expected = env.WINGS_WEB_API_KEY;
	if (!expected) {
		// Misconfigured server. Refuse all writes rather than silently allowing them.
		error(500, 'WINGS_WEB_API_KEY not configured on the server.');
	}

	const headerKey = request.headers.get('x-api-key');
	const auth = request.headers.get('authorization');
	const bearer = auth?.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : null;
	const provided = headerKey ?? bearer;

	if (!provided) {
		error(401, 'Missing api key. Set x-api-key header or Authorization: Bearer <key>.');
	}
	if (!constantTimeEqual(provided, expected)) {
		error(401, 'Invalid api key.');
	}
}

/**
 * Constant-time comparison to defeat timing side-channels. Both inputs are
 * strings; we encode and use Uint8Array compare.
 */
function constantTimeEqual(a: string, b: string): boolean {
	const enc = new TextEncoder();
	const bufA = enc.encode(a);
	const bufB = enc.encode(b);
	if (bufA.length !== bufB.length) return false;
	let mismatch = 0;
	for (let i = 0; i < bufA.length; i++) {
		mismatch |= bufA[i] ^ bufB[i];
	}
	return mismatch === 0;
}
