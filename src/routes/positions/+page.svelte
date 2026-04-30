<script lang="ts">
	import { fmtRelative, fmtUsd, pnlClass } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1 class="text-xl font-semibold mb-6">Positions</h1>

{#if data.dbError}
	<div class="text-sm text-(--color-warn)">DB error: {data.dbError}</div>
{:else}
	<section class="space-y-8">
		<div>
			<h2 class="text-sm uppercase tracking-wider text-(--color-fg-muted) mb-2">Open</h2>
			<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
				<table class="w-full text-sm">
					<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
						<tr>
							<th class="text-left px-4 py-2 font-medium">opened</th>
							<th class="text-left px-4 py-2 font-medium">venue</th>
							<th class="text-left px-4 py-2 font-medium">market</th>
							<th class="text-left px-4 py-2 font-medium">side</th>
							<th class="text-right px-4 py-2 font-medium">size</th>
							<th class="text-right px-4 py-2 font-medium">entry</th>
							<th class="text-right px-4 py-2 font-medium">notional</th>
							<th class="text-right px-4 py-2 font-medium">unrealized</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-(--color-border)">
						{#each data.open as p (p.id)}
							<tr class="hover:bg-(--color-bg-elev)/50">
								<td class="px-4 py-2 mono text-xs text-(--color-fg-muted) whitespace-nowrap"
									>{fmtRelative(p.openedAt)}</td
								>
								<td class="px-4 py-2 mono text-xs">{p.venue.replace(/_/g, '-')}</td>
								<td class="px-4 py-2 text-xs max-w-xs truncate" title={p.marketId}>{p.marketId}</td>
								<td class="px-4 py-2 text-xs">{p.side ?? '—'}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{p.size}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{p.entryPrice}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{fmtUsd(p.entryNotionalUsd)}</td>
								<td class="px-4 py-2 mono text-xs num text-right {pnlClass(p.unrealizedPnlUsd)}"
									>{fmtUsd(p.unrealizedPnlUsd)}</td
								>
							</tr>
						{:else}
							<tr><td class="px-4 py-6 text-(--color-fg-muted)" colspan="8">No open positions.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div>
			<h2 class="text-sm uppercase tracking-wider text-(--color-fg-muted) mb-2">Recently closed</h2>
			<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
				<table class="w-full text-sm">
					<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
						<tr>
							<th class="text-left px-4 py-2 font-medium">closed</th>
							<th class="text-left px-4 py-2 font-medium">venue</th>
							<th class="text-left px-4 py-2 font-medium">market</th>
							<th class="text-right px-4 py-2 font-medium">realized</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-(--color-border)">
						{#each data.recentClosed as p (p.id)}
							<tr class="hover:bg-(--color-bg-elev)/50">
								<td class="px-4 py-2 mono text-xs text-(--color-fg-muted) whitespace-nowrap"
									>{fmtRelative(p.closedAt)}</td
								>
								<td class="px-4 py-2 mono text-xs">{p.venue.replace(/_/g, '-')}</td>
								<td class="px-4 py-2 text-xs max-w-xs truncate">{p.marketId}</td>
								<td class="px-4 py-2 mono text-xs num text-right {pnlClass(p.realizedPnlUsd)}"
									>{fmtUsd(p.realizedPnlUsd)}</td
								>
							</tr>
						{:else}
							<tr><td class="px-4 py-6 text-(--color-fg-muted)" colspan="4">No closed positions yet.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</section>
{/if}
