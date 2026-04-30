<script lang="ts">
	import { fmtPct, fmtUsd } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const account = $derived(data.account);
	const reservePct = $derived(
		account && parseFloat(account.equityUsd) > 0
			? parseFloat(account.reserveUsd) / parseFloat(account.equityUsd)
			: 0
	);
	const maxDdPct = $derived(
		data.recentSnapshots.length > 0
			? Math.max(...data.recentSnapshots.map((s) => parseFloat(s.drawdownPct)))
			: 0
	);
</script>

<h1 class="text-xl font-semibold mb-6">Risk</h1>

{#if data.dbError}
	<div class="text-sm text-(--color-warn)">DB error: {data.dbError}</div>
{:else if !data.account}
	<p class="text-sm text-(--color-fg-muted)">No account yet.</p>
{:else}
	<section class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
		<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
			<div class="text-xs uppercase tracking-wider text-(--color-fg-muted)">Equity</div>
			<div class="mt-1 text-xl font-semibold mono num">{fmtUsd(account.equityUsd)}</div>
		</div>
		<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
			<div class="text-xs uppercase tracking-wider text-(--color-fg-muted)">Reserve</div>
			<div class="mt-1 text-xl font-semibold mono num">{fmtUsd(account.reserveUsd)}</div>
			<div class="mt-1 text-xs text-(--color-fg-muted)">{(reservePct * 100).toFixed(1)}% of equity</div>
		</div>
		<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
			<div class="text-xs uppercase tracking-wider text-(--color-fg-muted)">High water mark</div>
			<div class="mt-1 text-xl font-semibold mono num">{fmtUsd(account.highWaterMarkUsd)}</div>
		</div>
		<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
			<div class="text-xs uppercase tracking-wider text-(--color-fg-muted)">Max drawdown 7d</div>
			<div class="mt-1 text-xl font-semibold mono num">{fmtPct(maxDdPct)}</div>
			<div class="mt-1 text-xs text-(--color-fg-muted)">cap = 15%</div>
		</div>
	</section>

	<section class="rounded-md border border-(--color-border) bg-(--color-bg-card)">
		<div
			class="px-4 py-3 border-b border-(--color-border) text-sm font-semibold flex items-center justify-between"
		>
			<span>Gate rejections (deny-by-default rails)</span>
			<span class="text-xs text-(--color-fg-muted)">10 risk rails per PLAN.md</span>
		</div>
		<table class="w-full text-sm">
			<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
				<tr>
					<th class="text-left px-4 py-2 font-medium">reason</th>
					<th class="text-right px-4 py-2 font-medium">count</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-(--color-border)">
				{#each data.rejections as r (r.reason ?? 'unknown')}
					<tr class="hover:bg-(--color-bg-elev)/50">
						<td class="px-4 py-2 mono text-xs">{r.reason ?? 'unknown'}</td>
						<td class="px-4 py-2 mono text-xs num text-right">{r.count}</td>
					</tr>
				{:else}
					<tr><td class="px-4 py-6 text-(--color-fg-muted)" colspan="2">No rejections recorded.</td></tr>
				{/each}
			</tbody>
		</table>
	</section>
{/if}
