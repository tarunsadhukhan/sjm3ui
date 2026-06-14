import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

/** Lookup rows returned by the supplier-registration setup endpoint. */
export interface PartyTypeOption {
  party_types_mst_id: number;
  party_types_mst_name: string;
  party_types_mst_prefix: string | null;
  module_id: number | null;
}
export interface CountryOption {
  country_id: number;
  country: string;
}
export interface StateOption {
  state_id: number;
  state: string;
  country_id: number;
}
export interface EntityOption {
  entity_type_id: number;
  entity_type_name: string;
}
export interface CityOption {
  city_id: number;
  city_name: string;
  state_id: number;
}

export interface SupplierRegistrationSetup {
  party_types: PartyTypeOption[];
  countries: CountryOption[];
  states: StateOption[];
  entities: EntityOption[];
  cities: CityOption[];
}

/** One branch row sent to the register endpoint. */
export interface BranchPayload {
  address?: string;
  address_additional?: string;
  gst_no?: string;
  zip_code?: string | number;
  state?: string | number;
  city?: string | number;
  contact_person?: string;
  contact_no?: string;
  whatsapp_no?: string;
  email_id?: string;
  bank_acc_no?: string;
  ifsc_code?: string;
  bank_name?: string;
  bank_branch?: string;
  upi_code?: string;
}

export interface SupplierRegisterPayload {
  co_id: number | string;
  supp_name: string;
  party_type?: string | number;
  entity_type_id?: string | number;
  country_id?: string | number;
  phone_no?: string;
  cin?: string;
  party_pan_no?: string;
  msme_certified?: string;
  supp_contact_person?: string;
  supp_contact_designation?: string;
  supp_email_id?: string;
  branches: BranchPayload[];
  force?: boolean;
}

export interface BranchConflict {
  field: string;
  label: string;
  value: string;
  supplier: string;
}

export interface SupplierRegisterResult {
  message?: string;
  party_id?: number;
  supp_code?: string;
  duplicate?: boolean;
  conflicts?: BranchConflict[];
}

export const fetchSupplierSetup = async (coId: string | number) =>
  fetchWithCookie<SupplierRegistrationSetup>(
    `${apiRoutesPortalMasters.SUPPLIER_REGISTRATION_SETUP}?co_id=${coId}`,
    "GET",
  );

export const registerSupplier = async (payload: SupplierRegisterPayload) =>
  fetchWithCookie<SupplierRegisterResult>(
    apiRoutesPortalMasters.SUPPLIER_REGISTER,
    "POST",
    payload,
  );
