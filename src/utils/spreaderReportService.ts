import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";
import type {
  SpreaderSummaryRow,
  SpreaderDateProductionRow,
  SpreaderDateIssueRow,
  SpreaderQualityDetailsRow,
  SpreaderReportApiResponse,
} from "@/app/dashboardportal/productionReports/spreaderReports/types/spreaderReportTypes";

function buildQuery(branchId: number, fromDate: string, toDate: string): string {
  return new URLSearchParams({
    branch_id: String(branchId),
    from_date: fromDate,
    to_date: toDate,
  }).toString();
}

export async function fetchSpreaderSummaryReport(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<SpreaderSummaryRow[]> {
  const url = `${apiRoutesPortalMasters.SPREADER_REPORT_SUMMARY}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<SpreaderReportApiResponse<SpreaderSummaryRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch spreader summary report");
  }
  return result.data.data;
}

export async function fetchSpreaderDateProductionReport(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<SpreaderDateProductionRow[]> {
  const url = `${apiRoutesPortalMasters.SPREADER_REPORT_DATE_PRODUCTION}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<SpreaderReportApiResponse<SpreaderDateProductionRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch spreader date-wise production report");
  }
  return result.data.data;
}

export async function fetchSpreaderDateIssueReport(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<SpreaderDateIssueRow[]> {
  const url = `${apiRoutesPortalMasters.SPREADER_REPORT_DATE_ISSUE}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<SpreaderReportApiResponse<SpreaderDateIssueRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch spreader date-wise issue report");
  }
  return result.data.data;
}

export async function fetchSpreaderQualityDetailsReport(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<SpreaderQualityDetailsRow[]> {
  const url = `${apiRoutesPortalMasters.SPREADER_REPORT_QUALITY_DETAILS}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<SpreaderReportApiResponse<SpreaderQualityDetailsRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch spreader quality-wise details report");
  }
  return result.data.data;
}
