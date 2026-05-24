/** Row from GET /api/juteReports/stock */
export interface JuteStockReportRow {
  item_grp_id: number;
  item_group_name: string;
  item_id: number;
  item_name: string;
  opening_weight: number;
  receipt_weight: number;
  issue_weight: number;
  closing_weight: number;
  mtd_receipt_weight: number;
  mtd_issue_weight: number;
}

/** Row from GET /api/juteReports/batch-cost */
export interface BatchCostReportRow {
  yarn_type_id: number;
  yarn_type_name: string;
  item_id: number;
  item_name: string;
  item_grp_id: number;
  item_group_name: string;
  planned_weight: number;
  actual_weight: number;
  actual_rate: number;
  issue_value: number;
  variance: number;
}

/** Row from GET /api/juteReports/summary */
export interface JuteSummaryReportRow {
  report_date: string;
  opening: number;
  purchase: number;
  issue: number;
  closing: number;
}

/** Row from GET /api/juteReports/details */
export interface JuteDetailsReportRow {
  report_date: string;
  quality_id: number;
  quality_name: string;
  opening: number;
  purchase: number;
  issue: number;
  closing: number;
}

/** API response wrapper */
export interface ReportApiResponse<T> {
  data: T[];
}

/** Branch option for the selector */
export interface BranchOption {
  branch_id: number;
  branch_name: string;
}
