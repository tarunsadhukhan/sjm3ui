// Types for the Width & Picks SQC page (R-08-21).
// API contract: vowerp3be src/juteSQC/width_picks.py — {"data": ...} envelope.

export type ClothQuality = {
	item_id: number;
	item_code: string | null;
	item_name: string | null;
};

export type LoomOption = {
	machine_id: number;
	machine_name: string | null;
	mech_code: string | null;
};

export type WidthPicksSetup = {
	cloth_qualities: ClothQuality[];
	looms: LoomOption[];
};

export type WidthPicksReadingRow = {
	loom_id: number | null;
	loom_name: string | null;
	mech_code: string | null;
	width_cm: number | null;
	picks_dm: number | null;
};

export type WidthSummary = {
	avg_width: number | null;
	tol_low: number | null;
	tol_high: number | null;
	remark: string;
};

export type PicksSummary = {
	avg_picks: number | null;
	stdev: number | null;
	max_picks: number | null;
	min_picks: number | null;
	pick_count: number;
};

export type WidthPicksBlock = {
	width_picks_id: number;
	entry_date: string | null;
	branch_id: number | null;
	item_id: number | null;
	item_code: string | null;
	item_name: string | null;
	std_width_cm: number | null;
	std_picks: number | null;
	inspector_name: string | null;
	rows: WidthPicksReadingRow[];
	width_summary: WidthSummary;
	picks_summary: PicksSummary;
};

export type WidthPicksHistoryRow = {
	width_picks_id: number;
	entry_date: string | null;
	branch_id: number | null;
	item_id: number | null;
	item_code: string | null;
	item_name: string | null;
	std_width_cm: number | null;
	std_picks: number | null;
	inspector_name: string | null;
	updated_date_time: string | null;
	loom_count: number;
};
