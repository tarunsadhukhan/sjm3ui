import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export type Branch = {
  branch_id: number;
  branch_name: string;
};

export type SelectorOption = {
  tbl_selector_mst_id: number;
  selector_name: string;
};

export type SelectorDetails = {
  tbl_selector_mst_id?: number;
  selector_name?: string;
  selector_shr_name?: string;
  branch_id?: number | string;
  under_selectror_master?: number | null;
  active?: number;
};

type SetupResponse = {
  branches: Branch[];
  selectors: SelectorOption[];
};

type EditSetupResponse = SetupResponse & {
  selector_details?: SelectorDetails;
};

const unwrap = (resp: unknown) =>
  (resp as { data?: unknown })?.data ?? resp;

export const fetchSelectorTable = async (
  coId: string,
  page = 1,
  limit = 10,
  search?: string,
  branchId?: string
) => {
  const qp = new URLSearchParams({
    co_id: coId,
    page: String(page),
    limit: String(limit),
  });
  if (search) qp.append("search", search);
  if (branchId) qp.append("branch_id", branchId);

  const { data, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.SELECTOR_TABLE}?${qp}`,
    "GET"
  );
  return { data, error };
};

export const fetchSelectorCreateSetup = async (coId: string) => {
  const qp = new URLSearchParams({ co_id: coId });
  const { data: raw, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.SELECTOR_CREATE_SETUP}?${qp}`,
    "GET"
  );
  if (error) return { data: null, error };
  const u = unwrap(raw) as Partial<SetupResponse> | undefined;
  const data: SetupResponse = {
    branches: u?.branches || [],
    selectors: u?.selectors || [],
  };
  return { data, error: null };
};

export const fetchSelectorEditSetup = async (coId: string, selectorId: number) => {
  const qp = new URLSearchParams({
    co_id: coId,
    selector_id: String(selectorId),
  });
  const { data: raw, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.SELECTOR_EDIT_SETUP}?${qp}`,
    "GET"
  );
  if (error) return { data: null, error };
  const u = unwrap(raw) as Partial<EditSetupResponse> | undefined;
  const data: EditSetupResponse = {
    branches: u?.branches || [],
    selectors: u?.selectors || [],
    selector_details: u?.selector_details,
  };
  return { data, error: null };
};

export type SelectorPayload = {
  co_id: string;
  branch_id: string;
  selector_name: string;
  selector_shr_name?: string;
  under_selector?: string;
  active?: string;
  updated_by?: string;
};

export const createSelector = async (payload: SelectorPayload) =>
  fetchWithCookie(apiRoutesPortalMasters.SELECTOR_CREATE, "POST", payload);

export const updateSelector = async (
  payload: SelectorPayload & { selector_id: string }
) => fetchWithCookie(apiRoutesPortalMasters.SELECTOR_EDIT, "PUT", payload);
