import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

/**
 * Type definitions for yarn quality API responses
 */
type YarnType = {
  item_grp_id: number;
  item_grp_name: string;
};

type Branch = {
  branch_id: number;
  branch_name: string;
};

type YarnQualitySetupResponse = {
  yarn_types: YarnType[];
  branches: Branch[];
};

type YarnQualityDetails = {
  yarn_quality_id?: number;
  quality_code?: string;
  item_grp_id?: number | string;
  branch_id?: number | string;
  twist_per_inch?: number | string;
  std_count?: number | string;
  std_doff?: number | string;
  std_wt_doff?: number | string;
  target_eff?: number | string;
  is_active?: number;
};

type YarnQualityEditSetupResponse = {
  yarn_types: YarnType[];
  branches: Branch[];
  yarn_quality_details?: YarnQualityDetails;
};

/**
 * Mapper function to extract setup data from API response
 * The API wraps the response in a "data" object, so we need to unwrap it
 */
const mapSetupResponse = (apiResponse: any): YarnQualitySetupResponse => {
  const unwrapped = apiResponse?.data || apiResponse;
  return {
    yarn_types: unwrapped?.yarn_types || [],
    branches: unwrapped?.branches || [],
  };
};

/**
 * Mapper function to extract edit setup data from API response
 */
const mapEditSetupResponse = (apiResponse: any): YarnQualityEditSetupResponse => {
  const unwrapped = apiResponse?.data || apiResponse;
  return {
    yarn_types: unwrapped?.yarn_types || [],
    branches: unwrapped?.branches || [],
    yarn_quality_details: unwrapped?.yarn_quality_details,
  };
};

/**
 * Fetch yarn quality list with pagination and search
 */
export const fetchYarnQualityTable = async (
  coId: string,
  page: number = 1,
  limit: number = 10,
  search?: string
) => {
  const queryParams = new URLSearchParams({
    co_id: coId,
    page: page.toString(),
    limit: limit.toString(),
  });

  if (search) {
    queryParams.append("search", search);
  }

  const { data, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.YARN_QUALITY_TABLE}?${queryParams}`,
    "GET"
  );

  return { data, error };
};

/**
 * Fetch setup data for creating a new yarn quality
 */
export const fetchYarnQualityCreateSetup = async (coId: string) => {
  const queryParams = new URLSearchParams({ co_id: coId });

  const { data: rawData, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.YARN_QUALITY_CREATE_SETUP}?${queryParams}`,
    "GET"
  );

  if (error) {
    return { data: null, error };
  }

  const data = mapSetupResponse(rawData);
  return { data, error: null };
};

/**
 * Fetch setup data for editing an existing yarn quality
 */
export const fetchYarnQualityEditSetup = async (
  coId: string,
  yarnQualityId: number
) => {
  const queryParams = new URLSearchParams({
    co_id: coId,
    yarn_quality_id: yarnQualityId.toString(),
  });

  const { data: rawData, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.YARN_QUALITY_EDIT_SETUP}?${queryParams}`,
    "GET"
  );

  if (error) {
    return { data: null, error };
  }

  const data = mapEditSetupResponse(rawData);
  return { data, error: null };
};

/**
 * Create a new yarn quality record
 */
export const createYarnQuality = async (payload: {
  co_id: string;
  branch_id?: string;
  quality_code: string;
  item_grp_id: string;
  twist_per_inch?: string;
  std_count?: string;
  std_doff?: string;
  std_wt_doff?: string;
  is_active?: number;
  updated_by?: string;
}) => {
  const { data, error } = await fetchWithCookie(
    apiRoutesPortalMasters.YARN_QUALITY_CREATE,
    "POST",
    payload
  );

  return { data, error };
};

/**
 * Update an existing yarn quality record
 */
export const updateYarnQuality = async (payload: {
  yarn_quality_id: string;
  co_id: string;
  branch_id?: string;
  quality_code: string;
  item_grp_id: string;
  twist_per_inch?: string;
  std_count?: string;
  std_doff?: string;
  std_wt_doff?: string;
  is_active?: number;
  updated_by?: string;
}) => {
  const { data, error } = await fetchWithCookie(
    apiRoutesPortalMasters.YARN_QUALITY_EDIT,
    "PUT",
    payload
  );

  return { data, error };
};
