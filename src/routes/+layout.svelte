<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';

	interface Props {
		children?: import('svelte').Snippet;
	}
	let { children }: Props = $props();

	const links = [
		{ href: '/', label: 'overview' },
		{ href: '/positions', label: 'positions' },
		{ href: '/pump-rider', label: 'pump-rider' },
		{ href: '/a3-dlmm', label: 'a3-dlmm' },
		{ href: '/decisions', label: 'decisions' },
		{ href: '/fills', label: 'fills' },
		{ href: '/strategies', label: 'strategies' },
		{ href: '/performance', label: 'performance' },
		{ href: '/risk', label: 'risk' },
		{ href: '/costs', label: 'costs' },
		{ href: '/messages', label: 'messages' }
	];
</script>

<div class="min-h-screen flex flex-col">
	<header class="border-b border-(--color-border) bg-(--color-bg-elev)">
		<div class="max-w-7xl mx-auto px-6 h-14 flex items-center gap-8">
			<a href="/" class="font-semibold tracking-tight text-(--color-fg) hover:text-(--color-accent)">
				<span class="mono">wings</span><span class="text-(--color-fg-muted)">-web</span>
			</a>
			<nav class="flex items-center gap-5 text-sm">
				{#each links as link (link.href)}
					{@const active =
						link.href === '/'
							? page.url.pathname === '/'
							: page.url.pathname.startsWith(link.href)}
					<a
						href={link.href}
						class={active
							? 'text-(--color-fg) border-b border-(--color-accent) pb-3.5 -mb-px'
							: 'text-(--color-fg-muted) hover:text-(--color-fg)'}
					>
						{link.label}
					</a>
				{/each}
			</nav>
			<div class="flex-1"></div>
			<span class="text-xs mono text-(--color-fg-muted)">hermes orchestrator</span>
		</div>
	</header>

	<main class="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
		{@render children?.()}
	</main>

	<footer class="border-t border-(--color-border) text-xs text-(--color-fg-muted) py-3">
		<div class="max-w-7xl mx-auto px-6 flex items-center justify-between">
			<span class="mono">v0.1.0</span>
			<span>autonomous micro-capital investor</span>
		</div>
	</footer>
</div>
