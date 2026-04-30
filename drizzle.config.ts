import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
	console.warn(
		'[drizzle.config] DATABASE_URL_UNPOOLED / DATABASE_URL not set. ' +
			'Migrations cannot be run, but `drizzle-kit generate` (which only reads the schema) will still work.'
	);
}

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle',
	dialect: 'postgresql',
	dbCredentials: {
		url: url ?? 'postgres://placeholder'
	},
	strict: true,
	verbose: true
});
