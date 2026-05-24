import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";
import type {
  JuteStockReportRow,
  BatchCostReportRow,
  JuteSummaryReportRow,
  JuteDetailsReportRow,
  ReportApiResponse,
} from "@/app/dashboardportal/jutePurchase/reports/types/reportTypes";

export async function fetchJuteStockReport(
  branchId: number,
  date: string,
): Promise<JuteStockReportRow[]> {
  const url = `${apiRoutesPortalMasters.JUTE_REPORT_STOCK}?branch_id=${branchId}&date=${date}`;
  const result = await fetchWithCookie<ReportApiResponse<JuteStockReportRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch jute stock report");
  }
  return result.data.data;
}

export async function fetchBatchCostReport(
  branchId: number,
  date: string,
): Promise<BatchCostReportRow[]> {
  const url = `${apiRoutesPortalMasters.JUTE_REPORT_BATCH_COST}?branch_id=${branchId}&date=${date}`;
  const result = await fetchWithCookie<ReportApiResponse<BatchCostReportRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch batch cost report");
  }
  return result.data.data;
}

export async function fetchJuteSummaryReport(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<JuteSummaryReportRow[]> {
  const qs = new URLSearchParams({
    branch_id: String(branchId),
    from_date: fromDate,
    to_date: toDate,
  });
  const url = `${apiRoutesPortalMasters.JUTE_REPORT_SUMMARY}?${qs}`;
  const result = await fetchWithCookie<ReportApiResponse<JuteSummaryReportRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch jute summary report");
  }
  return result.data.data;
}

export async function fetchJuteDetailsReport(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<JuteDetailsReportRow[]> {
  const qs = new URLSearchParams({
    branch_id: String(branchId),
    from_date: fromDate,
    to_date: toDate,
  });
  const url = `${apiRoutesPortalMasters.JUTE_REPORT_DETAILS}?${qs}`;
  const result = await fetchWithCookie<ReportApiResponse<JuteDetailsReportRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch jute details report");
  }
  return result.data.data;
}
