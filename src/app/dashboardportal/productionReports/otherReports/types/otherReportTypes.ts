/** Row from GET /api/otherReports/entries */
export interface OtherEntriesRow {
  report_date: string;
  looms: number;
  cuts: number;
  cutting_hemming_bdl: number;
  heracle_bdl: number;
  branding: number;
  h_sewer_bdl: number;
  bales_production: number;
  bales_issue: number;
}

export interface OtherReportApiResponse<T> {
  data: T[];
}
