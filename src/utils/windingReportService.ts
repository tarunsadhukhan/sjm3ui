import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";
import type {
  WindingEmpPeriodRow,
  WindingDailyRow,
  WindingReportApiResponse,
} from "@/app/dashboardportal/productionReports/windingReports/types/windingReportTypes";

function buildQuery(branchId: number, fromDate: string, toDate: string): string {
  return new URLSearchParams({
    branch_id: String(branchId),
    from_date: fromDate,
    to_date: toDate,
  }).toString();
}

async function fetchWindingPeriod(
  url: string,
  errorLabel: string,
): Promise<WindingEmpPeriodRow[]> {
  const result = await fetchWithCookie<WindingReportApiResponse<WindingEmpPeriodRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? `Failed to fetch ${errorLabel}`);
  }
  return result.data.data;
}

export async function fetchWindingDayWise(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<WindingEmpPeriodRow[]> {
  const url = `${apiRoutesPortalMasters.WINDING_REPORT_DAY_WISE}?${buildQuery(branchId, fromDate, toDate)}`;
  return fetchWindingPeriod(url, "winding day-wise report");
}

export async function fetchWindingFnWise(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<WindingEmpPeriodRow[]> {
  const url = `${apiRoutesPortalMasters.WINDING_REPORT_FN_WISE}?${buildQuery(branchId, fromDate, toDate)}`;
  return fetchWindingPeriod(url, "winding fn-wise report");
}

export async function fetchWindingMonthWise(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<WindingEmpPeriodRow[]> {
  const url = `${apiRoutesPortalMasters.WINDING_REPORT_MONTH_WISE}?${buildQuery(branchId, fromDate, toDate)}`;
  return fetchWindingPeriod(url, "winding month-wise report");
}

export async function fetchWindingDaily(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<WindingDailyRow[]> {
  const url = `${apiRoutesPortalMasters.WINDING_REPORT_DAILY}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<WindingReportApiResponse<WindingDailyRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch winding daily report");
  }
  return result.data.data;
}
