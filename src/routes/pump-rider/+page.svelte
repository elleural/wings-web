<script lang="ts">
	import { fmtRelative, pnlClass } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	function lpToSol(v: number | string | null | undefined): number {
		if (v == null) return 0;
		const n = typeof v === 'string' ? Number(v) : v;
		return n / 1e9;
	}

	function fmtSol(v: number | string | null | undefined, digits = 4): string {
		if (v == null) return '—';
		const sol = lpToSol(v);
		return sol >= 0 ? `+${sol.toFixed(digits)}` : sol.toFixed(digits);
	}

	function fmtUsd(v: number | string | null | undefined): string {
		if (v == null) return '—';
		const usd = lpToSol(v) * data.solUsd;
		return usd >= 0 ? `+$${usd.toFixed(0)}` : `-$${Math.abs(usd).toFixed(0)}`;
	}

	function fmtPct(v: number | string | null | undefined): string {
		if (v == null || v === '') return '—';
		const n = typeof v === 'string' ? Number(v) : v;
		if (!Number.isFinite(n)) return '—';
		const pct = n * 100;
		return pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`;
	}

	function fmtSeconds(v: number | string | null | undefined): string {
		if (v == null) return '—';
		const n = typeof v === 'string' ? Number(v) : v;
		if (!Number.isFinite(n)) return '—';
		if (n < 60) return `${Math.round(n)}s`;
		if (n < 3600) return `${(n / 60).toFixed(1)}m`;
		return `${(n / 3600).toFixed(1)}h`;
	}

	const allTime = $derived(data.allTime);
	const winRate = $derived(
		allTime && Number(allTime.total) > 0
			? (Number(allTime.wins) / Number(allTime.total)) * 100
			: 0
	);
</script>

<h1 class="text-xl font-semibold mb-2">Pump-rider — paper-money watcher</h1>
<p class="text-sm text-(--color-fg-muted) mb-6">
	Live state of the pump.fun pump-rider strategy. Synced from copycat every cycle. Use this to
	decide when the win-rate and P&amp;L curve are stable enough to flip to real money.
</p>

{#if data.dbError}
	<div class="text-sm text-(--color-danger) mb-4">DB error: {data.dbError}</div>
{/if}

<!-- Summary cards -->
<div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
	<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
		<div class="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-1">Open</div>
		<div class="text-2xl font-semibold">{data.open.length}</div>
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
		<div class="text-xs text-(--color-fg-muted) mt-1">target: 90%</div>
	</div>
	<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
		<div class="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-1">Total P&amp;L</div>
		<div class="text-2xl font-semibold {pnlClass(Number(allTime?.pnl_lamports ?? 0))}">
			{fmtSol(allTime?.pnl_lamports)}
		</div>
		<div class="text-xs text-(--color-fg-muted) mt-1">{fmtUsd(allTime?.pnl_lamports)}</div>
	</div>
	<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
		<div class="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-1">Avg loser</div>
		<div class="text-2xl font-semibold {pnlClass(Number(allTime?.loser_avg_lamports ?? 0))}">
			{fmtSol(allTime?.loser_avg_lamports)}
		</div>
		<div class="text-xs text-(--color-fg-muted) mt-1">worst: {fmtSol(allTime?.worst_lamports)}</div>
	</div>
</div>

<!-- Daily totals -->
<h2 class="text-sm uppercase tracking-wider text-(--color-fg-muted) mb-2">
	Daily totals (last 14 days, fee-adjusted)
</h2>
<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden mb-8">
	<table class="w-full text-sm">
		<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
			<tr>
				<th class="text-left px-4 py-2 font-medium">Day</th>
				<th class="text-right px-4 py-2 font-medium">Trades</th>
				<th class="text-right px-4 py-2 font-medium">W/L</th>
				<th class="text-right px-4 py-2 font-medium">TP</th>
				<th class="text-right px-4 py-2 font-medium">Peak drop</th>
				<th class="text-right px-4 py-2 font-medium">Stop loss</th>
				<th class="text-right px-4 py-2 font-medium">Max hold</th>
				<th class="text-right px-4 py-2 font-medium">Gross PnL</th>
				<th class="text-right px-4 py-2 font-medium">Net (after fees)</th>
				<th class="text-right px-4 py-2 font-medium">USD</th>
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
					<td class="px-4 py-2 mono text-xs num text-right">{d.tp_fired}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{d.peak_drop}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{d.stop_loss}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{d.max_hold}</td>
					<td class="px-4 py-2 mono text-xs num text-right {pnlClass(Number(d.pnl_lamports))}">
						{fmtSol(d.pnl_lamports)}
					</td>
					<td class="px-4 py-2 mono text-xs num text-right {pnlClass(Number(d.net_pnl_lamports))}">
						{fmtSol(d.net_pnl_lamports)}
					</td>
					<td class="px-4 py-2 mono text-xs num text-right {pnlClass(Number(d.net_pnl_lamports))}">
						{fmtUsd(d.net_pnl_lamports)}
					</td>
				</tr>
			{:else}
				<tr><td colspan="10" class="px-4 py-6 text-(--color-fg-muted)">No closed trades yet.</td></tr>
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
				<th class="text-left px-4 py-2 font-medium">Token</th>
				<th class="text-right px-4 py-2 font-medium">Score</th>
				<th class="text-right px-4 py-2 font-medium">Max hold</th>
				<th class="text-right px-4 py-2 font-medium">Entry</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-(--color-border)">
			{#each data.open as p (p.id)}
				<tr>
					<td class="px-4 py-2 mono text-xs text-(--color-fg-muted)">{fmtRelative(p.openedAt)}</td>
					<td class="px-4 py-2 text-xs">
						<span class="font-medium">{p.tokenSymbol ?? p.tokenName ?? '—'}</span>
						<span class="ml-2 mono text-(--color-fg-muted)">{p.tokenMint.slice(0, 12)}…</span>
					</td>
					<td class="px-4 py-2 mono text-xs num text-right">{p.score ?? '—'}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{fmtSeconds(p.predictedMaxHoldS)}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{fmtSol(p.entrySolLamports, 3)} SOL</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="px-4 py-6 text-(--color-fg-muted)">No open positions.</td></tr>
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
				<th class="text-left px-4 py-2 font-medium">Token</th>
				<th class="text-left px-4 py-2 font-medium">Reason</th>
				<th class="text-right px-4 py-2 font-medium">Score</th>
				<th class="text-right px-4 py-2 font-medium">Held</th>
				<th class="text-right px-4 py-2 font-medium">PnL %</th>
				<th class="text-right px-4 py-2 font-medium">PnL SOL</th>
				<th class="text-right px-4 py-2 font-medium">USD</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-(--color-border)">
			{#each data.recent as r (r.id)}
				<tr>
					<td class="px-4 py-2 mono text-xs text-(--color-fg-muted)">{fmtRelative(r.closedAt)}</td>
					<td class="px-4 py-2 text-xs">
						<span class="font-medium">{r.tokenSymbol ?? r.tokenName ?? '—'}</span>
						<span class="ml-2 mono text-(--color-fg-muted)">{r.tokenMint.slice(0, 12)}…</span>
					</td>
					<td class="px-4 py-2 mono text-xs">{r.exitReason ?? '—'}</td>
					<td class="px-4 py-2 mono text-xs num text-right">{r.score ?? '—'}</td>
					<td class="px-4 py-2 mono text-xs num text-right">
						{r.openedAt && r.closedAt
							? fmtSeconds((new Date(r.closedAt).getTime() - new Date(r.openedAt).getTime()) / 1000)
							: '—'}
					</td>
					<td class="px-4 py-2 mono text-xs num text-right {pnlClass(Number(r.pnlPct))}">
						{fmtPct(r.pnlPct)}
					</td>
					<td class="px-4 py-2 mono text-xs num text-right {pnlClass(Number(r.pnlLamports))}">
						{fmtSol(r.pnlLamports)}
					</td>
					<td class="px-4 py-2 mono text-xs num text-right {pnlClass(Number(r.pnlLamports))}">
						{fmtUsd(r.pnlLamports)}
					</td>
				</tr>
			{:else}
				<tr><td colspan="8" class="px-4 py-6 text-(--color-fg-muted)">No closed trades yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
