<script lang="ts">
	import { fmtUsd } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<h1 class="text-xl font-semibold mb-6">Costs</h1>

{#if data.dbError}
	<div class="text-sm text-(--color-warn)">DB error: {data.dbError}</div>
{:else}
	<section class="space-y-8">
		<div>
			<h2 class="text-sm uppercase tracking-wider text-(--color-fg-muted) mb-2">By sub-agent</h2>
			<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
				<table class="w-full text-sm">
					<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
						<tr>
							<th class="text-left px-4 py-2 font-medium">sub-agent</th>
							<th class="text-right px-4 py-2 font-medium">decisions</th>
							<th class="text-right px-4 py-2 font-medium">total LLM cost</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-(--color-border)">
						{#each data.decisionCosts as d (d.subAgent)}
							<tr class="hover:bg-(--color-bg-elev)/50">
								<td class="px-4 py-2 mono text-xs">{d.subAgent.replace('_', '-')}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{d.count}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{fmtUsd(d.totalCost, true)}</td>
							</tr>
						{:else}
							<tr><td class="px-4 py-6 text-(--color-fg-muted)" colspan="3">No decisions yet.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div>
			<h2 class="text-sm uppercase tracking-wider text-(--color-fg-muted) mb-2">By skill</h2>
			<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
				<table class="w-full text-sm">
					<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
						<tr>
							<th class="text-left px-4 py-2 font-medium">skill</th>
							<th class="text-right px-4 py-2 font-medium">invocations</th>
							<th class="text-right px-4 py-2 font-medium">avg latency (ms)</th>
							<th class="text-right px-4 py-2 font-medium">success</th>
							<th class="text-right px-4 py-2 font-medium">total LLM cost</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-(--color-border)">
						{#each data.skillCosts as s (s.skill)}
							{@const successPct = s.invocations > 0 ? (s.successes / s.invocations) * 100 : 0}
							<tr class="hover:bg-(--color-bg-elev)/50">
								<td class="px-4 py-2 mono text-xs">{s.skill}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{s.invocations}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{Math.round(s.avgLatency)}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{successPct.toFixed(1)}%</td>
								<td class="px-4 py-2 mono text-xs num text-right">{fmtUsd(s.totalCost, true)}</td>
							</tr>
						{:else}
							<tr><td class="px-4 py-6 text-(--color-fg-muted)" colspan="5">No skill invocations yet.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</section>
{/if}
