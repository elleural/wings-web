<script lang="ts">
	import { fmtRelative } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1 class="text-xl font-semibold mb-6">Strategies</h1>

{#if data.dbError}
	<div class="text-sm text-(--color-warn)">DB error: {data.dbError}</div>
{:else}
	<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
		<table class="w-full text-sm">
			<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
				<tr>
					<th class="text-left px-4 py-2 font-medium">strategy / skill</th>
					<th class="text-right px-4 py-2 font-medium">decisions</th>
					<th class="text-right px-4 py-2 font-medium">approved</th>
					<th class="text-right px-4 py-2 font-medium">rejected</th>
					<th class="text-right px-4 py-2 font-medium">approval %</th>
					<th class="text-left px-4 py-2 font-medium">last seen</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-(--color-border)">
				{#each data.stats as s (s.strategy ?? '—')}
					{@const pct = s.total > 0 ? (s.approved / s.total) * 100 : 0}
					<tr class="hover:bg-(--color-bg-elev)/50">
						<td class="px-4 py-2 mono text-xs">{s.strategy ?? '—'}</td>
						<td class="px-4 py-2 mono text-xs num text-right">{s.total}</td>
						<td class="px-4 py-2 mono text-xs num text-right text-(--color-accent)">{s.approved}</td>
						<td class="px-4 py-2 mono text-xs num text-right text-(--color-danger)">{s.rejected}</td>
						<td class="px-4 py-2 mono text-xs num text-right">{pct.toFixed(1)}%</td>
						<td class="px-4 py-2 mono text-xs text-(--color-fg-muted)">{fmtRelative(s.lastSeen)}</td>
					</tr>
				{:else}
					<tr><td class="px-4 py-6 text-(--color-fg-muted)" colspan="6">No strategy decisions yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
