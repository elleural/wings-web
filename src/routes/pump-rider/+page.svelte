<script lang="ts">
	import { fmtRelative, pnlClass } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Tab state — default to 'recent', toggle to 'missed'
	let activeTab: 'recent' | 'missed' = $state('recent');

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
		let n = typeof v === 'string' ? Number(v) : v;
		if (!Number.isFinite(n)) return '—';
		// Held time is always positive — old rows in the DB have negative
		// held_s due to a transaction-clock bug fixed at copycat side.
		n = Math.abs(n);
		if (n < 1) return `<1s`;
		if (n < 60) return `${Math.round(n)}s`;
		if (n < 3600) {
			const m = Math.floor(n / 60);
			const s = Math.round(n % 60);
			return s ? `${m}m ${s}s` : `${m}m`;
		}
		const h = Math.floor(n / 3600);
		const m = Math.round((n % 3600) / 60);
		return m ? `${h}h ${m}m` : `${h}h`;
	}

	const PUMPFUN_FEE_BPS = 100; // 1% per swap

	function feeUsdFor(
		entryLp: number | null | undefined,
		pnlLp: number | null | undefined,
		hasExitQuote: boolean
	): number {
		const e = Number(entryLp ?? 0);
		const p = Number(pnlLp ?? 0);
		if (!Number.isFinite(e) || e <= 0) return 0;
		// Entry fee always paid. Exit fee only if we actually got a sell quote;
		// drain_detected closes have no exit-side swap so no exit fee.
		const entryFeeLp = (e * PUMPFUN_FEE_BPS) / 10000;
		const exitFeeLp = hasExitQuote ? ((e + p) * PUMPFUN_FEE_BPS) / 10000 : 0;
		return ((entryFeeLp + exitFeeLp) / 1e9) * data.solUsd;
	}
	function netUsdFor(
		entryLp: number | null | undefined,
		pnlLp: number | null | undefined,
		hasExitQuote: boolean
	): number {
		const e = Number(entryLp ?? 0);
		// drain_detected and similar: we hold worthless tokens; realistic
		// loss = full entry minus the entry fee already paid.
		if (!hasExitQuote) {
			const lossUsd = -(e / 1e9) * data.solUsd;
			return lossUsd - feeUsdFor(entryLp, 0, false);
		}
		const p = Number(pnlLp ?? 0);
		const grossUsd = (p / 1e9) * data.solUsd;
		return grossUsd - feeUsdFor(entryLp, pnlLp, true);
	}
	function exitLpFor(entryLp: number | null | undefined, pnlLp: number | null | undefined): number {
		return Number(entryLp ?? 0) + Number(pnlLp ?? 0);
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
		<div class="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-1">Total P&amp;L (net)</div>
		<div class="text-2xl font-semibold {pnlClass(Number(allTime?.net_pnl_lamports ?? 0))}">
			{fmtSol(allTime?.net_pnl_lamports)}
		</div>
		<div class="text-xs text-(--color-fg-muted) mt-1">
			{fmtUsd(allTime?.net_pnl_lamports)}
			· gross {fmtSol(allTime?.pnl_lamports, 3)}
		</div>
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
				<th class="text-right px-4 py-2 font-medium" title="Curve drain — full loss, no exit quote">Drain</th>
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
					<td class="px-4 py-2 mono text-xs num text-right">{d.drain ?? 0}</td>
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
				<tr><td colspan="11" class="px-4 py-6 text-(--color-fg-muted)">No closed trades yet.</td></tr>
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

<!-- Tab switcher -->
<div class="flex gap-2 mb-4 border-b border-(--color-border)">
	<button
		type="button"
		onclick={() => (activeTab = 'recent')}
		class={[
			'px-4 py-2 text-sm uppercase tracking-wider transition-colors -mb-px',
			activeTab === 'recent'
				? 'text-(--color-fg) border-b-2 border-(--color-accent) font-medium'
				: 'text-(--color-fg-muted) hover:text-(--color-fg) border-b-2 border-transparent'
		].join(' ')}
	>
		Recent closes
		<span class="ml-2 text-xs normal-case tracking-normal text-(--color-fg-muted)">
			({data.recent.length})
		</span>
	</button>
	<button
		type="button"
		onclick={() => (activeTab = 'missed')}
		class={[
			'px-4 py-2 text-sm uppercase tracking-wider transition-colors -mb-px',
			activeTab === 'missed'
				? 'text-(--color-fg) border-b-2 border-(--color-accent) font-medium'
				: 'text-(--color-fg-muted) hover:text-(--color-fg) border-b-2 border-transparent'
		].join(' ')}
	>
		Missed opportunities
		<span class="ml-2 text-xs normal-case tracking-normal text-(--color-fg-muted)">
			({data.missed.length}) — skipped by classifier, ended up profitable
		</span>
	</button>
</div>

<!-- Missed opportunities -->
{#if activeTab === 'missed'}
<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-x-auto mb-8">
	<table class="w-full text-sm">
		<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
			<tr>
				<th class="text-left px-3 py-2 font-medium">Detected</th>
				<th class="text-left px-3 py-2 font-medium">Token</th>
				<th class="text-left px-3 py-2 font-medium">Why skipped</th>
				<th class="text-right px-3 py-2 font-medium" title="Classifier probability we assigned">Score</th>
				<th class="text-right px-3 py-2 font-medium" title="What it needed to cross">Threshold</th>
				<th class="text-right px-3 py-2 font-medium" title="Peak real_sol_reserves the curve reached">Peak</th>
				<th class="text-right px-3 py-2 font-medium" title="Time from create to peak">Phase 2</th>
				<th class="text-right px-3 py-2 font-medium" title="Net SOL the issuer extracted">Issuer made</th>
				<th class="text-right px-3 py-2 font-medium" title="Estimated USD missed at our default position size">$ Missed</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-(--color-border)">
			{#each data.missed as m (m.id)}
				<tr>
					<td class="px-3 py-2 mono text-xs text-(--color-fg-muted)">{fmtRelative(m.detectedAt)}</td>
					<td class="px-3 py-2 text-xs">
						<span class="font-medium">{m.tokenSymbol ?? m.tokenName ?? '—'}</span>
						<span class="ml-2 mono text-(--color-fg-muted)">{m.baseMint.slice(0, 10)}…</span>
					</td>
					<td class="px-3 py-2 mono text-xs">{m.decision ?? '—'}</td>
					<td class="px-3 py-2 mono text-xs num text-right">{m.score ?? '—'}</td>
					<td class="px-3 py-2 mono text-xs num text-right text-(--color-fg-muted)">{m.probThreshold ?? '—'}</td>
					<td class="px-3 py-2 mono text-xs num text-right">
						{m.peakPdaLamports ? `${(Number(m.peakPdaLamports) / 1e9).toFixed(1)} SOL` : '—'}
					</td>
					<td class="px-3 py-2 mono text-xs num text-right">{fmtSeconds(m.phase2DurationSeconds)}</td>
					<td class="px-3 py-2 mono text-xs num text-right">
						{m.issuerProfitLamports != null
							? `${Number(m.issuerProfitLamports) >= 0 ? '+' : ''}${(Number(m.issuerProfitLamports) / 1e9).toFixed(2)} SOL`
							: '—'}
					</td>
					<td class="px-3 py-2 mono text-xs num text-right text-(--color-warn)">
						{m.estimatedMissedUsd != null
							? `-$${Number(m.estimatedMissedUsd).toFixed(2)}`
							: '—'}
					</td>
				</tr>
			{:else}
				<tr><td colspan="9" class="px-3 py-6 text-(--color-fg-muted)">No missed opportunities yet — backfill labeler hasn't reached skipped rows.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

{/if}

<!-- Recent closes -->
{#if activeTab === 'recent'}
<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-x-auto">
	<table class="w-full text-sm">
		<thead class="bg-(--color-bg-elev) text-xs uppercase tracking-wider text-(--color-fg-muted)">
			<tr>
				<th class="text-left px-3 py-2 font-medium">Closed</th>
				<th class="text-left px-3 py-2 font-medium">Token</th>
				<th class="text-left px-3 py-2 font-medium">Reason</th>
				<th class="text-right px-3 py-2 font-medium">Score</th>
				<th class="text-right px-3 py-2 font-medium">Held</th>
				<th class="text-right px-3 py-2 font-medium" title="Predicted phase-2 duration (model)">Pred P2</th>
				<th class="text-right px-3 py-2 font-medium" title="USD spent on entry">$ in</th>
				<th class="text-right px-3 py-2 font-medium" title="USD received on exit (entry + pnl, before fees)">$ out</th>
				<th class="text-right px-3 py-2 font-medium" title="Pump.fun 1%/leg fee approximation">Fees</th>
				<th class="text-right px-3 py-2 font-medium">PnL %</th>
				<th class="text-right px-3 py-2 font-medium" title="Net = gross PnL minus fees">Net $</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-(--color-border)">
			{#each data.recent as r (r.id)}
				{@const heldS =
					r.openedAt && r.closedAt
						? Math.abs((new Date(r.closedAt).getTime() - new Date(r.openedAt).getTime()) / 1000)
						: null}
				{@const entryLp = Number(r.entrySolLamports ?? 0)}
				{@const pnlLp = Number(r.pnlLamports ?? 0)}
				{@const exitLp = exitLpFor(entryLp, pnlLp)}
				{@const hasExitQuote = r.pnlLamports != null}
				{@const fee = feeUsdFor(entryLp, pnlLp, hasExitQuote)}
				{@const net = netUsdFor(entryLp, pnlLp, hasExitQuote)}
				<tr>
					<td class="px-3 py-2 mono text-xs text-(--color-fg-muted)">{fmtRelative(r.closedAt)}</td>
					<td class="px-3 py-2 text-xs">
						<span class="font-medium">{r.tokenSymbol ?? r.tokenName ?? '—'}</span>
						<span class="ml-2 mono text-(--color-fg-muted)">{r.tokenMint.slice(0, 10)}…</span>
					</td>
					<td class="px-3 py-2 mono text-xs">{r.exitReason ?? '—'}</td>
					<td class="px-3 py-2 mono text-xs num text-right">{r.score ?? '—'}</td>
					<td class="px-3 py-2 mono text-xs num text-right">{fmtSeconds(heldS)}</td>
					<td class="px-3 py-2 mono text-xs num text-right text-(--color-fg-muted)">
						{r.predictedMaxHoldS ? fmtSeconds(r.predictedMaxHoldS) : '—'}
					</td>
					<td class="px-3 py-2 mono text-xs num text-right">
						${((entryLp / 1e9) * data.solUsd).toFixed(2)}
					</td>
					<td class="px-3 py-2 mono text-xs num text-right" title={hasExitQuote ? '' : 'No sell quote — curve drained, tokens worthless'}>
						{hasExitQuote ? `$${((exitLp / 1e9) * data.solUsd).toFixed(2)}` : '$0.00'}
					</td>
					<td class="px-3 py-2 mono text-xs num text-right text-(--color-fg-muted)">
						-${fee.toFixed(2)}
					</td>
					<td class="px-3 py-2 mono text-xs num text-right {pnlClass(Number(r.pnlPct))}">
						{hasExitQuote ? fmtPct(r.pnlPct) : '-100.0%'}
					</td>
					<td class="px-3 py-2 mono text-xs num text-right {pnlClass(net)}">
						{net >= 0 ? `+$${net.toFixed(2)}` : `-$${Math.abs(net).toFixed(2)}`}
					</td>
				</tr>
			{:else}
				<tr><td colspan="11" class="px-3 py-6 text-(--color-fg-muted)">No closed trades yet.</td></tr>
			{/each}
		</tbody>
	</table>
</div>
{/if}
