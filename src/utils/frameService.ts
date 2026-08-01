import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export type FrameMachine = {
  machine_id: number;
  machine_name: string;
  mech_code?: string | null;
};

export type FrameDetails = {
  frame_details_mst_id?: number;
  mc_id?: number | string;
  machine_name?: string;
  speed?: number | string | null;
  frame_type?: string | null;
  bobbin_weight?: number | string | null;
  no_of_spindle?: number | string | null;
};

const unwrap = (resp: unknown) =>
  (resp as { data?: unknown })?.data ?? resp;

export const fetchFrameTable = async (
  page = 1,
  limit = 10,
  search?: string
) => {
  const qp = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) qp.append("search", search);

  const { data, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.FRAME_TABLE}?${qp}`,
    "GET"
  );
  return { data, error };
};

export const fetchFrameCreateSetup = async () => {
  const { data: raw, error } = await fetchWithCookie(
    apiRoutesPortalMasters.FRAME_CREATE_SETUP,
    "GET"
  );
  if (error) return { data: null, error };
  const u = unwrap(raw) as { machines?: FrameMachine[] };
  return { data: { machines: u?.machines || [] }, error: null };
};

export const fetchFrameEditSetup = async (frameDetailsMstId: number) => {
  const qp = new URLSearchParams({
    frame_details_mst_id: String(frameDetailsMstId),
  });
  const { data: raw, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.FRAME_EDIT_SETUP}?${qp}`,
    "GET"
  );
  if (error) return { data: null, error };
  const u = unwrap(raw) as {
    machines?: FrameMachine[];
    frame_details?: FrameDetails;
  };
  return {
    data: { machines: u?.machines || [], frame_details: u?.frame_details },
    error: null,
  };
};

export type FramePayload = {
  mc_id: string;
  speed?: string;
  frame_type?: string;
  bobbin_weight?: string;
  no_of_spindle?: string;
  updated_by?: string;
};

export const createFrame = async (payload: FramePayload) =>
  fetchWithCookie(apiRoutesPortalMasters.FRAME_CREATE, "POST", payload);

export const updateFrame = async (
  payload: FramePayload & { frame_details_mst_id: string }
) => fetchWithCookie(apiRoutesPortalMasters.FRAME_EDIT, "PUT", payload);
