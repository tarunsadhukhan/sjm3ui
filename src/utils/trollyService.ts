import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export type Branch = {
  branch_id: number;
  branch_name: string;
};

export type Department = {
  dept_id: number;
  dept_name: string;
  branch_id?: number;
};

export type TrollyDetails = {
  trolly_id?: number;
  trolly_name?: string;
  trolly_weight?: number | string;
  busket_weight?: number | string;
  branch_id?: number | string;
  dept_id?: number | string;
};

type SetupResponse = {
  branches: Branch[];
  departments: Department[];
};

type EditSetupResponse = SetupResponse & {
  trolly_details?: TrollyDetails;
};

const unwrap = (resp: any) => resp?.data ?? resp;

export const fetchTrollyTable = async (
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
    `${apiRoutesPortalMasters.TROLLY_TABLE}?${qp}`,
    "GET"
  );
  return { data, error };
};

export const fetchTrollyCreateSetup = async (coId: string) => {
  const qp = new URLSearchParams({ co_id: coId });
  const { data: raw, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.TROLLY_CREATE_SETUP}?${qp}`,
    "GET"
  );
  if (error) return { data: null, error };
  const u = unwrap(raw);
  const data: SetupResponse = {
    branches: u?.branches || [],
    departments: u?.departments || [],
  };
  return { data, error: null };
};

export const fetchTrollyEditSetup = async (coId: string, trollyId: number) => {
  const qp = new URLSearchParams({
    co_id: coId,
    trolly_id: String(trollyId),
  });
  const { data: raw, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.TROLLY_EDIT_SETUP}?${qp}`,
    "GET"
  );
  if (error) return { data: null, error };
  const u = unwrap(raw);
  const data: EditSetupResponse = {
    branches: u?.branches || [],
    departments: u?.departments || [],
    trolly_details: u?.trolly_details,
  };
  return { data, error: null };
};

export type TrollyPayload = {
  co_id: string;
  branch_id: string;
  dept_id: string;
  trolly_name: string;
  trolly_weight?: string;
  busket_weight?: string;
  updated_by?: string;
};

export const createTrolly = async (payload: TrollyPayload) =>
  fetchWithCookie(apiRoutesPortalMasters.TROLLY_CREATE, "POST", payload);

export const updateTrolly = async (
  payload: TrollyPayload & { trolly_id: string }
) => fetchWithCookie(apiRoutesPortalMasters.TROLLY_EDIT, "PUT", payload);
