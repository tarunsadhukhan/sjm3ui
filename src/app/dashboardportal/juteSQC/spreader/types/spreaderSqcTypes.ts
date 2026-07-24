// Types for the Spreader SQC page — R-08-04 Roll Weight + R-08-03 Sliver Weight
// tabs. Single type-definition file per module (prevents circular deps).
// Shapes mirror the backend routers src/juteSQC/spreader_roll_wt.py and
// src/juteSQC/spreader_sliver_wt.py (the source of truth).

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
	/** Snapshot standard roll weight — returned on the roll-weight setup only. */
	wt_per_roll?: number | null;
};

export type QualityOption = {
	item_id: number;
	item_name?: string | null;
	item_code?: string | null;
};

/** get_spreader_{roll,sliver}_wt_setup → data. `entries` is unused (we use the by-date endpoint). */
export type SpreaderSetup = {
	spells: SpellOption[];
	machines: MachineOption[];
	qualities: QualityOption[];
};

/**
 * One saved R-08-04 roll-weight sample (by_date / by_id shape).
 * History-table rows omit the readings + band arrays (hence optional).
 */
export type RollWtRow = {
	spreader_roll_wt_id: number;
	co_id: number;
	branch_id: number | null;
	entry_date: string | null;
	spell_id: number | null;
	spell_code: string | null;
	mc_id: number | null;
	machine_name: string | null;
	mech_code: string | null;
	item_id: number | null;
	jute_quality: string | null;
	item_code: string | null;
	feeder_name: string | null;
	roll_weights?: number[] | null;
	mr_pcts?: number[] | null;
	std_mr_pct: number | null;
	calc_avg_mr_pct: number | null;
	calc_avg_obs: number | null;
	calc_avg_corr: number | null;
	calc_stdev_obs: number | null;
	calc_stdev_corr: number | null;
	/** Stored as a RATIO (stdev_corr / avg_corr), NOT x100 — multiply by 100 for display. */
	calc_cv_pct: number | null;
	band_counts_obs?: number[] | null;
	band_counts_corr?: number[] | null;
	updated_date_time?: string | null;
};

/**
 * One saved R-08-03 sliver-weight sample (variable 1-12 readings, no bands).
 * History-table rows omit the readings arrays.
 */
export type SliverWtRow = {
	spreader_sliver_wt_id: number;
	co_id: number;
	branch_id: number | null;
	entry_date: string | null;
	spell_id: number | null;
	spell_code: string | null;
	category: string | null;
	mc_id: number | null;
	machine_name: string | null;
	mech_code: string | null;
	item_id: number | null;
	jute_quality: string | null;
	item_code: string | null;
	sample_length_yds: number | null;
	weight_basis: string | null;
	observed_weights?: number[] | null;
	mr_pcts?: number[] | null;
	std_mr_pct: number | null;
	calc_avg_obs: number | null;
	calc_avg_corr: number | null;
	calc_avg_mr: number | null;
	calc_stdev: number | null;
	/** Stored as a RATIO (stdev / avg_corr), NOT x100 — multiply by 100 for display. */
	calc_cv_pct: number | null;
	updated_date_time?: string | null;
};

/** get_spreader_{roll,sliver}_wt_by_date → data */
export type RollWtByDateResponse = { readings: RollWtRow[] };
export type SliverWtByDateResponse = { readings: SliverWtRow[] };

/** get_spreader_{roll,sliver}_wt_table response body (page is 1-based server-side). */
export type PagedResponse<T> = {
	data: T[];
	total: number;
	page: number;
	page_size: number;
};

/** POST create_spreader_roll_wt body (exactly 10 paired readings). */
export type RollWtCreatePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	spell_id: number | null;
	mc_id: number | null;
	item_id: number | null;
	feeder_name: string | null;
	roll_weights: number[];
	mr_pcts: number[];
};

/** POST create_spreader_sliver_wt body (1-12 paired readings). */
export type SliverWtCreatePayload = {
	co_id: number;
	branch_id: number;
	entry_date: string;
	spell_id: number | null;
	category: string | null;
	mc_id: number | null;
	item_id: number | null;
	sample_length_yds: number | null;
	weight_basis: string | null;
	observed_weights: number[];
	mr_pcts: number[];
};

export const ROLL_WT_SAMPLE_SIZE = 10;
export const SLIVER_WT_MAX_READINGS = 12;
/** Backend defaults (spreader_sliver_wt.py) — prefilled, operator-editable. */
export const SLIVER_DEFAULT_SAMPLE_LENGTH_YDS = 5;
export const SLIVER_DEFAULT_WEIGHT_BASIS = "LB/100YDS";
/**
 * Labels for the 6 weight buckets from the DEFAULT band edges 55/60/65/70/75.
 * Band edges are snapshotted per machine server-side but are NOT returned on
 * saved rows, so machine-specific edges may differ from these labels.
 */
export const DEFAULT_BAND_LABELS = ["≤55", "55–60", "60–65", "65–70", "70–75", ">75"] as const;
