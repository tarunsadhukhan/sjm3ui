import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";
import type {
  AssortingEntryRow,
  AssortingReportApiResponse,
} from "@/app/dashboardportal/productionReports/assortingReports/types/assortingReportTypes";

export async function fetchAssortingEntries(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<AssortingEntryRow[]> {
  const query = new URLSearchParams({
    branch_id: String(branchId),
    from_date: fromDate,
    to_date: toDate,
  }).toString();
  const url = `${apiRoutesPortalMasters.ASSORTING_REPORT_ENTRIES}?${query}`;
  const result =
    await fetchWithCookie<AssortingReportApiResponse<AssortingEntryRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch assorting entries report");
  }
  return result.data.data;
}
