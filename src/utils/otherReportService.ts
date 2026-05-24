import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";
import type {
  OtherEntriesRow,
  OtherReportApiResponse,
} from "@/app/dashboardportal/productionReports/otherReports/types/otherReportTypes";

function buildQuery(branchId: number, fromDate: string, toDate: string): string {
  return new URLSearchParams({
    branch_id: String(branchId),
    from_date: fromDate,
    to_date: toDate,
  }).toString();
}

export async function fetchOtherEntries(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<OtherEntriesRow[]> {
  const url = `${apiRoutesPortalMasters.OTHER_REPORT_ENTRIES}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<OtherReportApiResponse<OtherEntriesRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch other entries report");
  }
  return result.data.data;
}
