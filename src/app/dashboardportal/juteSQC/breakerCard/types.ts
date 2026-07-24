// Types for the Breaker Card SQC page (R-08-05/06/07 — coarse side SWT).
// Shapes mirror the backend contract in vowerp3be/src/juteSQC/breaker_card_swt.py.

export type SpellOption = {
	spell_id: number;
	spell_code: string;
	spell_name?: string | null;
	working_hours?: number | null;
};

export type MachineOption = {
	machine_id: number;
	machine_name: string;
	mech_code?: string | null;
	dept_id?: number | null;
	dept_name?: string | null;
	branch_id?: number | null;
};

export type BatchOption = {
	batch_plan_id: number;
	plan_name?: string | null;
	branch_id?: number | null;
	line_qty?: number;
};

export type BreakerCardSetup = {
	spells: SpellOption[];
	machines: MachineOption[];
	batches: BatchOption[];
};

/** One saved reading-set as returned by by_date / by_id (readings JSON parsed server-side). */
export type BreakerCardRow = {
	breaker_card_swt_id: number;
	co_id: number;
	branch_id?: number | null;
	entry_date?: string | null;
	spell_id?: number | null;
	spell_code?: string | null;
	mc_id?: number | null;
	machine_name?: string | null;
	mech_code?: string | null;
	item_id?: number | null;
	jute_quality?: string | null;
	item_code?: string | null;
	batch_plan_id?: number | null;
	batch_plan_name?: string | null;
	card_side?: string | null;
	weights?: number[] | null;
	mr_pcts?: number[] | null;
	std_mr_pct?: number | null;
	std_cv_low?: number | null;
	std_cv_high?: number | null;
	calc_wt?: number | null;
	calc_mr_pct?: number | null;
	calc_corr_wt?: number | null;
	calc_sdev?: number | null;
	calc_cv_pct?: number | null;
	cv_within_band?: number | null;
};

/** Per-batch grand-average block recomputed at read (pooled corrected cuts). */
export type GrandAverage = {
	batch_plan_id: number;
	batch_plan_name?: string | null;
	row_count: number;
	grand_obs?: number | null;
	grand_mr_pct?: number | null;
	grand_corr_wt?: number | null;
	grand_cv_pct?: number | null;
	std_cv_high?: number | null;
	cv_within_band?: number | null;
};

export type ByDateResponse = {
	rows: BreakerCardRow[];
	grand_averages: GrandAverage[];
};

/** Paginated history row — same columns minus the readings JSON. */
export type BreakerCardTableRow = Omit<BreakerCardRow, "weights" | "mr_pcts"> & {
	updated_date_time?: string | null;
};

// ─── Shared display helpers ─────────────────────────────────────────────────

/** Fixed-decimal display for possibly-null / string-serialized numerics. */
export function fmt(v: number | string | null | undefined, digits = 2): string {
	if (v == null || v === "") return "—";
	const n = Number(v);
	return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

/** CV is stored as a ratio; render ×100 with a % suffix. */
export function fmtCv(v: number | string | null | undefined): string {
	if (v == null || v === "") return "—";
	const n = Number(v);
	return Number.isFinite(n) ? `${(n * 100).toFixed(2)}%` : "—";
}
