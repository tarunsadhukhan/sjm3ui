/** Row from GET /api/drawingReports/summary */
export interface DrawingSummaryRow {
  report_date: string;
  opening: number;
  production: number;
  issue: number;
  closing: number;
}

/** Row from GET /api/drawingReports/date-production */
export interface DrawingDateProductionRow {
  report_date: string;
  quality_id: number;
  quality_name: string;
  opening: number;
  production: number;
  issue: number;
  closing: number;
}

/** Row from GET /api/drawingReports/date-issue */
export interface DrawingDateIssueRow {
  report_date: string;
  quality_id: number;
  quality_name: string;
  issue: number;
}

/** Row from GET /api/drawingReports/quality-details */
export interface DrawingQualityDetailsRow {
  quality_id: number;
  quality_name: string;
  total_production: number;
  total_issue: number;
  balance: number;
}

/** Row from GET /api/drawingReports/shift-matrix */
export interface DrawingShiftMatrixRow {
  mc_id: number;
  mc_short_name: string;
  shed_type: string | null;
  drg_type: number | null;
  spell_id: number;
  spell_name: string;
  op: number;
  cl: number;
  unit: number;
  eff: number;
}

export interface DrawingReportApiResponse<T> {
  data: T[];
}
