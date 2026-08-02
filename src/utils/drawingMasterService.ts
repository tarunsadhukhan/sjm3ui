import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export type DrawingMachine = {
  machine_id: number;
  machine_name: string;
  mech_code?: string | null;
};

export type DrawingBranch = {
  branch_id: number;
  branch_name: string;
};

export type DrawingDetails = {
  drg_mst_id?: number;
  mc_id?: number | string;
  machine_name?: string;
  short_name?: string | null;
  shed_type?: string | null;
  drg_type?: number | string | null;
  const_meter?: number | string | null;
  meter_type?: number | string | null;
  branch_id?: number | string | null;
  branch_name?: string | null;
};

const unwrap = (resp: unknown) => (resp as { data?: unknown })?.data ?? resp;

export const fetchDrawingTable = async (
  page = 1,
  limit = 10,
  search?: string
) => {
  const qp = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) qp.append("search", search);

  const { data, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.DRAWING_TABLE}?${qp}`,
    "GET"
  );
  return { data, error };
};

export const fetchDrawingCreateSetup = async (coId: string) => {
  const qp = new URLSearchParams({ co_id: coId });
  const { data: raw, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.DRAWING_CREATE_SETUP}?${qp}`,
    "GET"
  );
  if (error) return { data: null, error };
  const u = unwrap(raw) as {
    machines?: DrawingMachine[];
    branches?: DrawingBranch[];
  };
  return {
    data: { machines: u?.machines || [], branches: u?.branches || [] },
    error: null,
  };
};

export const fetchDrawingEditSetup = async (coId: string, drgMstId: number) => {
  const qp = new URLSearchParams({ co_id: coId, drg_mst_id: String(drgMstId) });
  const { data: raw, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.DRAWING_EDIT_SETUP}?${qp}`,
    "GET"
  );
  if (error) return { data: null, error };
  const u = unwrap(raw) as {
    machines?: DrawingMachine[];
    branches?: DrawingBranch[];
    drawing_details?: DrawingDetails;
  };
  return {
    data: {
      machines: u?.machines || [],
      branches: u?.branches || [],
      drawing_details: u?.drawing_details,
    },
    error: null,
  };
};

export type DrawingPayload = {
  mc_id: string;
  short_name?: string;
  shed_type?: string;
  drg_type?: string;
  const_meter?: string;
  meter_type?: string;
  branch_id?: string;
  updated_by?: string;
};

export const createDrawing = async (payload: DrawingPayload) =>
  fetchWithCookie(apiRoutesPortalMasters.DRAWING_CREATE, "POST", payload);

export const updateDrawing = async (
  payload: DrawingPayload & { drg_mst_id: string }
) => fetchWithCookie(apiRoutesPortalMasters.DRAWING_EDIT, "PUT", payload);
