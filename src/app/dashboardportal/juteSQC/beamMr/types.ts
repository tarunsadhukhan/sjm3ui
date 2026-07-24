// Types for the Beam MR% SQC page.
// Backend contract: sjmvowerp3be/src/juteSQC/beam_mr.py (R-08-18).

export type SpellOption = {
	spell_id: number;
	spell_code: string;
	spell_name?: string | null;
};

export type MachineOption = {
	machine_id: number;
	machine_name: string | null;
	mech_code: string | null;
};

export type ClothOption = {
	item_id: number;
	item_code: string | null;
	item_name: string;
};

export type BeamMrSetup = {
	spells: SpellOption[];
	machines: MachineOption[];
	cloth_qualities: ClothOption[];
	// quality_group -> default std MR% (HESSIAN 16, SACKING 20); editable on the form.
	std_mr_by_group: Record<string, number>;
	readings_per_set: number;
};

export type BeamMrByDateRow = {
	beam_mr_id: number;
	quality_group: string;
	mc_id: number | null;
	machine_name: string | null;
	mech_code: string | null;
	item_id: number | null;
	item_name: string | null;
	spell_id: number | null;
	spell_code: string | null;
	readings: number[];
	avg_mr: number | null;
	std_mr_pct: number | null;
	deviation: number | null;
};

export type BeamMrGroupSummary = {
	quality_group: string;
	overall_avg_mr: number | null;
	std_mr_pct: number | null;
	machine_count: number;
};

export type BeamMrTableRow = {
	beam_mr_id: number;
	entry_date: string | null;
	quality_group: string;
	spell_id: number | null;
	spell_code: string | null;
	mc_id: number | null;
	machine_name: string | null;
	mech_code: string | null;
	item_id: number | null;
	item_name: string | null;
	calc_avg_mr: number | string | null;
	std_mr_pct: number | string | null;
	branch_id: number | null;
	updated_date_time: string | null;
};
