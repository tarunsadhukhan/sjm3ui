import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export type SpgType = {
  spg_type_mst_id: number;
  spg_type_name: string;
  spg_type_code?: string;
  spg_group_id?: number;
};

export type Branch = {
  branch_id: number;
  branch_name: string;
};

export type SpinningQualityDetails = {
  spg_quality_mst_id?: number;
  spg_quality?: string;
  spg_type_id?: number | string;
  branch_id?: number | string;
  speed?: number | string;
  tpi?: number | string;
  std_count?: number | string;
  no_of_spindles?: number | string;
  frame_type?: string;
  target_eff?: number | string;
};

type SetupResponse = {
  spg_types: SpgType[];
  branches: Branch[];
};

type EditSetupResponse = SetupResponse & {
  spinning_quality_details?: SpinningQualityDetails;
};

const unwrap = (resp: any) => resp?.data ?? resp;

export const fetchSpinningQualityTable = async (
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
    `${apiRoutesPortalMasters.SPINNING_QUALITY_TABLE}?${qp}`,
    "GET"
  );
  return { data, error };
};

export const fetchSpinningQualityCreateSetup = async (coId: string) => {
  const qp = new URLSearchParams({ co_id: coId });
  const { data: raw, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.SPINNING_QUALITY_CREATE_SETUP}?${qp}`,
    "GET"
  );
  if (error) return { data: null, error };
  const u = unwrap(raw);
  const data: SetupResponse = {
    spg_types: u?.spg_types || [],
    branches: u?.branches || [],
  };
  return { data, error: null };
};

export const fetchSpinningQualityEditSetup = async (
  coId: string,
  spgQualityMstId: number
) => {
  const qp = new URLSearchParams({
    co_id: coId,
    spg_quality_mst_id: String(spgQualityMstId),
  });
  const { data: raw, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.SPINNING_QUALITY_EDIT_SETUP}?${qp}`,
    "GET"
  );
  if (error) return { data: null, error };
  const u = unwrap(raw);
  const data: EditSetupResponse = {
    spg_types: u?.spg_types || [],
    branches: u?.branches || [],
    spinning_quality_details: u?.spinning_quality_details,
  };
  return { data, error: null };
};

export type SpinningQualityPayload = {
  co_id: string;
  branch_id: string;
  spg_type_id: string;
  spg_quality: string;
  speed?: string;
  tpi?: string;
  std_count?: string;
  no_of_spindles?: string;
  frame_type?: string;
  target_eff?: string;
  updated_by?: string;
};

export const createSpinningQuality = async (payload: SpinningQualityPayload) =>
  fetchWithCookie(apiRoutesPortalMasters.SPINNING_QUALITY_CREATE, "POST", payload);

export const updateSpinningQuality = async (
  payload: SpinningQualityPayload & { spg_quality_mst_id: string }
) => fetchWithCookie(apiRoutesPortalMasters.SPINNING_QUALITY_EDIT, "PUT", payload);
