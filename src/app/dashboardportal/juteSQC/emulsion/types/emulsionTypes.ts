// Types for the Emulsion SQC page (R-08-02). Shapes mirror the backend router
// src/juteSQC/emulsion.py (the source of truth). One save = ONE date's recipe
// row (no readings array / StDev / CV). theoretical_oil_pct and oil_pct_status
// are computed server-side on READ and never stored.

export type EmulsionMachineOption = {
	machine_id: number;
	machine_name: string;
	mech_code?: string | null;
};

/** emulsion_create_setup → data */
export type EmulsionSetup = {
	machines: EmulsionMachineOption[];
	default_oil_pct_low: number;
	default_oil_pct_high: number;
	default_tank_capacity: number;
};

/**
 * Nullable additive columns copied verbatim onto the row — key list matches the
 * backend _ADDITIVE_FIELDS tuple (minus the non-numeric trailing fields which
 * are typed explicitly on the row/payload).
 */
export const ADDITIVE_FIELDS = [
	{ key: "adco_used_ml", label: "ADCO Used (ml)" },
	{ key: "eco_fin_used_ltr", label: "Eco Fin Used (ltr)" },
	{ key: "p40_gms", label: "P-40 (gms)" },
	{ key: "efjl_kg", label: "EFJL (kg)" },
	{ key: "glycerine_gms", label: "Glycerine (gms)" },
	{ key: "castrol_oil", label: "Castrol Oil" },
	{ key: "diesel_ltr", label: "Diesel (ltr)" },
	{ key: "citric_acid_ltr", label: "Citric Acid (ltr)" },
	{ key: "enzyme_gms", label: "Enzyme (gms)" },
	{ key: "treated_water_ltr", label: "Treated Water (ltr)" },
	{ key: "rbo_ltr", label: "RBO (ltr)" },
	{ key: "jbo_ltr", label: "JBO (ltr)" },
	{ key: "molasses_kg", label: "Molasses (kg)" },
	{ key: "urea_kg", label: "Urea (kg)" },
	{ key: "biochemical_kg", label: "Biochemical (kg)" },
	{ key: "jsp66", label: "JSP-66" },
	{ key: "feel_free_good_ve_kg", label: "Feel Free Good VE (kg)" },
] as const;

export type AdditiveKey = (typeof ADDITIVE_FIELDS)[number]["key"];

export type EmulsionStatus = "OK" | "LOW" | "HIGH";

/**
 * One emulsion recipe row. By-date rows carry every stored column + the two
 * computed fields; history-table rows carry only the summary subset (hence the
 * optionals).
 */
export type EmulsionRow = {
	emulsion_id: number;
	co_id?: number;
	branch_id?: number | null;
	entry_date: string | null;
	mc_id: number | null;
	machine_name?: string | null;
	oil_used_ltr: number | null;
	tank_capacity_ltr: number | null;
	oil_pct_in_emulsion: number | null;
	std_oil_pct_low: number | null;
	std_oil_pct_high: number | null;
	spreader_rolls_made?: number | null;
	others?: string | null;
	prepared_by?: string | null;
	/** Computed on read: oil_used / tank_capacity * 100 (reference only). */
	theoretical_oil_pct?: number | null;
	/** Computed on read from the snapshotted band. Display-only. */
	oil_pct_status?: EmulsionStatus | null;
	updated_date_time?: string | null;
} & Partial<Record<AdditiveKey, number | null>>;

/** get_emulsion_by_date → data */
export type EmulsionByDateResponse = { rows: EmulsionRow[] };

/** POST create_emulsion body. NOTE: the response is NOT {"data": ...}-wrapped. */
export type EmulsionCreatePayload = {
	co_id: number;
	branch_id: number | null;
	entry_date: string;
	mc_id: number | null;
	oil_used_ltr: number;
	tank_capacity_ltr: number;
	oil_pct_in_emulsion: number;
	std_oil_pct_low: number;
	std_oil_pct_high: number;
	spreader_rolls_made: number | null;
	others: string | null;
	prepared_by: string | null;
} & Record<AdditiveKey, number | null>;
