// Types for the Fabric Fault SQC page (R-08-28).
// API contract: vowerp3be src/juteSQC/fabric_fault.py — {"data": ...} envelope.

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

export type SpellOption = {
	spell_id: number;
	spell_code: string | null;
};

export type FabricFaultSetup = {
	qualities: ClothQuality[];
	looms: LoomOption[];
	spells: SpellOption[];
	fault_types: string[];
};

export type FabricFaultPiece = {
	fabric_fault_id: number;
	spell_id: number | null;
	spell_code: string | null;
	item_id: number | null;
	item_name: string | null;
	loom_id: number | null;
	loom_name: string | null;
	mech_code: string | null;
	date_of_weaving: string | null;
	remarks: string | null;
	inspector_name: string | null;
	fault_counts: number[];
	piece_total: number;
};

export type FabricFaultByDateData = {
	pieces: FabricFaultPiece[];
	fault_types: string[];
	fault_totals: number[];
	fault_scores: (number | null)[];
	grand_total: number;
	grand_score: number | null;
	pieces_inspected: number;
};

export type FabricFaultHistoryRow = {
	fabric_fault_id: number;
	entry_date: string | null;
	branch_id: number | null;
	item_id: number | null;
	item_name: string | null;
	loom_id: number | null;
	loom_name: string | null;
	spell_code: string | null;
	piece_total: number | null;
	updated_date_time: string | null;
};
