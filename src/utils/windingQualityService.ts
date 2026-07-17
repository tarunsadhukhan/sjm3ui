import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export type WindingQualityDetails = {
  wng_quality_mst_id?: number;
  wng_quality?: string;
  target_prod?: number | string;
  spool_cop?: string;
};

export const fetchWindingQualityTable = async (
  page = 1,
  limit = 10,
  search?: string
) => {
  const qp = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) qp.append("search", search);

  const { data, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.WINDING_QUALITY_TABLE}?${qp}`,
    "GET"
  );
  return { data, error };
};

export const fetchWindingQualityEditSetup = async (wngQualityMstId: number) => {
  const qp = new URLSearchParams({
    wng_quality_mst_id: String(wngQualityMstId),
  });
  const { data: raw, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.WINDING_QUALITY_EDIT_SETUP}?${qp}`,
    "GET"
  );
  if (error) return { data: null, error };
  const u = (raw as { data?: { winding_quality_details?: WindingQualityDetails } })?.data ?? raw;
  return {
    data: {
      winding_quality_details: (u as { winding_quality_details?: WindingQualityDetails })
        ?.winding_quality_details,
    },
    error: null,
  };
};

export type WindingQualityPayload = {
  wng_quality: string;
  target_prod?: string;
  spool_cop?: string;
  updated_by?: string;
};

export const createWindingQuality = async (payload: WindingQualityPayload) =>
  fetchWithCookie(apiRoutesPortalMasters.WINDING_QUALITY_CREATE, "POST", payload);

export const updateWindingQuality = async (
  payload: WindingQualityPayload & { wng_quality_mst_id: string }
) => fetchWithCookie(apiRoutesPortalMasters.WINDING_QUALITY_EDIT, "PUT", payload);
