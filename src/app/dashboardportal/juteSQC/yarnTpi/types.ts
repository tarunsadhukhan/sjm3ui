// Types for the R-08-17 Yarn TPI & TPI CV% SQC page.
// Mirrors backend /api/juteSQC/yarn_tpi_* endpoints (yarn_tpi.py). Backend returns
// floats already; dates are 'YYYY-MM-DD' strings; stats are computed server-side.

export type TpiMachine = {
	machine_id: number;
	machine_name: string;
	mech_code?: string | null;
	machine_type_name?: string | null;
	dept_id?: number | null;
	dept_name?: string | null;
	branch_id?: number | null;
};

export type TpiYarnItem = {
	item_id: number;
	item_code: string;
	item_name?: string | null;
	std_count?: number | null;
	std_mr_pct?: number | null;
};

export type TpiReading = { reading_no: number | null; reading_val: number | null };

// Server-computed at read from the stored readings (RAW, no MR correction).
export type TpiStats = {
	avg_tpi: number | null;
	std_dev: number | null;
	cv_pct: number | null;
	min_tpi: number | null;
	max_tpi: number | null;
	std_tpi: number | null;
	tpi_diff: number | null;
	n: number;
};

// One saved study = machine + yarn + 20 flat readings + header snapshots.
export type TpiGroup = {
	yarn_tpi_id: number;
	co_id: number;
	branch_id?: number | null;
	entry_date: string | null;
	mc_id?: number | null;
	mech_code?: string | null;
	machine_name?: string | null;
	item_id?: number | null;
	item_code?: string | null;
	item_name?: string | null;
	count_lbs: number | null;
	std_tpi: number | null;
	tp_value: number | null;
	prepared_by?: string | null;
	readings: TpiReading[];
	stats: TpiStats;
};

export type TpiSetup = {
	machines: TpiMachine[];
	yarn_items: TpiYarnItem[];
	groups: TpiGroup[];
};

// One row of the paginated yarn_tpi_table endpoint (header only, no stats).
export type TpiTableRow = {
	yarn_tpi_id: number;
	entry_date: string | null;
	mc_id?: number | null;
	machine_name?: string | null;
	mech_code?: string | null;
	item_id?: number | null;
	yarn_quality?: string | null;
	item_code?: string | null;
	count_lbs?: number | null;
	std_tpi?: number | null;
	tp_value?: number | null;
	prepared_by?: string | null;
};

// Backend requires the readings array length to be exactly 20 (cells may be null).
export const TPI_SAMPLE_SIZE = 20;
