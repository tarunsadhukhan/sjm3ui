import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";
import type {
  SpinningProductionEffRow,
  SpinningMcDateRow,
  SpinningEmpDateRow,
  SpinningFrameRunningRow,
  SpinningRunningHoursEffRow,
  SpinningReportApiResponse,
} from "@/app/dashboardportal/productionReports/spinningReports/types/spinningReportTypes";

function buildQuery(branchId: number, fromDate: string, toDate: string): string {
  return new URLSearchParams({
    branch_id: String(branchId),
    from_date: fromDate,
    to_date: toDate,
  }).toString();
}

export async function fetchSpinningProductionEff(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<SpinningProductionEffRow[]> {
  const url = `${apiRoutesPortalMasters.SPINNING_REPORT_PRODUCTION_EFF}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<SpinningReportApiResponse<SpinningProductionEffRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch spinning production/eff report");
  }
  return result.data.data;
}

export async function fetchSpinningMcDate(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<SpinningMcDateRow[]> {
  const url = `${apiRoutesPortalMasters.SPINNING_REPORT_MC_DATE}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<SpinningReportApiResponse<SpinningMcDateRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch spinning mc-date report");
  }
  return result.data.data;
}

export async function fetchSpinningEmpDate(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<SpinningEmpDateRow[]> {
  const url = `${apiRoutesPortalMasters.SPINNING_REPORT_EMP_DATE}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<SpinningReportApiResponse<SpinningEmpDateRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch spinning emp-date report");
  }
  return result.data.data;
}

export async function fetchSpinningFrameRunning(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<SpinningFrameRunningRow[]> {
  const url = `${apiRoutesPortalMasters.SPINNING_REPORT_FRAME_RUNNING}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<SpinningReportApiResponse<SpinningFrameRunningRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch spinning frame-running report");
  }
  return result.data.data;
}

export async function fetchSpinningRunningHoursEff(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<SpinningRunningHoursEffRow[]> {
  const url = `${apiRoutesPortalMasters.SPINNING_REPORT_RUNNING_HOURS_EFF}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<SpinningReportApiResponse<SpinningRunningHoursEffRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch spinning running-hours-eff report");
  }
  return result.data.data;
}
