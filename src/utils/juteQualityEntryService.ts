import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export type Branch = {
  branch_id: number;
  branch_name: string;
};

export type JuteItemOption = {
  item_id: number;
  item_code: string;
  item_name: string;
};

export type JuteQualityDetails = {
  jute_qlty_id?: number;
  jute_quality?: string;
  shr_name?: string;
  branch_id?: number | string;
  item_id?: number | null;
  active?: number;
};

type SetupResponse = {
  branches: Branch[];
  items: JuteItemOption[];
};

type EditSetupResponse = SetupResponse & {
  jute_quality_details?: JuteQualityDetails;
};

const unwrap = (resp: unknown) =>
  (resp as { data?: unknown })?.data ?? resp;

export const fetchJuteQualityTable = async (
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
    `${apiRoutesPortalMasters.JUTE_QUALITY_ENTRY_TABLE}?${qp}`,
    "GET"
  );
  return { data, error };
};

export const fetchJuteQualityCreateSetup = async (coId: string) => {
  const qp = new URLSearchParams({ co_id: coId });
  const { data: raw, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.JUTE_QUALITY_ENTRY_CREATE_SETUP}?${qp}`,
    "GET"
  );
  if (error) return { data: null, error };
  const u = unwrap(raw) as Partial<SetupResponse> | undefined;
  const data: SetupResponse = {
    branches: u?.branches || [],
    items: u?.items || [],
  };
  return { data, error: null };
};

export const fetchJuteQualityEditSetup = async (coId: string, juteQltyId: number) => {
  const qp = new URLSearchParams({
    co_id: coId,
    jute_qlty_id: String(juteQltyId),
  });
  const { data: raw, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.JUTE_QUALITY_ENTRY_EDIT_SETUP}?${qp}`,
    "GET"
  );
  if (error) return { data: null, error };
  const u = unwrap(raw) as Partial<EditSetupResponse> | undefined;
  const data: EditSetupResponse = {
    branches: u?.branches || [],
    items: u?.items || [],
    jute_quality_details: u?.jute_quality_details,
  };
  return { data, error: null };
};

export type JuteQualityPayload = {
  co_id: string;
  branch_id: string;
  jute_quality: string;
  shr_name?: string;
  item_id?: string;
  active?: string;
  updated_by?: string;
};

export const createJuteQuality = async (payload: JuteQualityPayload) =>
  fetchWithCookie(apiRoutesPortalMasters.JUTE_QUALITY_ENTRY_CREATE, "POST", payload);

export const updateJuteQuality = async (
  payload: JuteQualityPayload & { jute_qlty_id: string }
) => fetchWithCookie(apiRoutesPortalMasters.JUTE_QUALITY_ENTRY_EDIT, "PUT", payload);
