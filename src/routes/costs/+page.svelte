<script lang="ts">
	import { fmtUsd } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const fmtSec = (v: string | number | null | undefined) => {
		const n = typeof v === 'string' ? Number(v) : (v ?? 0);
		if (!Number.isFinite(n) || n === 0) return '0';
		if (n < 1) return n.toFixed(2);
		if (n < 60) return n.toFixed(1);
		const m = Math.floor(n / 60);
		const s = Math.round(n % 60);
		return `${m}m ${s}s`;
	};
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
							<th class="text-right px-4 py-2 font-medium">compute</th>
							<th class="text-right px-4 py-2 font-medium">total LLM cost</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-(--color-border)">
						{#each data.decisionCosts as d (d.subAgent)}
							<tr class="hover:bg-(--color-bg-elev)/50">
								<td class="px-4 py-2 mono text-xs">{d.subAgent.replace('_', '-')}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{d.count}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{fmtSec(d.totalComputeSeconds)}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{fmtUsd(d.totalCost, true)}</td>
							</tr>
						{:else}
							<tr><td class="px-4 py-6 text-(--color-fg-muted)" colspan="4">No decisions yet.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<div>
			<h2 class="text-sm uppercase tracking-wider text-(--color-fg-muted) mb-2">By model</h2>
			<p class="text-xs text-(--color-fg-muted) mb-2">
				Local LLMs (Ollama) charge wall-clock seconds, not USD. Hourly cap = 2400 s.
			</p>
			<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
				<table class="w-full text-sm">
					<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
						<tr>
							<th class="text-left px-4 py-2 font-medium">model</th>
							<th class="text-right px-4 py-2 font-medium">calls</th>
							<th class="text-right px-4 py-2 font-medium">compute</th>
							<th class="text-right px-4 py-2 font-medium">USD (if remote)</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-(--color-border)">
						{#each data.modelCosts as m (m.model)}
							<tr class="hover:bg-(--color-bg-elev)/50">
								<td class="px-4 py-2 mono text-xs">{m.model}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{m.count}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{fmtSec(m.totalComputeSeconds)}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{fmtUsd(m.totalCost, true)}</td>
							</tr>
						{:else}
							<tr><td class="px-4 py-6 text-(--color-fg-muted)" colspan="4">No model-tagged decisions yet.</td></tr>
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
							<th class="text-right px-4 py-2 font-medium">compute</th>
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
								<td class="px-4 py-2 mono text-xs num text-right">{fmtSec(s.totalComputeSeconds)}</td>
								<td class="px-4 py-2 mono text-xs num text-right">{fmtUsd(s.totalCost, true)}</td>
							</tr>
						{:else}
							<tr><td class="px-4 py-6 text-(--color-fg-muted)" colspan="6">No skill invocations yet.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</section>
{/if}
