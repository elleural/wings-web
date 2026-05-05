/**
 * /pump-rider — paper-trade watcher for the pump.fun pump-rider strategy.
 *
 * Reads the synced rows from `pump_rider_positions` (populated by
 * copycat's pump_rider_sync worker via POST /api/v1/pump-rider-positions).
 *
 * Shows: open positions, recent closes, daily totals (gross + fee-adjusted),
 * win-rate, P&L distribution, and the loser anatomy you'd want to see
 * before deciding to flip to real money.
 */
import { db, schema } from '$lib/server/db';
import { desc, eq, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

const PUMPFUN_FEE_BPS = 100; // 1% per swap, applied to entry + exit
const SOL_USD = 150; // rough display rate

interface DailyRow {
	day: string;
	n_trades: number | string;
	wins: number | string;
	losses: number | string;
	tp_fired: number | string;
	peak_drop: number | string;
	stop_loss: number | string;
	max_hold: number | string;
	drain: number | string;
	pnl_lamports: number | string;
	entry_lamports: number | string;
	net_pnl_lamports: number | string;
}

interface AllTimeRow {
	total: number | string;
	wins: number | string;
	losses: number | string;
	pnl_lamports: number | string;
	net_pnl_lamports: number | string;
	loser_avg_lamports: number | string;
	worst_lamports: number | string;
}

export const load: PageServerLoad = async () => {
	try {
		const [openRows, recentRows, dailyRows, missedRows] = await Promise.all([
			db
				.select()
				.from(schema.pumpRiderPositions)
				.where(eq(schema.pumpRiderPositions.status, 'open'))
				.orderBy(desc(schema.pumpRiderPositions.openedAt))
				.limit(50),
			db
				.select()
				.from(schema.pumpRiderPositions)
				.where(eq(schema.pumpRiderPositions.status, 'closed'))
				.orderBy(desc(schema.pumpRiderPositions.closedAt))
				.limit(50),
			// 14-day daily breakdown with fee-adjusted P&L. Drain trades
			// (no exit quote) realize full loss; only entry fee paid.
			db.execute(sql`
				WITH realized AS (
					SELECT
						DATE(opened_at) AS day,
						entry_sol_lamports,
						pnl_lamports,
						exit_reason,
						CASE WHEN pnl_lamports IS NOT NULL THEN pnl_lamports
						     ELSE -entry_sol_lamports END AS realized_pnl_lamports
					FROM pump_rider_positions
					WHERE status = 'closed'
					  AND opened_at >= now() - interval '14 days'
				)
				SELECT
					day,
					count(*)::int AS n_trades,
					(count(*) FILTER (WHERE realized_pnl_lamports > 0))::int AS wins,
					(count(*) FILTER (WHERE realized_pnl_lamports < 0))::int AS losses,
					(count(*) FILTER (WHERE exit_reason = 'take_profit_fast'))::int AS tp_fired,
					(count(*) FILTER (WHERE exit_reason = 'peak_drop'))::int AS peak_drop,
					(count(*) FILTER (WHERE exit_reason = 'stop_loss'))::int AS stop_loss,
					(count(*) FILTER (WHERE exit_reason = 'max_hold'))::int AS max_hold,
					(count(*) FILTER (WHERE exit_reason = 'drain_detected'))::int AS drain,
					COALESCE(SUM(realized_pnl_lamports), 0)::bigint AS pnl_lamports,
					COALESCE(SUM(entry_sol_lamports), 0)::bigint AS entry_lamports,
					-- Net: realized - entry fee - (exit fee iff sell quote existed)
					COALESCE(SUM(
						realized_pnl_lamports
						- (entry_sol_lamports * ${PUMPFUN_FEE_BPS} / 10000)::bigint
						- CASE WHEN pnl_lamports IS NULL THEN 0
						       ELSE ((entry_sol_lamports + pnl_lamports) * ${PUMPFUN_FEE_BPS} / 10000)::bigint END
					), 0)::bigint AS net_pnl_lamports
				FROM realized
				GROUP BY day
				ORDER BY day DESC
			`),
			db
				.select()
				.from(schema.pumpRiderMissed)
				.orderBy(desc(schema.pumpRiderMissed.detectedAt))
				.limit(50)
		]);

		// Aggregate stats — uses the same realized_pnl_lamports expression
		// as the daily breakdown so the top-card and daily rows reconcile.
		// "Realized" PnL: drain/no-quote closes count as full loss (-entry).
		const allTimeAgg = await db.execute(sql`
			WITH realized AS (
				SELECT
					CASE WHEN pnl_lamports IS NOT NULL THEN pnl_lamports
					     ELSE -entry_sol_lamports END AS realized_pnl_lamports,
					entry_sol_lamports
				FROM pump_rider_positions
				WHERE status = 'closed'
			)
			SELECT
				count(*)::int AS total,
				(count(*) FILTER (WHERE realized_pnl_lamports > 0))::int AS wins,
				(count(*) FILTER (WHERE realized_pnl_lamports < 0))::int AS losses,
				COALESCE(SUM(realized_pnl_lamports), 0)::bigint AS pnl_lamports,
				-- Net = realized - fees. Entry fee always paid; exit fee only
				-- when exit quote existed (== pnl_lamports IS NOT NULL).
				COALESCE(SUM(
					realized_pnl_lamports
					- (entry_sol_lamports * ${PUMPFUN_FEE_BPS} / 10000)::bigint
					- CASE WHEN realized_pnl_lamports = -entry_sol_lamports THEN 0
					       ELSE ((entry_sol_lamports + realized_pnl_lamports) * ${PUMPFUN_FEE_BPS} / 10000)::bigint END
				), 0)::bigint AS net_pnl_lamports,
				COALESCE(AVG(realized_pnl_lamports) FILTER (WHERE realized_pnl_lamports < 0), 0)::bigint AS loser_avg_lamports,
				COALESCE(MIN(realized_pnl_lamports), 0)::bigint AS worst_lamports
			FROM realized
		`);

		const daily = ((dailyRows as unknown as { rows?: unknown[] }).rows ?? []) as DailyRow[];
		const allTimeArr = ((allTimeAgg as unknown as { rows?: unknown[] }).rows ?? []) as AllTimeRow[];
		return {
			open: openRows,
			recent: recentRows,
			daily,
			missed: missedRows,
			allTime: allTimeArr[0] ?? null,
			solUsd: SOL_USD,
			feeBps: PUMPFUN_FEE_BPS
		};
	} catch (err) {
		return {
			open: [],
			recent: [],
			daily: [],
			missed: [],
			allTime: null,
			solUsd: SOL_USD,
			feeBps: PUMPFUN_FEE_BPS,
			dbError: err instanceof Error ? err.message : String(err)
		};
	}
};
