// Server contract: e:\sjm\sjmvowerp3be\src\juteSQC\bag_weight.py

export type BagType = { item_id: number; item_code: string | null; item_name: string | null };

export type BagWeightSetup = {
	bag_types: BagType[];
	default_std_mr_pct: number;
	max_rows: number;
};

/**
 * One inspected bag as returned by get_bag_weight_by_date (corr re-derived server-side).
 * length/width/ends/picks/stitch/remarks mirror the paper R-08-23 sheet and are recorded
 * only — no calculation reads them.
 */
export type BagWeightReading = {
	mr: number | null;
	obs: number | null;
	corr: number | null;
	length?: number | null;
	width?: number | null;
	ends?: number | null;
	picks?: number | null;
	stitch?: number | null;
	remarks?: string | null;
};

export type BagWeightBlock = {
	bag_weight_id: number;
	item_id: number | null;
	item_name: string | null;
	item_code: string | null;
	bag_type_label: string | null;
	std_length_cm: number | null;
	std_width_cm: number | null;
	std_bag_weight: number | null;
	std_mr_pct: number | null;
	above_wt_gm: number | null;
	readings: BagWeightReading[];
	avg_mr: number | null;
	avg_obs: number | null;
	avg_corr: number | null;
	obs_stdev: number | null;
	obs_cv_pct: number | null;
	obs_hy_lt_pct: number | null;
	corr_hy_lt_pct: number | null;
	above_pct: number | null;
};

export type BagWeightTableRow = {
	bag_weight_id: number;
	entry_date: string | null;
	branch_id: number | null;
	item_id: number | null;
	item_name: string | null;
	item_code: string | null;
	bag_type_label: string | null;
	std_length_cm: number | null;
	std_width_cm: number | null;
	std_bag_weight: number | null;
	std_mr_pct: number | null;
	above_wt_gm: number | null;
	avg_mr: number | null;
	avg_obs: number | null;
	avg_corr: number | null;
	obs_stdev: number | null;
	obs_cv_pct: number | null;
	obs_hy_lt_pct: number | null;
	corr_hy_lt_pct: number | null;
	above_pct: number | null;
};
