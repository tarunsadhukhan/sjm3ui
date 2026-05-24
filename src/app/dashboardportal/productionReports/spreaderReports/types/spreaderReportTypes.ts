/** Row from GET /api/spreaderReports/summary */
export interface SpreaderSummaryRow {
  report_date: string;
  opening: number;
  production: number;
  issue: number;
  closing: number;
}

/** Row from GET /api/spreaderReports/date-production */
export interface SpreaderDateProductionRow {
  report_date: string;
  quality_id: number;
  quality_name: string;
  opening: number;
  production: number;
  issue: number;
  closing: number;
}

/** Row from GET /api/spreaderReports/date-issue */
export interface SpreaderDateIssueRow {
  report_date: string;
  quality_id: number;
  quality_name: string;
  issue: number;
}

/** Row from GET /api/spreaderReports/quality-details */
export interface SpreaderQualityDetailsRow {
  quality_id: number;
  quality_name: string;
  total_production: number;
  total_issue: number;
  balance: number;
}

export interface SpreaderReportApiResponse<T> {
  data: T[];
}
