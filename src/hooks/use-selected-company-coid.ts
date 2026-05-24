import React from "react";
import { useSidebarContextSafe } from "@/components/dashboard/sidebarContext";

const DEFAULT_STORAGE_KEY = "sidebar_selectedCompany";

type StoredCompanyRecord = {
  co_id?: string | number;
  [key: string]: unknown;
};

const readCoIdFromStorage = (storageKey: string): string => {
  if (typeof window === "undefined") return "";
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return "";
    const parsed = JSON.parse(raw) as StoredCompanyRecord | null;
    const value = parsed?.co_id;
    if (value == null) return "";
    return typeof value === "string" ? value : String(value);
  } catch {
    return "";
  }
};

/**
 * Returns the currently selected company's `co_id`.
 *
 * Prefers the live `SidebarProvider` context so that changing the company in the
 * sidebar updates every consumer reactively — no page reload required. (The
 * sidebar's company/branch handlers used to do a full `window.location.href`
 * refresh purely so this localStorage-backed value would update; that reload is
 * gone, so we read the context value directly instead.)
 *
 * Falls back to reading `localStorage` when used outside the provider, before the
 * context is populated, or when a non-default `storageKey` is requested.
 */
export function useSelectedCompanyCoId(storageKey: string = DEFAULT_STORAGE_KEY) {
  const ctx = useSidebarContextSafe();
  const usesDefaultKey = storageKey === DEFAULT_STORAGE_KEY;
  const contextCoId =
    usesDefaultKey && ctx?.selectedCompany?.co_id != null
      ? String(ctx.selectedCompany.co_id)
      : "";

  const reader = React.useCallback(() => readCoIdFromStorage(storageKey), [storageKey]);

  const [storedCoId, setStoredCoId] = React.useState<string>(() => reader());

  const refresh = React.useCallback(() => {
    setStoredCoId(reader());
  }, [reader]);

  React.useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;

    const handler = (event: StorageEvent) => {
      if (event.key && event.key !== storageKey) return;
      refresh();
    };

    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refresh, storageKey]);

  // Live context value wins; localStorage is the fallback.
  const coId = contextCoId || storedCoId;

  return { coId, refresh };
}

export default useSelectedCompanyCoId;
