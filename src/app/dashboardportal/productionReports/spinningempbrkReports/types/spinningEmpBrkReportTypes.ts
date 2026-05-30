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
  loss_i: number;
  total_loss: number;
  actual_run: number;
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
