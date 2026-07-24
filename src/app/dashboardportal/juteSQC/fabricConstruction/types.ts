// Types for the Fabric Construction SQC page (R-08-19).
// API contract: vowerp3be src/juteSQC/fabric_construction.py — {"data": ...} envelope.

export type ClothQuality = {
	item_id: number;
	item_code: string | null;
	item_name: string | null;
};

export type FabricConstructionSetup = {
	cloth_qualities: ClothQuality[];
	default_std_mr_pct: number;
	sample_rows: number;
};

export type FabricConstructionSample = {
	sl: number;
	length_yds: number | null;
	width_cms: number | null;
	ends_per_dm: number | null;
	picks_per_dm: number | null;
	mr_pct: number | null;
	obs_wt_kg: number | null;
	obs_ozs: number | null;
	crcted_oz: number | null;
};

export type FabricConstructionAverages = {
	length_yds: number | null;
	width_cms: number | null;
	ends_per_dm: number | null;
	picks_per_dm: number | null;
	mr_pct: number | null;
	obs_wt_kg: number | null;
	obs_ozs: number | null;
	crcted_oz: number | null;
};

export type FabricConstructionComparison = {
	dimension: string;
	std: number | null;
	actual: number | null;
	deviation: number | null;
};

export type FabricConstructionBlock = {
	fabric_const_id: number;
	entry_date: string | null;
	branch_id: number | null;
	item_id: number | null;
	item_code: string | null;
	item_name: string | null;
	quality_text: string | null;
	std_length_yds: number | null;
	std_width_cms: number | null;
	std_ends_dm: number | null;
	std_picks_dm: number | null;
	std_mr_pct: number | null;
	std_oz_per_yd: number | null;
	rows: FabricConstructionSample[];
	averages: FabricConstructionAverages;
	comparison: FabricConstructionComparison[];
};

export type FabricConstructionHistoryRow = {
	fabric_const_id: number;
	entry_date: string | null;
	branch_id: number | null;
	item_id: number | null;
	item_code: string | null;
	item_name: string | null;
	quality_text: string | null;
	std_length_yds: number | null;
	std_width_cms: number | null;
	std_ends_dm: number | null;
	std_picks_dm: number | null;
	std_mr_pct: number | null;
	std_oz_per_yd: number | null;
	updated_date_time: string | null;
	sample_count: number;
};
