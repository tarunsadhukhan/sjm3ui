import { fetchWithCookie } from "./apiClient2";
import { apiRoutesPortalMasters } from "./api";
import type {
  SpinningEmpBrkRow,
  SpinningEmpBrkReportApiResponse,
  ShiftOption,
} from "@/app/dashboardportal/productionReports/spinningempbrkReports/types/spinningEmpBrkReportTypes";

export async function fetchSpinningEmpBrkDetail(
  branchId: number,
  fromDate: string,
  toDate: string,
  shiftId?: number | null,
): Promise<SpinningEmpBrkRow[]> {
  const params = new URLSearchParams({
    branch_id: String(branchId),
    from_date: fromDate,
    to_date: toDate,
  });
  if (shiftId != null) params.append("shift_id", String(shiftId));
  const url = `${apiRoutesPortalMasters.SPINNING_EMP_BRK_REPORT_DETAIL}?${params.toString()}`;
  const result = await fetchWithCookie<SpinningEmpBrkReportApiResponse>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch spinning emp-brk report");
  }
  return result.data.data;
}

interface ShiftTableResponse {
  data: Array<{ shift_id: number; shift_name: string | null }>;
}

export async function fetchShiftOptions(branchId: number): Promise<ShiftOption[]> {
  const params = new URLSearchParams({
    branch_id: String(branchId),
    page: "1",
    limit: "1000",
  });
  const url = `${apiRoutesPortalMasters.SHIFT_TABLE}?${params.toString()}`;
  const result = await fetchWithCookie<ShiftTableResponse>(url);
  if (result.error || !result.data) {
    throw new Error(result.error ?? "Failed to fetch shifts");
  }
  return (result.data.data ?? []).map((s) => ({
    shift_id: s.shift_id,
    shift_name: s.shift_name ?? String(s.shift_id),
  }));
}
