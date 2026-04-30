/** Shared number/date formatting helpers used by dashboard pages. */

const usd = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});
const usdHi = new Intl.NumberFormat('en-US', {
	style: 'currency',
	currency: 'USD',
	minimumFractionDigits: 4,
	maximumFractionDigits: 4
});
const pct = new Intl.NumberFormat('en-US', {
	style: 'percent',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
	signDisplay: 'always'
});
const dt = new Intl.DateTimeFormat('en-US', {
	dateStyle: 'medium',
	timeStyle: 'medium'
});

export function fmtUsd(v: string | number | null | undefined, hi = false): string {
	if (v == null || v === '') return '—';
	const n = typeof v === 'string' ? parseFloat(v) : v;
	if (!isFinite(n)) return '—';
	return (hi ? usdHi : usd).format(n);
}

export function fmtPct(v: string | number | null | undefined): string {
	if (v == null || v === '') return '—';
	const n = typeof v === 'string' ? parseFloat(v) : v;
	if (!isFinite(n)) return '—';
	return pct.format(n);
}

export function fmtDate(v: Date | string | null | undefined): string {
	if (!v) return '—';
	const d = v instanceof Date ? v : new Date(v);
	return dt.format(d);
}

export function fmtRelative(v: Date | string | null | undefined): string {
	if (!v) return '—';
	const d = v instanceof Date ? v : new Date(v);
	const diffSec = (Date.now() - d.getTime()) / 1000;
	if (diffSec < 60) return `${Math.floor(diffSec)}s ago`;
	if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
	if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
	return `${Math.floor(diffSec / 86400)}d ago`;
}

export function pnlClass(v: string | number | null | undefined): string {
	if (v == null || v === '') return 'text-fg-muted';
	const n = typeof v === 'string' ? parseFloat(v) : v;
	if (n > 0) return 'text-(--color-accent)';
	if (n < 0) return 'text-(--color-danger)';
	return 'text-(--color-fg-muted)';
}
