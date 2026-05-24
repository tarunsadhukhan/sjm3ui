import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

/**
 * Type definitions for machine SPG details API responses
 */
type Branch = {
  branch_id: number;
  branch_name: string;
};

type Machine = {
  machine_id: number;
  machine_name: string;
  mech_code: string;
  machine_type_id: number;
};

type MachineSpgDetailsSetupResponse = {
  branches: Branch[];
};

type MachineListResponse = {
  machines: Machine[];
};

type MachineSpgDetailsData = {
  mc_spg_det_id?: number;
  mechine_id?: number | string;
  machine_name?: string;
  speed?: number | string;
  no_of_spindle?: number | string;
  weight_per_spindle?: number | string;
  is_active?: number;
  branch_id?: number | string;
  branch_name?: string;
};

type MachineSpgDetailsEditSetupResponse = {
  branches: Branch[];
  machine_spg_details?: MachineSpgDetailsData;
};

/**
 * Mapper function to extract setup data from API response
 */
const mapSetupResponse = (apiResponse: any): MachineSpgDetailsSetupResponse => {
  const unwrapped = apiResponse?.data || apiResponse;
  return {
    branches: unwrapped?.branches || [],
  };
};

/**
 * Mapper function to extract machine list from API response
 */
const mapMachineListResponse = (apiResponse: any): MachineListResponse => {
  const unwrapped = apiResponse?.data || apiResponse;
  return {
    machines: unwrapped?.machines || [],
  };
};

/**
 * Mapper function to extract edit setup data from API response
 */
const mapEditSetupResponse = (apiResponse: any): MachineSpgDetailsEditSetupResponse => {
  const unwrapped = apiResponse?.data || apiResponse;
  return {
    branches: unwrapped?.branches || [],
    machine_spg_details: unwrapped?.machine_spg_details,
  };
};

/**
 * Fetch machine SPG details list with pagination and search
 */
export const fetchMachineSpgDetailsList = async (
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
    `${apiRoutesPortalMasters.MACHINE_SPG_DETAILS_TABLE}?${queryParams}`,
    "GET"
  );

  return { data, error };
};

/**
 * Fetch setup data for creating machine SPG details
 */
export const fetchMachineSpgDetailsCreateSetup = async (coId: string) => {
  const queryParams = new URLSearchParams({ co_id: coId });

  const { data: rawData, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.MACHINE_SPG_DETAILS_CREATE_SETUP}?${queryParams}`,
    "GET"
  );

  if (error) {
    return { data: null, error };
  }

  const data = mapSetupResponse(rawData);
  return { data, error: null };
};

/**
 * Fetch machines for a specific branch
 */
export const fetchMachinesByBranch = async (branchId: string) => {
  const queryParams = new URLSearchParams({ branch_id: branchId });

  const { data: rawData, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.MACHINE_SPG_DETAILS_MACHINES_BY_BRANCH}?${queryParams}`,
    "GET"
  );

  if (error) {
    return { data: null, error };
  }

  const data = mapMachineListResponse(rawData);
  return { data, error: null };
};

/**
 * Fetch setup data for editing machine SPG details
 */
export const fetchMachineSpgDetailsEditSetup = async (
  coId: string,
  mc_spg_det_id: number
) => {
  const queryParams = new URLSearchParams({
    co_id: coId,
    mc_spg_det_id: mc_spg_det_id.toString(),
  });

  const { data: rawData, error } = await fetchWithCookie(
    `${apiRoutesPortalMasters.MACHINE_SPG_DETAILS_EDIT_SETUP}?${queryParams}`,
    "GET"
  );

  if (error) {
    return { data: null, error };
  }

  const data = mapEditSetupResponse(rawData);
  return { data, error: null };
};

/**
 * Create a new machine SPG details record
 */
export const createMachineSpgDetails = async (payload: any) => {
  const { data, error } = await fetchWithCookie(
    apiRoutesPortalMasters.MACHINE_SPG_DETAILS_CREATE,
    "POST",
    payload
  );

  return { data, error };
};

/**
 * Update an existing machine SPG details record
 */
export const updateMachineSpgDetails = async (payload: any) => {
  const { data, error } = await fetchWithCookie(
    apiRoutesPortalMasters.MACHINE_SPG_DETAILS_EDIT,
    "PUT",
    payload
  );

  return { data, error };
};
