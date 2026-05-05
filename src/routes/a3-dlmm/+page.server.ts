/**
 * /a3-dlmm — paper-trade watcher for the A3 (Spot-Wide DLMM LP) strategy.
 *
 * Reads `dlmm_lp_positions` (populated by copycat's a3_dlmm_sync worker via
 * POST /api/v1/dlmm-lp-positions). Richer than the pump-rider page because
 * A3 carries LVR-gate forensics (sigma, fee/lvr rates, fee_multiplier source)
 * — the dashboard explains WHY each position opened, not just what happened.
 */
import { db, schema } from '$lib/server/db';
import { desc, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

interface DailyRow {
	day: string;
	n_trades: number | string;
	wins: number | string;
	losses: number | string;
	total_fees_usd: number | string;
	total_lvr_usd: number | string;
	total_pnl_usd: number | string;
	total_gas_usd: number | string;
}

interface AllTimeRow {
	total: number | string;
	wins: number | string;
	losses: number | string;
	total_fees_usd: number | string;
	total_lvr_usd: number | string;
	total_pnl_usd: number | string;
	total_gas_usd: number | string;
	avg_hold_seconds: number | string;
}

interface LiveTotals {
	open_count: number | string;
	live_unrealized_pnl_usd: number | string;
}

export const load: PageServerLoad = async () => {
	try {
		const [openRows, recentRows, dailyRows] = await Promise.all([
			db
				.select()
				.from(schema.dlmmLpPositions)
				.where(eq(schema.dlmmLpPositions.status, 'open'))
				.orderBy(desc(schema.dlmmLpPositions.openedAt))
				.limit(50),
			db
				.select()
				.from(schema.dlmmLpPositions)
				.where(eq(schema.dlmmLpPositions.status, 'closed'))
				.orderBy(desc(schema.dlmmLpPositions.closedAt))
				.limit(50),
			db.execute(sql`
				SELECT
					DATE(opened_at) AS day,
					count(*)::int AS n_trades,
					(count(*) FILTER (WHERE realized_pnl_usd > 0))::int AS wins,
					(count(*) FILTER (WHERE realized_pnl_usd <= 0 AND status = 'closed'))::int AS losses,
					COALESCE(SUM(realized_fees_usd), 0)::numeric AS total_fees_usd,
					COALESCE(SUM(realized_lvr_usd), 0)::numeric AS total_lvr_usd,
					COALESCE(SUM(realized_pnl_usd), 0)::numeric AS total_pnl_usd,
					COALESCE(SUM(gas_cost_usd), 0)::numeric AS total_gas_usd
				FROM dlmm_lp_positions
				WHERE status = 'closed'
				  AND opened_at >= now() - interval '14 days'
				GROUP BY DATE(opened_at)
				ORDER BY day DESC
			`)
		]);

		const allTimeAgg = await db.execute(sql`
			SELECT
				count(*)::int AS total,
				(count(*) FILTER (WHERE realized_pnl_usd > 0))::int AS wins,
				(count(*) FILTER (WHERE realized_pnl_usd <= 0))::int AS losses,
				COALESCE(SUM(realized_fees_usd), 0)::numeric AS total_fees_usd,
				COALESCE(SUM(realized_lvr_usd), 0)::numeric AS total_lvr_usd,
				COALESCE(SUM(realized_pnl_usd), 0)::numeric AS total_pnl_usd,
				COALESCE(SUM(gas_cost_usd), 0)::numeric AS total_gas_usd,
				COALESCE(AVG(hold_seconds), 0)::numeric AS avg_hold_seconds
			FROM dlmm_lp_positions
			WHERE status = 'closed'
		`);

		const liveAgg = await db.execute(sql`
			SELECT
				count(*)::int AS open_count,
				COALESCE(SUM(realized_pnl_usd), 0)::numeric AS live_unrealized_pnl_usd
			FROM dlmm_lp_positions
			WHERE status = 'open'
		`);

		const daily = ((dailyRows as unknown as { rows?: unknown[] }).rows ?? []) as DailyRow[];
		const allTimeArr = ((allTimeAgg as unknown as { rows?: unknown[] }).rows ?? []) as AllTimeRow[];
		const liveArr = ((liveAgg as unknown as { rows?: unknown[] }).rows ?? []) as LiveTotals[];
		return {
			open: openRows,
			recent: recentRows,
			daily,
			allTime: allTimeArr[0] ?? null,
			live: liveArr[0] ?? null
		};
	} catch (err) {
		return {
			open: [],
			recent: [],
			daily: [],
			allTime: null,
			live: null,
			dbError: err instanceof Error ? err.message : String(err)
		};
	}
};
