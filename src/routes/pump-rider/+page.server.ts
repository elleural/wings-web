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
	pnl_lamports: number | string;
	entry_lamports: number | string;
	net_pnl_lamports: number | string;
}

interface AllTimeRow {
	total: number | string;
	wins: number | string;
	losses: number | string;
	pnl_lamports: number | string;
	loser_avg_lamports: number | string;
	worst_lamports: number | string;
}

export const load: PageServerLoad = async () => {
	try {
		const [openRows, recentRows, dailyRows] = await Promise.all([
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
			// 14-day daily breakdown with fee-adjusted P&L
			db.execute(sql`
				SELECT
					DATE(opened_at) AS day,
					count(*)::int AS n_trades,
					(count(*) FILTER (WHERE pnl_lamports > 0))::int AS wins,
					(count(*) FILTER (WHERE pnl_lamports < 0))::int AS losses,
					(count(*) FILTER (WHERE exit_reason = 'tp_fired'))::int AS tp_fired,
					(count(*) FILTER (WHERE exit_reason = 'peak_drop'))::int AS peak_drop,
					(count(*) FILTER (WHERE exit_reason = 'stop_loss'))::int AS stop_loss,
					(count(*) FILTER (WHERE exit_reason = 'max_hold'))::int AS max_hold,
					COALESCE(SUM(pnl_lamports), 0)::bigint AS pnl_lamports,
					COALESCE(SUM(entry_sol_lamports), 0)::bigint AS entry_lamports,
					-- Fee-adjusted: pnl - fee_in - fee_out (each 1% per leg)
					COALESCE(SUM(
						pnl_lamports
						- (entry_sol_lamports * ${PUMPFUN_FEE_BPS} / 10000)::bigint
						- ((entry_sol_lamports + COALESCE(pnl_lamports, 0)) * ${PUMPFUN_FEE_BPS} / 10000)::bigint
					), 0)::bigint AS net_pnl_lamports
				FROM pump_rider_positions
				WHERE status = 'closed'
				  AND opened_at >= now() - interval '14 days'
				GROUP BY DATE(opened_at)
				ORDER BY day DESC
			`)
		]);

		// Aggregate stats
		const allTimeAgg = await db.execute(sql`
			SELECT
				count(*)::int AS total,
				(count(*) FILTER (WHERE pnl_lamports > 0))::int AS wins,
				(count(*) FILTER (WHERE pnl_lamports < 0))::int AS losses,
				COALESCE(SUM(pnl_lamports), 0)::bigint AS pnl_lamports,
				COALESCE(AVG(pnl_lamports) FILTER (WHERE pnl_lamports < 0), 0)::bigint AS loser_avg_lamports,
				COALESCE(MIN(pnl_lamports), 0)::bigint AS worst_lamports
			FROM pump_rider_positions
			WHERE status = 'closed'
		`);

		const daily = ((dailyRows as unknown as { rows?: unknown[] }).rows ?? []) as DailyRow[];
		const allTimeArr = ((allTimeAgg as unknown as { rows?: unknown[] }).rows ?? []) as AllTimeRow[];
		return {
			open: openRows,
			recent: recentRows,
			daily,
			allTime: allTimeArr[0] ?? null,
			solUsd: SOL_USD,
			feeBps: PUMPFUN_FEE_BPS
		};
	} catch (err) {
		return {
			open: [],
			recent: [],
			daily: [],
			allTime: null,
			solUsd: SOL_USD,
			feeBps: PUMPFUN_FEE_BPS,
			dbError: err instanceof Error ? err.message : String(err)
		};
	}
};
