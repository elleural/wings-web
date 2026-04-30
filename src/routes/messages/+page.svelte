<script lang="ts">
	import { fmtRelative } from '$lib/format';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const filters = [
		{ value: 'open', label: 'open' },
		{ value: 'acked', label: 'acked' },
		{ value: 'in_progress', label: 'in progress' },
		{ value: 'resolved', label: 'resolved' },
		{ value: 'wont_fix', label: "won't fix" },
		{ value: 'all', label: 'all' }
	];

	function authorBadge(a: string): string {
		if (a === 'hermes') return 'text-(--color-accent)';
		if (a === 'claude') return 'text-(--color-warn)';
		return 'text-(--color-fg)';
	}
	function severityBadge(s: string): string {
		if (s === 'critical') return 'text-(--color-danger)';
		if (s === 'high') return 'text-(--color-warn)';
		return 'text-(--color-fg-muted)';
	}
	function statusBadge(s: string): string {
		if (s === 'open') return 'text-(--color-accent)';
		if (s === 'in_progress') return 'text-(--color-warn)';
		if (s === 'resolved') return 'text-(--color-fg-muted) line-through';
		if (s === 'wont_fix') return 'text-(--color-danger) line-through';
		return 'text-(--color-fg-muted)';
	}

	function pickThread(id: number) {
		const params = new URLSearchParams(window.location.search);
		params.set('id', String(id));
		goto(`?${params.toString()}`, { keepFocus: true });
	}

	function changeFilter(v: string) {
		const params = new URLSearchParams();
		params.set('filter', v);
		goto(`?${params.toString()}`);
	}
</script>

<div class="flex items-baseline justify-between mb-6">
	<h1 class="text-xl font-semibold">Messages</h1>
	<p class="text-sm text-(--color-fg-muted)">
		two-way inbox · hermes · user · claude
	</p>
</div>

{#if data.dbError}
	<div class="text-sm text-(--color-warn)">DB error: {data.dbError}</div>
{:else}
	<!-- filters -->
	<div class="flex items-center gap-2 mb-4 text-xs">
		{#each filters as f (f.value)}
			<button
				type="button"
				class="px-2.5 py-1 rounded-md border {data.filter === f.value
					? 'border-(--color-accent) text-(--color-accent)'
					: 'border-(--color-border) text-(--color-fg-muted) hover:text-(--color-fg)'}"
				onclick={() => changeFilter(f.value)}>{f.label}</button
			>
		{/each}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<!-- thread list -->
		<aside class="rounded-md border border-(--color-border) bg-(--color-bg-card) overflow-hidden">
			<div
				class="px-4 py-2 border-b border-(--color-border) text-xs uppercase tracking-wider text-(--color-fg-muted)"
			>
				{data.threads.length} thread{data.threads.length === 1 ? '' : 's'}
			</div>
			<ul class="divide-y divide-(--color-border) max-h-[70vh] overflow-y-auto">
				{#each data.threads as t (t.id)}
					{@const active = data.selected?.id === t.id}
					<li>
						<button
							type="button"
							class="w-full text-left px-4 py-3 hover:bg-(--color-bg-elev)/50 {active
								? 'bg-(--color-bg-elev)'
								: ''}"
							onclick={() => pickThread(t.id)}
						>
							<div class="flex items-center gap-2 text-xs">
								<span class="mono {authorBadge(t.author)}">{t.author}</span>
								<span class="mono text-(--color-fg-muted)">{t.kind.replace(/_/g, ' ')}</span>
								<span class="mono ml-auto {severityBadge(t.severity)}">{t.severity}</span>
							</div>
							<div class="mt-1 text-sm font-medium truncate">
								{t.subject ?? t.body.slice(0, 80) + (t.body.length > 80 ? '…' : '')}
							</div>
							<div class="mt-1 flex items-center gap-2 text-xs">
								<span class={statusBadge(t.status)}>{t.status.replace(/_/g, ' ')}</span>
								<span class="text-(--color-fg-muted) ml-auto">{fmtRelative(t.updatedAt)}</span>
							</div>
						</button>
					</li>
				{:else}
					<li class="px-4 py-6 text-sm text-(--color-fg-muted)">No threads in this filter.</li>
				{/each}
			</ul>
		</aside>

		<!-- detail / reply -->
		<section class="lg:col-span-2">
			{#if data.selected}
				<article
					class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-5 mb-4"
				>
					<header class="flex items-center gap-3 mb-3">
						<span class="mono text-xs {authorBadge(data.selected.author)}"
							>{data.selected.author}</span
						>
						<span class="mono text-xs text-(--color-fg-muted)">
							{data.selected.kind.replace(/_/g, ' ')}
						</span>
						<span class="mono text-xs {severityBadge(data.selected.severity)}">
							{data.selected.severity}
						</span>
						<span class="ml-auto mono text-xs {statusBadge(data.selected.status)}">
							{data.selected.status.replace(/_/g, ' ')}
						</span>
					</header>
					{#if data.selected.subject}
						<h2 class="text-lg font-semibold mb-3">{data.selected.subject}</h2>
					{/if}
					<pre
						class="whitespace-pre-wrap break-words text-sm font-sans">{data.selected.body}</pre>
					{#if data.selected.relatedSkill || data.selected.relatedRepo || data.selected.relatedCommitSha}
						<dl class="mt-4 grid grid-cols-3 gap-4 text-xs">
							{#if data.selected.relatedSkill}
								<div>
									<dt class="text-(--color-fg-muted)">skill</dt>
									<dd class="mono">{data.selected.relatedSkill}</dd>
								</div>
							{/if}
							{#if data.selected.relatedRepo}
								<div>
									<dt class="text-(--color-fg-muted)">repo</dt>
									<dd class="mono">{data.selected.relatedRepo}</dd>
								</div>
							{/if}
							{#if data.selected.relatedCommitSha}
								<div>
									<dt class="text-(--color-fg-muted)">commit</dt>
									<dd class="mono">{data.selected.relatedCommitSha.slice(0, 12)}</dd>
								</div>
							{/if}
						</dl>
					{/if}
					<div class="mt-4 text-xs text-(--color-fg-muted)">
						filed {fmtRelative(data.selected.createdAt)}
					</div>
				</article>

				<!-- replies -->
				<div class="space-y-3 mb-6">
					{#each data.replies as r (r.id)}
						<article
							class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4"
						>
							<header class="flex items-center gap-3 text-xs mb-2">
								<span class="mono {authorBadge(r.author)}">{r.author}</span>
								<span class="text-(--color-fg-muted) ml-auto">{fmtRelative(r.createdAt)}</span>
							</header>
							<pre
								class="whitespace-pre-wrap break-words text-sm font-sans">{r.body}</pre>
						</article>
					{/each}
				</div>

				<!-- reply form -->
				<form
					method="POST"
					action="?/reply"
					use:enhance
					class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-4 space-y-3"
				>
					<input type="hidden" name="parentId" value={data.selected.id} />
					<div class="flex gap-3 text-xs">
						<label class="flex items-center gap-2">
							as
							<select
								name="author"
								class="bg-(--color-bg) border border-(--color-border) rounded px-2 py-1"
							>
								<option value="user">user</option>
								<option value="claude">claude</option>
							</select>
						</label>
						<label class="flex items-center gap-2">
							set status
							<select
								name="status"
								class="bg-(--color-bg) border border-(--color-border) rounded px-2 py-1"
							>
								<option value="">— no change —</option>
								<option value="acked">acked</option>
								<option value="in_progress">in progress</option>
								<option value="resolved">resolved</option>
								<option value="wont_fix">won't fix</option>
								<option value="open">re-open</option>
							</select>
						</label>
					</div>
					<textarea
						name="body"
						rows="6"
						required
						placeholder="reply (markdown ok) — Hermes will see this when it polls /api/v1/messages?parentId={data.selected.id}"
						class="w-full bg-(--color-bg) border border-(--color-border) rounded p-2 text-sm font-sans"
					></textarea>
					<div class="flex items-center gap-3">
						<input
							type="password"
							name="apiKey"
							required
							placeholder="WINGS_WEB_API_KEY"
							class="flex-1 bg-(--color-bg) border border-(--color-border) rounded p-2 text-xs mono"
						/>
						<button
							type="submit"
							class="px-3 py-2 rounded-md bg-(--color-accent)/15 border border-(--color-accent)/40 text-(--color-accent) text-sm font-medium hover:bg-(--color-accent)/25"
							>reply</button
						>
					</div>
					{#if form?.error}
						<p class="text-xs text-(--color-danger)">{form.error}</p>
					{/if}
					{#if form?.ok}
						<p class="text-xs text-(--color-accent)">posted — refresh to see</p>
					{/if}
				</form>
			{:else}
				<div class="rounded-md border border-(--color-border) bg-(--color-bg-card) p-6 text-sm text-(--color-fg-muted)">
					Pick a thread on the left.
				</div>
			{/if}
		</section>
	</div>
{/if}
