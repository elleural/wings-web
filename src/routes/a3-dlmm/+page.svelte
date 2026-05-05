<script lang="ts">
	import { fmtRelative, pnlClass } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function n(v: number | string | null | undefined): number {
		if (v == null || v === '') return 0;
		const x = typeof v === 'string' ? Number(v) : v;
		return Number.isFinite(x) ? x : 0;
	}

	function fmtUsd(v: number | string | null | undefined, digits = 2): string {
		if (v == null || v === '') return '—';
		const x = n(v);
		const sign = x >= 0 ? '+' : '−';
		return `${sign}$${Math.abs(x).toFixed(digits)}`;
	}

	function fmtUsdPlain(v: number | string | null | undefined, digits = 2): string {
		if (v == null || v === '') return '—';
		return `$${n(v).toFixed(digits)}`;
	}

	function fmtPct(v: number | string | null | undefined, digits = 2): string {
		if (v == null || v === '') return '—';
		const x = n(v) * 100;
		return x >= 0 ? `+${x.toFixed(digits)}%` : `${x.toFixed(digits)}%`;
	}

	function fmtRate(v: number | string | null | undefined, digits = 4): string {
		if (v == null || v === '') return '—';
		return n(v).toFixed(digits);
	}

	function fmtSeconds(v: number | string | null | undefined): string {
		if (v == null) return '—';
		const x = n(v);
		if (x < 60) return `${Math.round(x)}s`;
		if (x < 3600) return `${(x / 60).toFixed(1)}m`;
		if (x < 86400) return `${(x / 3600).toFixed(1)}h`;
		return `${(x / 86400).toFixed(1)}d`;
	}

	const allTime = $derived(data.allTime);
	const live = $derived(data.live);
	const winRate = $derived(
		allTime && Number(allTime.total) > 0
			? (Number(allTime.wins) / Number(allTime.total)) * 100
			: 0
	);
</script>

<h1 class="text-xl font-semibold mb-2">A3 — Spot-Wide DLMM LP (paper)</h1>
<p class="text-sm text-(--color-fg-muted) mb-6">
	Live state of the A3 strategy on Meteora DLMM (currently SOL/USDC). Synced from copycat every
	5 min. The LVR-gate inputs at entry (σ, fee/lvr rates, fee_multiplier source) explain WHY
	each position opened — convergence happens when the gate's predicted yield ≈ realized yield
	across many cycles.
</p>

{#if data.dbError}
	<div class="text-sm text-(--color-danger) mb-4">DB error: {data.dbError}</div>
{/if}

<!-- Summary cards -->
<div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
	<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
		<div class="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-1">Open</div>
		<div class="text-2xl font-semibold">{live?.open_count ?? data.open.length}</div>
		<div class="text-xs text-(--color-fg-muted) mt-1">
			unrlz: <span class={pnlClass(n(live?.live_unrealized_pnl_usd))}>{fmtUsd(live?.live_unrealized_pnl_usd)}</span>
		</div>
	</div>
	<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
		<div class="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-1">Total closes</div>
		<div class="text-2xl font-semibold">{allTime?.total ?? 0}</div>
		<div class="text-xs text-(--color-fg-muted) mt-1">
			<span class="text-(--color-accent)">{allTime?.wins ?? 0}W</span> ·
			<span class="text-(--color-danger)">{allTime?.losses ?? 0}L</span>
		</div>
	</div>
	<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
		<div class="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-1">Win rate</div>
		<div class="text-2xl font-semibold">{winRate.toFixed(1)}%</div>
		<div class="text-xs text-(--color-fg-muted) mt-1">avg hold: {fmtSeconds(allTime?.avg_hold_seconds)}</div>
	</div>
	<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
		<div class="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-1">Realized P&amp;L</div>
		<div class="text-2xl font-semibold {pnlClass(n(allTime?.total_pnl_usd))}">
			{fmtUsd(allTime?.total_pnl_usd)}
		</div>
		<div class="text-xs text-(--color-fg-muted) mt-1">
			fees {fmtUsdPlain(allTime?.total_fees_usd)} − lvr {fmtUsdPlain(allTime?.total_lvr_usd)}
		</div>
	</div>
	<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
		<div class="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-1">Gas drag (all)</div>
		<div class="text-2xl font-semibold">{fmtUsdPlain(allTime?.total_gas_usd)}</div>
		<div class="text-xs text-(--color-fg-muted) mt-1">paper-mode estimate</div>
	</div>
</div>

<!-- Daily totals -->
<h2 class="text-sm uppercase tracking-wider text-(--color-fg-muted) mb-2">
	Daily totals (last 14 days)
</h2>
<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden mb-8">
	<table class="w-full text-sm">
		<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
			<tr>
				<th class="text-left px-4 py-2 font-medium">Day</th>
				<th class="text-right px-4 py-2 font-medium">Cycles</th>
				<th class="text-right px-4 py-2 font-medium">W/L</th>
				<th class="text-right px-4 py-2 font-medium">Fees</th>
				<th class="text-right px-4 py-2 font-medium">LVR</th>
				<th class="text-right px-4 py-2 font-medium">Gas</th>
				<th class="text-right px-4 py-2 font-medium">Net P&amp;L</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-(--color-border)">
			{#each data.daily as d}
				<tr>
					<td class="px-4 py-2 text-xs">{d.day}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{d.n_trades}</td>
					<td class="px-4 py-2 mono text-xs num text-right">
						<span class="text-(--color-accent)">{d.wins}</span>/<span class="text-(--color-danger)">{d.losses}</span>
					</td>
					<td class="px-4 py-2 mono text-xs num text-right">{fmtUsdPlain(d.total_fees_usd)}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{fmtUsdPlain(d.total_lvr_usd)}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{fmtUsdPlain(d.total_gas_usd)}</td>
					<td class="px-4 py-2 mono text-xs num text-right {pnlClass(n(d.total_pnl_usd))}">
						{fmtUsd(d.total_pnl_usd)}
					</td>
				</tr>
			{:else}
				<tr><td colspan="7" class="px-4 py-6 text-(--color-fg-muted)">No closed cycles yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<!-- Open positions -->
<h2 class="text-sm uppercase tracking-wider text-(--color-fg-muted) mb-2">
	Open positions ({data.open.length})
</h2>
<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden mb-8">
	<table class="w-full text-sm">
		<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
			<tr>
				<th class="text-left px-4 py-2 font-medium">Opened</th>
				<th class="text-left px-4 py-2 font-medium">Pool</th>
				<th class="text-right px-4 py-2 font-medium">Bins</th>
				<th class="text-right px-4 py-2 font-medium">Entry $</th>
				<th class="text-right px-4 py-2 font-medium">σ entry</th>
				<th class="text-right px-4 py-2 font-medium">Fee yield</th>
				<th class="text-right px-4 py-2 font-medium">LVR rate</th>
				<th class="text-right px-4 py-2 font-medium">Fee mult</th>
				<th class="text-right px-4 py-2 font-medium">Bin $</th>
				<th class="text-right px-4 py-2 font-medium">Live P&amp;L</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-(--color-border)">
			{#each data.open as p (p.id)}
				<tr>
					<td class="px-4 py-2 mono text-xs text-(--color-fg-muted)">{fmtRelative(p.openedAt)}</td>
					<td class="px-4 py-2 text-xs">
						<span class="font-medium">{p.geometry ?? 'Spot-Wide'}</span>
						<span class="ml-2 mono text-(--color-fg-muted)">{p.poolAddress?.slice(0, 12)}…</span>
					</td>
					<td class="px-4 py-2 mono text-xs num text-right">
						{p.binIdLow ?? '—'}…{p.binIdHigh ?? '—'}
					</td>
					<td class="px-4 py-2 mono text-xs num text-right">{fmtUsdPlain(p.entryValueUsd)}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{fmtRate(p.sigmaAtEntry, 4)}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{fmtUsdPlain(p.feeYieldRateAtEntry, 3)}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{fmtUsdPlain(p.lvrRateAtEntry, 3)}</td>
					<td class="px-4 py-2 mono text-xs num text-right">
						{fmtRate(p.feeMultiplierUsed, 2)}×
						<span class="ml-1 text-(--color-fg-muted)">{p.feeMultiplierSource === 'onchain_bin' ? '🔗' : '⚙'}</span>
					</td>
					<td class="px-4 py-2 mono text-xs num text-right">{fmtUsdPlain(p.binActiveUsdAtEntry, 0)}</td>
					<td class="px-4 py-2 mono text-xs num text-right {pnlClass(n(p.realizedPnlUsd))}">
						{fmtUsd(p.realizedPnlUsd)}
					</td>
				</tr>
			{:else}
				<tr><td colspan="10" class="px-4 py-6 text-(--color-fg-muted)">No open positions.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

<!-- Recent closes -->
<h2 class="text-sm uppercase tracking-wider text-(--color-fg-muted) mb-2">Recent closes (last 50)</h2>
<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
	<table class="w-full text-sm">
		<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
			<tr>
				<th class="text-left px-4 py-2 font-medium">Closed</th>
				<th class="text-left px-4 py-2 font-medium">Reason</th>
				<th class="text-right px-4 py-2 font-medium">Held</th>
				<th class="text-right px-4 py-2 font-medium">Rebals</th>
				<th class="text-right px-4 py-2 font-medium">Fees</th>
				<th class="text-right px-4 py-2 font-medium">LVR</th>
				<th class="text-right px-4 py-2 font-medium">Net P&amp;L</th>
				<th class="text-right px-4 py-2 font-medium">Yield/day</th>
				<th class="text-right px-4 py-2 font-medium">Predicted</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-(--color-border)">
			{#each data.recent as r (r.id)}
				<tr>
					<td class="px-4 py-2 mono text-xs text-(--color-fg-muted)">{fmtRelative(r.closedAt)}</td>
					<td class="px-4 py-2 mono text-xs">{r.exitReason ?? '—'}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{fmtSeconds(r.holdSeconds)}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{r.nRebalances ?? 0}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{fmtUsdPlain(r.realizedFeesUsd)}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{fmtUsdPlain(r.realizedLvrUsd)}</td>
					<td class="px-4 py-2 mono text-xs num text-right {pnlClass(n(r.realizedPnlUsd))}">
						{fmtUsd(r.realizedPnlUsd)}
					</td>
					<td class="px-4 py-2 mono text-xs num text-right {pnlClass(n(r.realizedYieldRate))}">
						{fmtPct(r.realizedYieldRate)}
					</td>
					<td class="px-4 py-2 mono text-xs num text-right text-(--color-fg-muted)">
						{fmtPct(r.predictedYieldRate)}
					</td>
				</tr>
			{:else}
				<tr><td colspan="9" class="px-4 py-6 text-(--color-fg-muted)">No closed cycles yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
