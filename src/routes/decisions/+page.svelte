<script lang="ts">
	import { fmtRelative, fmtUsd } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1 class="text-xl font-semibold mb-6">Agent decisions</h1>

{#if data.dbError}
	<div class="text-sm text-(--color-warn)">DB error: {data.dbError}</div>
{:else}
	<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
		<table class="w-full text-sm">
			<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
				<tr>
					<th class="text-left px-4 py-2 font-medium">when</th>
					<th class="text-left px-4 py-2 font-medium">sub-agent</th>
					<th class="text-left px-4 py-2 font-medium">skill</th>
					<th class="text-left px-4 py-2 font-medium">approved</th>
					<th class="text-left px-4 py-2 font-medium">cost</th>
					<th class="text-left px-4 py-2 font-medium">rationale</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-(--color-border)">
				{#each data.decisions as d (d.id)}
					<tr class="hover:bg-(--color-bg-elev)/50">
						<td class="px-4 py-2 mono text-xs text-(--color-fg-muted) whitespace-nowrap"
							>{fmtRelative(d.decidedAt)}</td
						>
						<td class="px-4 py-2 mono text-xs">{d.subAgent.replace('_', '-')}</td>
						<td class="px-4 py-2 mono text-xs">{d.skillInvoked ?? '—'}</td>
						<td class="px-4 py-2 text-xs"
							>{#if d.approved === true}<span class="text-(--color-accent)">✓ yes</span
								>{:else if d.approved === false}<span class="text-(--color-danger)">✗ no</span
								>{:else}—{/if}</td
						>
						<td class="px-4 py-2 mono text-xs num">{fmtUsd(d.llmCostUsd, true)}</td>
						<td class="px-4 py-2 text-xs text-(--color-fg-muted) max-w-md truncate"
							>{d.rationale ?? d.rejectReason ?? '—'}</td
						>
					</tr>
				{:else}
					<tr><td class="px-4 py-6 text-(--color-fg-muted)" colspan="6">No decisions yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
