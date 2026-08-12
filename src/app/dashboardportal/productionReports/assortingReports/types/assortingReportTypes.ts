/** Row from GET /api/assortingReports/entries */
export interface AssortingEntryRow {
  report_date: string;
  shed_type: string | null;
  mc_id: number | null;
  mc_name: string | null;
  selector_id: number | null;
  selector_name: string | null;
  quality_id: number | null;
  quality_name: string | null;
  trolly_no: string | null;
  gross_wt: number;
  tare_wt: number;
  net_wt: number;
}

export interface AssortingReportApiResponse<T> {
  data: T[];
}
