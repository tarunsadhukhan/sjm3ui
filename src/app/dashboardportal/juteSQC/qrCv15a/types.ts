// Types for the R-08-15A Yarn QR% & CV% Special Purpose SQC page.
// Mirrors backend /api/juteSQC/qr_cv_15a_* endpoints (qr_cv_15a.py). Flat 12-reading
// b/s set (no spindle structure); observed_count + mr_pct are OPERATOR-ENTERED on the
// header; stats are computed server-side at read.

export type QrCv15aMachine = {
	machine_id: number;
	machine_name: string;
	mech_code?: string | null;
	machine_type_name?: string | null;
	dept_id?: number | null;
	dept_name?: string | null;
	branch_id?: number | null;
};

export type QrCv15aYarnItem = {
	item_id: number;
	item_code: string;
	item_name?: string | null;
	std_count?: number | null;
	std_mr_pct?: number | null;
};

export type QrCv15aReading = { reading_no: number | null; reading_val: number | null };

// Server-computed at read — the R-08-15 formula PLUS qr_at_min.
export type QrCv15aStats = {
	max: number | null;
	min: number | null;
	std_dev: number | null;
	avg_bs: number | null;
	qr_pct: number | null;
	cv_pct: number | null;
	qr_at_min: number | null;
	n: number;
};

// One saved test = 3rd-drawing machine + spinning frame + yarn + 12 flat readings.
export type QrCv15aGroup = {
	qr_cv_15a_id: number;
	co_id: number;
	branch_id?: number | null;
	entry_date: string | null;
	drawing_mc_id?: number | null;
	drawing_mech_code?: string | null;
	drawing_machine_name?: string | null;
	mc_id?: number | null;
	mech_code?: string | null;
	machine_name?: string | null;
	item_id?: number | null;
	item_code?: string | null;
	item_name?: string | null;
	observed_count: number | null;
	mr_pct: number | null;
	readings: QrCv15aReading[];
	stats: QrCv15aStats;
};

export type QrCv15aSetup = {
	machines: QrCv15aMachine[];
	yarn_items: QrCv15aYarnItem[];
	groups: QrCv15aGroup[];
};

// One row of the paginated qr_cv_15a_table endpoint (header only, no stats).
export type QrCv15aTableRow = {
	qr_cv_15a_id: number;
	entry_date: string | null;
	drawing_mc_id?: number | null;
	drawing_machine_name?: string | null;
	mc_id?: number | null;
	machine_name?: string | null;
	mech_code?: string | null;
	item_id?: number | null;
	yarn_quality?: string | null;
	item_code?: string | null;
	observed_count?: number | null;
	mr_pct?: number | null;
};

// Backend requires the readings array length to be exactly 12 (cells may be null).
export const QR_CV_15A_SAMPLE_SIZE = 12;
