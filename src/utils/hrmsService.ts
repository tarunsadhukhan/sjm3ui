/**
 * HRMS service layer — wraps all HRMS API calls with fetchWithCookie.
 */
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import axios from "axios";

// ─── Employee ──────────────────────────────────────────────────────

export const fetchEmployeeList = async (
  coId: string,
  params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status_id?: string;
    branch_id?: string;
    sub_dept_id?: string;
    is_active?: number | null;
    columnFilters?: Record<string, string>;
  },
) => {
  const qs = new URLSearchParams({ co_id: coId });
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.search) qs.set("search", params.search);
  if (params?.status_id) qs.set("status_id", params.status_id);
  if (params?.branch_id) qs.set("branch_id", params.branch_id);
  if (params?.sub_dept_id) qs.set("sub_dept_id", params.sub_dept_id);
  if (params?.is_active !== undefined && params?.is_active !== null) qs.set("is_active", String(params.is_active));
  if (params?.columnFilters) {
    for (const [key, val] of Object.entries(params.columnFilters)) {
      if (val) qs.set(key, val);
    }
  }
  return fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_EMPLOYEE_LIST}?${qs.toString()}`,
    "GET",
  );
};

export const fetchEmployeeById = async (coId: string, ebId: string, branchId: string) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_EMPLOYEE_BY_ID}/${ebId}?co_id=${coId}&branch_id=${branchId}`,
    "GET",
  );

export const fetchEmployeeCreateSetup = async (coId: string, branchId?: string) => {
  const qs = new URLSearchParams({ co_id: coId });
  if (branchId) qs.set("branch_id", branchId);
  return fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_EMPLOYEE_CREATE_SETUP}?${qs.toString()}`,
    "GET",
  );
};

export const fetchDesignationsByBranch = async (coId: string, branchId: string) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_DESIGNATIONS_BY_BRANCH}?co_id=${coId}&branch_id=${branchId}`,
    "GET",
  );

export const fetchDesignationsBySubDept = async (coId: string, subDeptId: string) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_DESIGNATIONS_BY_SUB_DEPT}?co_id=${coId}&sub_dept_id=${subDeptId}`,
    "GET",
  );

export const checkEmpCodeDuplicate = async (coId: string, empCode: string, branchId: string, excludeEbId?: number | null) => {
  const params = new URLSearchParams({ co_id: coId, emp_code: empCode, branch_id: branchId });
  if (excludeEbId) params.set("exclude_eb_id", String(excludeEbId));
  return fetchWithCookie(`${apiRoutesPortalMasters.HRMS_CHECK_EMP_CODE_DUPLICATE}?${params}`, "GET");
};

export const updateEmployeeStatus = async (
  payload: { eb_id: number; status_id: number; date?: string; reason?: string; remarks?: string },
) => fetchWithCookie(apiRoutesPortalMasters.HRMS_EMPLOYEE_STATUS_UPDATE, "POST", payload);

export const createEmployee = async (coId: string, branchId: string, data: Record<string, unknown>) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_EMPLOYEE_CREATE}?co_id=${coId}&branch_id=${branchId}`,
    "POST",
    data,
  );

export const saveEmployeeSection = async (
  coId: string,
  payload: { eb_id: number; section: string; data: Record<string, unknown> | Record<string, unknown>[] },
) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_EMPLOYEE_SECTION_SAVE}?co_id=${coId}`,
    "POST",
    payload,
  );

export const fetchEmployeeProgress = async (coId: string, ebId: string, branchId: string) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_EMPLOYEE_PROGRESS}/${ebId}?co_id=${coId}&branch_id=${branchId}`,
    "GET",
  );

export const uploadEmployeePhoto = async (coId: string, ebId: number, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("eb_id", String(ebId));
  try {
    const response = await axios.post(
      `${apiRoutesPortalMasters.HRMS_EMPLOYEE_PHOTO_UPLOAD}?co_id=${coId}`,
      formData,
      { withCredentials: true },
    );
    return { data: response.data, error: null, status: response.status };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { data: null, error: message, status: 0 };
  }
};

export const getEmployeePhotoUrl = (coId: string, ebId: number | string) =>
  `${apiRoutesPortalMasters.HRMS_EMPLOYEE_PHOTO}/${ebId}?co_id=${coId}`;

export const deleteEmployeePhoto = async (coId: string, ebId: number) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_EMPLOYEE_PHOTO}/${ebId}?co_id=${coId}`,
    "DELETE",
  );

export const lookupEmployeeByCode = async (coId: string, empCode: string) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_EMPLOYEE_LOOKUP_BY_CODE}?co_id=${coId}&emp_code=${encodeURIComponent(empCode)}`,
    "GET",
  );

// ─── Pay Scheme ────────────────────────────────────────────────────

export const fetchPaySchemeList = async (
  coId: string,
  params?: { page?: number; page_size?: number; search?: string },
) => {
  const qs = new URLSearchParams();
  qs.set("co_id", coId);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.search) qs.set("search", params.search);
  return fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_SCHEME_LIST}?${qs.toString()}`,
    "GET",
  );
};

export const fetchPaySchemeById = async (coId: string, id: string) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_SCHEME_BY_ID}/${id}?co_id=${coId}`,
    "GET",
  );

export const fetchPaySchemeCreateSetup = async (coId?: string) => {
  const qs = new URLSearchParams();
  if (coId) qs.set("co_id", coId);
  return fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_SCHEME_CREATE_SETUP}?${qs.toString()}`,
    "GET",
  );
};

export const createPayScheme = async (coId: string, data: Record<string, unknown>) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_SCHEME_CREATE}?co_id=${coId}`,
    "POST",
    data,
  );

export const updatePayScheme = async (
  coId: string,
  id: string,
  data: Record<string, unknown>,
) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_SCHEME_UPDATE}/${id}?co_id=${coId}`,
    "PUT",
    data,
  );

// ─── Pay Param / Period ────────────────────────────────────────────

export const fetchPayParamList = async (
  coId: string,
  params?: { page?: number; page_size?: number; search?: string },
) => {
  const qs = new URLSearchParams({ co_id: coId });
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.search) qs.set("search", params.search);
  return fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_PARAM_LIST}?${qs.toString()}`,
    "GET",
  );
};

export const fetchPayParamCreateSetup = async (coId: string) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_PARAM_CREATE_SETUP}?co_id=${coId}`,
    "GET",
  );

export const createPayParam = async (coId: string, data: Record<string, unknown>) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_PARAM_CREATE}?co_id=${coId}`,
    "POST",
    data,
  );

export const updatePayParam = async (
  coId: string,
  id: string,
  data: Record<string, unknown>,
) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_PARAM_UPDATE}/${id}?co_id=${coId}`,
    "PUT",
    data,
  );

// ─── Pay Register ──────────────────────────────────────────────────

export const fetchPayRegisterList = async (
  coId: string,
  params?: {
    page?: number;
    page_size?: number;
    search?: string;
    from_date?: string;
    to_date?: string;
    status?: string;
  },
) => {
  const qs = new URLSearchParams({ co_id: coId });
  if (params?.page) qs.set("page", String(params.page));
  if (params?.page_size) qs.set("page_size", String(params.page_size));
  if (params?.search) qs.set("search", params.search);
  if (params?.from_date) qs.set("from_date", params.from_date);
  if (params?.to_date) qs.set("to_date", params.to_date);
  if (params?.status) qs.set("status", params.status);
  return fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_REGISTER_LIST}?${qs.toString()}`,
    "GET",
  );
};

export const fetchPayRegisterById = async (coId: string, id: string) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_REGISTER_BY_ID}/${id}?co_id=${coId}`,
    "GET",
  );

export const fetchPayRegisterCreateSetup = async (coId: string) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_REGISTER_CREATE_SETUP}?co_id=${coId}`,
    "GET",
  );

export const createPayRegister = async (coId: string, data: Record<string, unknown>) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_REGISTER_CREATE}?co_id=${coId}`,
    "POST",
    data,
  );

export const updatePayRegister = async (
  coId: string,
  id: string,
  data: Record<string, unknown>,
) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_REGISTER_UPDATE}/${id}?co_id=${coId}`,
    "PUT",
    data,
  );

export const processPayRegister = async (
  coId: string,
  data: { pay_period_id: number; pay_scheme_id: number; branch_id?: number | null },
) =>
  fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_REGISTER_PROCESS}?co_id=${coId}`,
    "POST",
    data,
  );

export const fetchPayRegisterSalary = async (
  coId: string,
  params: {
    branch_id?: number;
    pay_scheme_id?: number;
    from_date?: string;
    to_date?: string;
    pay_period_id: number;
  },
) => {
  const qs = new URLSearchParams({ co_id: coId });
  if (params.branch_id) qs.set("branch_id", String(params.branch_id));
  if (params.pay_scheme_id) qs.set("pay_scheme_id", String(params.pay_scheme_id));
  if (params.from_date) qs.set("from_date", params.from_date);
  if (params.to_date) qs.set("to_date", params.to_date);
  qs.set("pay_period_id", String(params.pay_period_id));
  return fetchWithCookie(
    `${apiRoutesPortalMasters.HRMS_PAY_REGISTER_SALARY}?${qs.toString()}`,
    "GET",
  );
};
