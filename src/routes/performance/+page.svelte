<script lang="ts">
	import { fmtRelative, fmtUsd, fmtPct, pnlClass } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Reverse to chronological order for sparkline
	const series = $derived([...data.snapshots].reverse());
	const equityValues = $derived(series.map((s) => parseFloat(s.equityUsd)));

	const sparklinePath = $derived.by(() => {
		if (equityValues.length < 2) return '';
		const w = 800;
		const h = 200;
		const min = Math.min(...equityValues);
		const max = Math.max(...equityValues);
		const range = max - min || 1;
		const stepX = w / (equityValues.length - 1);
		return equityValues
			.map((v, i) => {
				const x = i * stepX;
				const y = h - ((v - min) / range) * h;
				return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
			})
			.join(' ');
	});
</script>

<h1 class="text-xl font-semibold mb-6">Performance</h1>

{#if data.dbError}
	<div class="text-sm text-(--color-warn)">DB error: {data.dbError}</div>
{:else}
	<section class="space-y-6">
		{#if equityValues.length >= 2}
			<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
				<div class="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-3">
					Equity curve · last {equityValues.length} hours
				</div>
				<svg viewBox="0 0 800 200" class="w-full h-48" preserveAspectRatio="none">
					<path
						d={sparklinePath}
						fill="none"
						stroke="var(--color-accent)"
						stroke-width="1.5"
						vector-effect="non-scaling-stroke"
					/>
				</svg>
				<div class="flex justify-between text-xs mono num text-(--color-fg-muted) mt-2">
					<span>{fmtUsd(Math.min(...equityValues))}</span>
					<span>{fmtUsd(Math.max(...equityValues))}</span>
				</div>
			</div>
		{:else}
			<p class="text-sm text-(--color-fg-muted)">Need at least 2 hourly snapshots to render a curve.</p>
		{/if}

		<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
			<table class="w-full text-sm">
				<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
					<tr>
						<th class="text-left px-4 py-2 font-medium">hour</th>
						<th class="text-right px-4 py-2 font-medium">equity</th>
						<th class="text-right px-4 py-2 font-medium">realized</th>
						<th class="text-right px-4 py-2 font-medium">unrealized</th>
						<th class="text-right px-4 py-2 font-medium">drawdown</th>
						<th class="text-right px-4 py-2 font-medium">sharpe 30d</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-(--color-border)">
					{#each data.snapshots as s (s.id)}
						<tr class="hover:bg-(--color-bg-elev)/50">
							<td class="px-4 py-2 mono text-xs text-(--color-fg-muted) whitespace-nowrap"
								>{fmtRelative(s.hour)}</td
							>
							<td class="px-4 py-2 mono text-xs num text-right">{fmtUsd(s.equityUsd)}</td>
							<td class="px-4 py-2 mono text-xs num text-right {pnlClass(s.realizedUsd)}"
								>{fmtUsd(s.realizedUsd)}</td
							>
							<td class="px-4 py-2 mono text-xs num text-right {pnlClass(s.unrealizedUsd)}"
								>{fmtUsd(s.unrealizedUsd)}</td
							>
							<td class="px-4 py-2 mono text-xs num text-right">{fmtPct(s.drawdownPct)}</td>
							<td class="px-4 py-2 mono text-xs num text-right">{s.sharpe30d ?? '—'}</td>
						</tr>
					{:else}
						<tr><td class="px-4 py-6 text-(--color-fg-muted)" colspan="6">No snapshots yet.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
{/if}
