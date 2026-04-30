<script lang="ts">
	import { fmtUsd, fmtPct, fmtRelative, pnlClass } from '$lib/format';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const equity = $derived(data.account?.equityUsd ?? null);
	const starting = $derived(data.account?.startingEquityUsd ?? null);
	const totalPnl = $derived(
		equity != null && starting != null ? parseFloat(equity) - parseFloat(starting) : null
	);
	const totalPnlPct = $derived(
		equity != null && starting != null && parseFloat(starting) > 0
			? (parseFloat(equity) - parseFloat(starting)) / parseFloat(starting)
			: null
	);
	const latestSnapshot = $derived(data.snapshots?.[0] ?? null);
</script>

<div class="space-y-8">
	{#if data.dbError}
		<div
			class="rounded-md border border-(--color-warn)/40 bg-(--color-warn)/10 p-4 text-sm text-(--color-warn)"
		>
			<p class="font-semibold">Database not yet initialized</p>
			<p class="mt-1 text-(--color-fg-muted)">{data.dbError}</p>
			<p class="mt-2 text-(--color-fg-muted)">
				Run <span class="mono">npm run db:migrate</span> with a populated <span class="mono"
					>DATABASE_URL_UNPOOLED</span
				>
				to create the schema.
			</p>
		</div>
	{/if}

	{#if !data.account && !data.dbError}
		<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-6">
			<p class="font-semibold">No account yet.</p>
			<p class="mt-2 text-sm text-(--color-fg-muted)">
				The Hermes host will register the <span class="mono">default</span> account on first run via
				<span class="mono">POST /api/v1/accounts</span>.
			</p>
		</div>
	{/if}

	{#if data.account}
		<!-- KPI row -->
		<section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
				<div class="text-xs uppercase tracking-wider text-(--color-fg-muted)">Equity</div>
				<div class="mt-1 text-2xl font-semibold mono num">{fmtUsd(equity)}</div>
				<div class="mt-1 text-xs text-(--color-fg-muted)">
					started at <span class="mono num">{fmtUsd(starting)}</span>
				</div>
			</div>
			<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
				<div class="text-xs uppercase tracking-wider text-(--color-fg-muted)">Total P&amp;L</div>
				<div class="mt-1 text-2xl font-semibold mono num {pnlClass(totalPnl)}">
					{fmtUsd(totalPnl)}
				</div>
				<div class="mt-1 text-xs mono num {pnlClass(totalPnlPct)}">{fmtPct(totalPnlPct)}</div>
			</div>
			<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
				<div class="text-xs uppercase tracking-wider text-(--color-fg-muted)">Mode</div>
				<div class="mt-1 text-2xl font-semibold">
					<span
						class={data.account.mode === 'live'
							? 'text-(--color-danger)'
							: 'text-(--color-accent)'}>{data.account.mode}</span
					>
				</div>
				<div class="mt-1 text-xs text-(--color-fg-muted)">
					{#if data.account.mode === 'paper'}
						no real capital at risk
					{:else}
						⚠ real capital
					{/if}
				</div>
			</div>
			<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
				<div class="text-xs uppercase tracking-wider text-(--color-fg-muted)">Open positions</div>
				<div class="mt-1 text-2xl font-semibold mono num">{data.openPositions.length}</div>
				<div class="mt-1 text-xs text-(--color-fg-muted)">
					reserve <span class="mono num">{fmtUsd(data.account.reserveUsd)}</span>
				</div>
			</div>
		</section>

		<!-- Latest hourly snapshot -->
		{#if latestSnapshot}
			<section class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4">
				<div class="text-xs uppercase tracking-wider text-(--color-fg-muted) mb-3">
					Latest hourly snapshot · {fmtRelative(latestSnapshot.hour)}
				</div>
				<div class="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 text-sm">
					<div>
						<div class="text-(--color-fg-muted) text-xs">realized</div>
						<div class="mono num {pnlClass(latestSnapshot.realizedUsd)}">
							{fmtUsd(latestSnapshot.realizedUsd)}
						</div>
					</div>
					<div>
						<div class="text-(--color-fg-muted) text-xs">unrealized</div>
						<div class="mono num {pnlClass(latestSnapshot.unrealizedUsd)}">
							{fmtUsd(latestSnapshot.unrealizedUsd)}
						</div>
					</div>
					<div>
						<div class="text-(--color-fg-muted) text-xs">drawdown</div>
						<div class="mono num">{fmtPct(latestSnapshot.drawdownPct)}</div>
					</div>
					<div>
						<div class="text-(--color-fg-muted) text-xs">Sharpe (30d)</div>
						<div class="mono num">{latestSnapshot.sharpe30d ?? '—'}</div>
					</div>
				</div>
			</section>
		{/if}

		<!-- Two-column: recent decisions + recent fills -->
		<section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<div class="rounded-md border border-(--color-border) bg-(--color-bg-card)">
				<div
					class="px-4 py-3 border-b border-(--color-border) flex items-center justify-between"
				>
					<span class="text-sm font-semibold">Recent decisions</span>
					<a href="/decisions" class="text-xs text-(--color-fg-muted) hover:text-(--color-fg)">
						view all →
					</a>
				</div>
				<ul class="divide-y divide-(--color-border) text-sm">
					{#each data.recentDecisions as d (d.id)}
						<li class="px-4 py-2 flex items-center gap-3">
							<span class="mono text-xs text-(--color-fg-muted) w-20 shrink-0"
								>{d.subAgent.replace('_', '-')}</span
							>
							<span class="mono text-xs text-(--color-fg-muted) shrink-0">
								{d.skillInvoked ?? '—'}
							</span>
							<span class="text-(--color-fg-muted) text-xs ml-auto shrink-0">
								{fmtRelative(d.decidedAt)}
							</span>
							<span
								class="text-xs shrink-0 {d.approved === false
									? 'text-(--color-danger)'
									: d.approved === true
										? 'text-(--color-accent)'
										: 'text-(--color-fg-muted)'}"
							>
								{d.approved === false ? '✗' : d.approved === true ? '✓' : '·'}
							</span>
						</li>
					{:else}
						<li class="px-4 py-6 text-sm text-(--color-fg-muted)">No decisions yet.</li>
					{/each}
				</ul>
			</div>

			<div class="rounded-md border border-(--color-border) bg-(--color-bg-card)">
				<div
					class="px-4 py-3 border-b border-(--color-border) flex items-center justify-between"
				>
					<span class="text-sm font-semibold">Recent fills</span>
					<a href="/fills" class="text-xs text-(--color-fg-muted) hover:text-(--color-fg)">
						view all →
					</a>
				</div>
				<ul class="divide-y divide-(--color-border) text-sm">
					{#each data.recentFills as f (f.id)}
						<li class="px-4 py-2 flex items-center gap-3">
							<span
								class="mono text-xs shrink-0 {f.isPaper
									? 'text-(--color-fg-muted)'
									: 'text-(--color-warn)'}"
							>
								{f.isPaper ? 'paper' : 'live'}
							</span>
							<span class="mono text-xs num shrink-0">{fmtUsd(f.notionalUsd)}</span>
							<span class="text-xs text-(--color-fg-muted) ml-auto shrink-0">
								{fmtRelative(f.filledAt)}
							</span>
						</li>
					{:else}
						<li class="px-4 py-6 text-sm text-(--color-fg-muted)">No fills yet.</li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}
</div>
