import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

export interface PartyOption {
  party_id: number;
  party_name: string;
}
export interface MukamOption {
  mukam_id: number;
  mukam_name: string;
}
export interface QualityOption {
  jute_qlty_id: number;
  jute_quality: string;
}
export interface RecvdListItem {
  jute_mukam_recvd: number;
  jute_mukam_recvd_no: number;
  recvd_date: string | null;
}

export interface MukamRecvSetup {
  parties: PartyOption[];
  mukams: MukamOption[];
  qualities: QualityOption[];
  recvd_list: RecvdListItem[];
}

export interface MukamRecvEntry {
  jute_mukam_recvd: number;
  jute_mukam_recvd_no: number;
  recvd_date: string | null;
  party_id: number | null;
  mukam_id: number | null;
  quality_id: number | null;
  gross_weight: string | number | null;
  tare_weight: string | number | null;
  net_weight: number | null;
  geo_location: string | null;
  geo_place: string | null;
  remarks: string | null;
}

export interface MukamRecvPayload {
  co_id: number | string;
  jute_mukam_recvd_no?: number;
  recvd_date?: string;
  party_id?: string | number;
  mukam_id?: string | number;
  quality_id?: string | number;
  gross_weight?: string | number;
  tare_weight?: string | number;
  geo_location?: string;
  geo_place?: string;
  remarks?: string;
}

export const fetchMukamRecvSetup = async (coId: string | number) =>
  fetchWithCookie<MukamRecvSetup>(
    `${apiRoutesPortalMasters.JUTE_MUKAM_RECVD_SETUP}?co_id=${coId}`,
    "GET",
  );

export const fetchMukamRecvByNo = async (recvdNo: number) =>
  fetchWithCookie<{ data: MukamRecvEntry; editable: boolean }>(
    `${apiRoutesPortalMasters.JUTE_MUKAM_RECVD_GET}/${recvdNo}`,
    "GET",
  );

export const createMukamRecv = async (payload: MukamRecvPayload) =>
  fetchWithCookie<{ message: string; jute_mukam_recvd_no: number }>(
    apiRoutesPortalMasters.JUTE_MUKAM_RECVD_CREATE,
    "POST",
    payload,
  );

export const updateMukamRecv = async (payload: MukamRecvPayload) =>
  fetchWithCookie<{ message: string; jute_mukam_recvd_no: number }>(
    apiRoutesPortalMasters.JUTE_MUKAM_RECVD_UPDATE,
    "POST",
    payload,
  );

/**
 * Reverse-geocode coordinates to a human-readable place name via OpenStreetMap
 * Nominatim (free, no API key). Returns an empty string on failure.
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return "";
    const data: { display_name?: string } = await res.json();
    return data.display_name ?? "";
  } catch {
    return "";
  }
};
