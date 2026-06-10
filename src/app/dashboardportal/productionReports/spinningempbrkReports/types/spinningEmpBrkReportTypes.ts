/** Row from GET /api/spinningEmpBrkReports/detail — one per (date, shift, frame). */
export interface SpinningEmpBrkRow {
  report_date: string;
  spell_id: number | null;
  shift_name: string | null;
  /** "Employee's I'd" — emp_code; null/#N/A when no spinner assigned. */
  emp_code: string | null;
  emp_name: string | null;
  frame_no: string | null;
  count: number | null;
  power_min: number;
  loss_d: number;
  loss_m: number;
  loss_e: number;
  /** "Other" loss minutes — displayed as the "O" column. */
  loss_i: number;
  /** Idle loss minutes — displayed as the "IDLE" column. */
  loss_idle: number;
  total_loss: number;
  actual_run: number;
  /** Run minutes as recorded in the VVFD transaction (mc_runs_time). */
  As_per_VVfd: number | null;
  machine_doff: number;
  doff_wt: number;
  rpm: number;
  /** Production at 100% efficiency. */
  eff_100: number;
  /** Actual efficiency % = doff_wt / eff_100 * 100. */
  actual_eff: number;
}

export interface SpinningEmpBrkReportApiResponse {
  data: SpinningEmpBrkRow[];
}

/** Shift option for the report filter dropdown. */
export interface ShiftOption {
  shift_id: number;
  shift_name: string;
}
