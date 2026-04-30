/**
 * Drizzle client over the Neon serverless driver.
 *
 * For SvelteKit serverless functions we use the pooled connection (DATABASE_URL).
 * For migrations and any long-lived connection contexts use DATABASE_URL_UNPOOLED.
 */
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

// Make the Neon driver use fetch under the hood — works in any V8/Edge/Node context.
neonConfig.fetchConnectionCache = true;

const url = env.DATABASE_URL;
if (!url) {
	throw new Error(
		'[wings-web/db] DATABASE_URL is not set. ' +
			'In production this is provided by the Vercel/Neon integration. ' +
			'For local dev, copy .env.example to .env.local and fill in the values.'
	);
}

const sql = neon(url);

export const db = drizzle(sql, { schema, logger: false });
export { schema };
