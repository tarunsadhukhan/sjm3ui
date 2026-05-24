/** Row from GET /api/windingReports/{day-wise|fn-wise|month-wise} */
export interface WindingEmpPeriodRow {
  emp_id: number | null;
  emp_code: string | null;
  emp_name: string | null;
  /** Sortable key: 'YYYY-MM-DD' (day) / 'YYYY-MM-FN1' / 'YYYY-MM' (month) */
  period_key: string;
  /** Display label: 'dd-mm-YYYY' / 'FN1 MMM YYYY' / 'MMM YYYY' */
  period_label: string;
  production: number;
  /** Total scheduled hours for the period (sum of spellhrs) */
  total_hours: number;
}

/** Row from GET /api/windingReports/daily — one per (date, quality, spell) */
export interface WindingDailyRow {
  report_date: string;
  quality_id: number | null;
  quality_name: string | null;
  spell_id: number | null;
  spell_name: string | null;
  /** Distinct winders working that (date, quality, spell) */
  winders: number;
  production: number;
}

export interface WindingReportApiResponse<T> {
  data: T[];
}
