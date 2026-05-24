import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";
import type {
  DrawingSummaryRow,
  DrawingDateProductionRow,
  DrawingDateIssueRow,
  DrawingQualityDetailsRow,
  DrawingShiftMatrixRow,
  DrawingReportApiResponse,
} from "@/app/dashboardportal/productionReports/drawingReports/types/drawingReportTypes";

function buildQuery(branchId: number, fromDate: string, toDate: string): string {
  return new URLSearchParams({
    branch_id: String(branchId),
    from_date: fromDate,
    to_date: toDate,
  }).toString();
}

export async function fetchDrawingSummaryReport(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<DrawingSummaryRow[]> {
  const url = `${apiRoutesPortalMasters.DRAWING_REPORT_SUMMARY}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<DrawingReportApiResponse<DrawingSummaryRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch drawing summary report");
  }
  return result.data.data;
}

export async function fetchDrawingDateProductionReport(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<DrawingDateProductionRow[]> {
  const url = `${apiRoutesPortalMasters.DRAWING_REPORT_DATE_PRODUCTION}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<DrawingReportApiResponse<DrawingDateProductionRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch drawing date-wise production report");
  }
  return result.data.data;
}

export async function fetchDrawingDateIssueReport(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<DrawingDateIssueRow[]> {
  const url = `${apiRoutesPortalMasters.DRAWING_REPORT_DATE_ISSUE}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<DrawingReportApiResponse<DrawingDateIssueRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch drawing date-wise issue report");
  }
  return result.data.data;
}

export async function fetchDrawingShiftMatrixReport(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<DrawingShiftMatrixRow[]> {
  const url = `${apiRoutesPortalMasters.DRAWING_REPORT_SHIFT_MATRIX}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<DrawingReportApiResponse<DrawingShiftMatrixRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch drawing shift matrix report");
  }
  return result.data.data;
}

export async function fetchDrawingQualityDetailsReport(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<DrawingQualityDetailsRow[]> {
  const url = `${apiRoutesPortalMasters.DRAWING_REPORT_QUALITY_DETAILS}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<DrawingReportApiResponse<DrawingQualityDetailsRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch drawing machine-wise details report");
  }
  return result.data.data;
}
