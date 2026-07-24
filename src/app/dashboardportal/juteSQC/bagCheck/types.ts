// Server contract: e:\sjm\sjmvowerp3be\src\juteSQC\bag_check.py

export type BagType = { item_id: number; item_code: string | null; item_name: string | null };

export type BagCheckSetup = {
	bag_types: BagType[];
	default_std_mr_pct: number;
};

/** One per-bag detail row as returned by get_bag_check_by_date. */
export type BagCheckBagRow = {
	sl_no: number | null;
	length_cm: number | null;
	width_cm: number | null;
	ends_dm: number | null;
	picks_dm: number | null;
	mr_pct: number | null;
	bag_wt_gm: number | null;
	stitch_dm: number | null;
	corr_wt_gm: number | null;
	defects: string | null;
};

export type BagCheckColStats = {
	avg: number | null;
	stdev: number | null;
	cv_pct: number | null;
	min: number | null;
	max: number | null;
};

/** The 8 numeric columns aggregated server-side in by_date. */
export type BagCheckAggCol =
	| "length_cm"
	| "width_cm"
	| "ends_dm"
	| "picks_dm"
	| "mr_pct"
	| "bag_wt_gm"
	| "stitch_dm"
	| "corr_wt_gm";

export type BagCheckBlock = {
	bag_check_id: number;
	entry_date: string | null;
	branch_id: number | null;
	item_id: number | null;
	item_code: string | null;
	item_name: string | null;
	bag_type_label: string | null;
	vendor_name: string | null;
	id_code: string | null;
	std_bag_weight: number | null;
	std_length: number | null;
	std_width: number | null;
	std_ends: number | null;
	std_picks: number | null;
	std_stitch: number | null;
	std_mr_pct: number | null;
	bags: BagCheckBagRow[];
	aggregates: Record<BagCheckAggCol, BagCheckColStats>;
	obs_hy_lt_pct: number | null;
	corr_hy_lt_pct: number | null;
};

export type BagCheckTableRow = {
	bag_check_id: number;
	entry_date: string | null;
	branch_id: number | null;
	item_id: number | null;
	item_name: string | null;
	item_code: string | null;
	bag_type_label: string | null;
	vendor_name: string | null;
	id_code: string | null;
	std_bag_weight: number | null;
	std_length: number | null;
	std_width: number | null;
	std_ends: number | null;
	std_picks: number | null;
	std_stitch: number | null;
	std_mr_pct: number | null;
	bag_count: number | null;
	avg_bag_wt: number | null;
	avg_corr_wt: number | null;
	bag_wt_stdev: number | null;
	bag_wt_cv_pct: number | null;
	obs_hy_lt_pct: number | null;
	corr_hy_lt_pct: number | null;
};

export function fmt(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

export function bagTypeLabelOf(row: {
	item_name?: string | null;
	item_code?: string | null;
	bag_type_label?: string | null;
}): string {
	return row.item_name ?? row.bag_type_label ?? row.item_code ?? "—";
}
