/** Row from GET /api/balesReports/entries */
export interface BalesEntryRow {
  report_date: string;
  quality_id: number | null;
  quality_name: string | null;
  customer_id: number | null;
  customer_name: string | null;
  opening: number;
  production: number;
  issue: number;
  closing: number;
}

export interface BalesReportApiResponse<T> {
  data: T[];
}
