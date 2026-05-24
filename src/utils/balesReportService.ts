import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";
import type {
  BalesEntryRow,
  BalesReportApiResponse,
} from "@/app/dashboardportal/productionReports/balesReports/types/balesReportTypes";

function buildQuery(branchId: number, fromDate: string, toDate: string): string {
  return new URLSearchParams({
    branch_id: String(branchId),
    from_date: fromDate,
    to_date: toDate,
  }).toString();
}

export async function fetchBalesEntries(
  branchId: number,
  fromDate: string,
  toDate: string,
): Promise<BalesEntryRow[]> {
  const url = `${apiRoutesPortalMasters.BALES_REPORT_ENTRIES}?${buildQuery(branchId, fromDate, toDate)}`;
  const result = await fetchWithCookie<BalesReportApiResponse<BalesEntryRow>>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch bales entries report");
  }
  return result.data.data;
}
