import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter({
			runtime: 'nodejs22.x',
			// Pin all serverless functions to sfo1 to match the Neon Postgres region (Portland, us-west-2).
			// Browser (Cupertino) -> Edge (~5ms) -> Function (sfo1, ~10ms) -> Neon (us-west, ~5ms) ≈ 30ms RT.
			regions: ['sfo1']
		})
	}
};

export default config;
