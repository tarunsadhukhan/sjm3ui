// Types for the Humidity Recording SQC page.
// Backend contract: sjmvowerp3be/src/juteSQC/humidity.py.
// One save = one (report_date, dept, round) reading-set of 1..3 spot readings;
// rounds 1=Morning, 2=Noon, 3=Evening; avg temp / avg RH are server-computed.

export type DeptOption = {
	dept_id: number;
	dept_desc: string;
	dept_code: string | null;
};

export type RoundOption = {
	round_no: number;
	label: string;
};

export type HumiditySetup = {
	departments: DeptOption[];
	rounds: RoundOption[];
	spots_per_round: number;
};

export type HumiditySpot = {
	spot_label: string | null;
	reading_time: string | null;
	temp_c: number;
	rh_pct: number;
};

export type HumidityRound = {
	humidity_id: number;
	round_no: number;
	round_label: string | null;
	spots: HumiditySpot[];
	avg_temp: number | null;
	avg_rh: number | null;
	prepared_by: string | null;
};

export type HumidityDeptGroup = {
	dept_id: number | null;
	dept_desc: string | null;
	rounds: HumidityRound[];
};

export type HumidityTableRow = {
	humidity_id: number;
	report_date: string | null;
	branch_id: number | null;
	dept_id: number | null;
	dept_desc: string | null;
	round_no: number;
	avg_temp: number | string | null;
	avg_rh: number | string | null;
	prepared_by: string | null;
	updated_date_time: string | null;
};
