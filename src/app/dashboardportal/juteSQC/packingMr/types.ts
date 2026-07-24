// Types for the Packing MR% SQC page.
// Backend contract: sjmvowerp3be/src/juteSQC/packing_mr.py (R-08-25).

export type ClothOption = {
	item_id: number;
	item_code: string | null;
	item_name: string;
};

export type PackingMrSetup = {
	qualities: ClothOption[];
	quality_groups: string[];
	readings_count: number;
};

export type PackingMrByDateColumn = {
	packing_mr_id: number;
	quality_group: string;
	item_id: number | null;
	item_name: string | null;
	quality_label: string | null;
	construction_code: string | null;
	readings: number[];
	avg_mr: number | null;
};

export type PackingMrGroupSummary = {
	quality_group: string;
	// Weighted mean of ALL readings in the group (sum / count), server-computed.
	group_avg_mr: number | null;
	column_count: number;
	reading_count: number;
};

export type PackingMrTableRow = {
	packing_mr_id: number;
	entry_date: string | null;
	quality_group: string;
	item_id: number | null;
	item_name: string | null;
	quality_label: string | null;
	construction_code: string | null;
	avg_mr: number | string | null;
	branch_id: number | null;
	updated_date_time: string | null;
};
