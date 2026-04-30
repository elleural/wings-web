<script lang="ts">
	import { fmtRelative, fmtUsd, pnlClass } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1 class="text-xl font-semibold mb-6">Fills</h1>

{#if data.dbError}
	<div class="text-sm text-(--color-warn)">DB error: {data.dbError}</div>
{:else}
	<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
		<table class="w-full text-sm">
			<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
				<tr>
					<th class="text-left px-4 py-2 font-medium">when</th>
					<th class="text-left px-4 py-2 font-medium">mode</th>
					<th class="text-right px-4 py-2 font-medium">size</th>
					<th class="text-right px-4 py-2 font-medium">price</th>
					<th class="text-right px-4 py-2 font-medium">notional</th>
					<th class="text-right px-4 py-2 font-medium">fee</th>
					<th class="text-right px-4 py-2 font-medium">rebate</th>
					<th class="text-right px-4 py-2 font-medium">net</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-(--color-border)">
				{#each data.fills as f (f.id)}
					{@const net = parseFloat(f.rebateUsd) - parseFloat(f.feeUsd)}
					<tr class="hover:bg-(--color-bg-elev)/50">
						<td class="px-4 py-2 mono text-xs text-(--color-fg-muted) whitespace-nowrap"
							>{fmtRelative(f.filledAt)}</td
						>
						<td class="px-4 py-2 text-xs"
							><span class={f.isPaper ? 'text-(--color-fg-muted)' : 'text-(--color-warn)'}
								>{f.isPaper ? 'paper' : 'live'}</span
							></td
						>
						<td class="px-4 py-2 mono text-xs num text-right">{f.size}</td>
						<td class="px-4 py-2 mono text-xs num text-right">{f.price}</td>
						<td class="px-4 py-2 mono text-xs num text-right">{fmtUsd(f.notionalUsd)}</td>
						<td class="px-4 py-2 mono text-xs num text-right text-(--color-danger)"
							>{fmtUsd(f.feeUsd, true)}</td
						>
						<td class="px-4 py-2 mono text-xs num text-right text-(--color-accent)"
							>{fmtUsd(f.rebateUsd, true)}</td
						>
						<td class="px-4 py-2 mono text-xs num text-right {pnlClass(net)}"
							>{fmtUsd(net, true)}</td
						>
					</tr>
				{:else}
					<tr><td class="px-4 py-6 text-(--color-fg-muted)" colspan="8">No fills yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
