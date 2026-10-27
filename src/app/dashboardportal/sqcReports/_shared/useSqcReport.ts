"use client";

import * as React from "react";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";

/** Company / branch / date filter state shared by every SQC report page. */
export function useSqcReportFilters() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches, selectedCompany } = useSidebarContext();
  const sidebarBranchIds = React.useMemo(
    () => selectedBranches.map(Number),
    [selectedBranches],
  );
  const branchOptions = React.useMemo(
    () =>
      (selectedCompany?.branches ?? []).filter((b) =>
        sidebarBranchIds.includes(Number(b.branch_id)),
      ),
    [selectedCompany, sidebarBranchIds],
  );

  // One sidebar branch → use it; several → keep the user's pick while it stays valid.
  const [branchId, setBranchId] = React.useState<number | null>(null);
  React.useEffect(() => {
    setBranchId((prev) =>
      sidebarBranchIds.length === 1
        ? sidebarBranchIds[0]
        : prev != null && sidebarBranchIds.includes(prev)
          ? prev
          : null,
    );
  }, [sidebarBranchIds]);

  const [entryDate, setEntryDate] = React.useState<string>(todayISO());
  const companyName = selectedCompany?.co_name ?? "";
  const branchName =
    branchOptions.find((b) => Number(b.branch_id) === branchId)?.branch_name ??
    "";

  return {
    mounted,
    coId,
    branchId,
    setBranchId,
    branchOptions,
    entryDate,
    setEntryDate,
    companyName,
    branchName,
  };
}

/** GETs `${url}?co_id&branch_id&entry_date` whenever the filters change; returns the `data` payload. */
export function useSqcReportData<T>(
  url: string,
  coId: string | number | null | undefined,
  branchId: number | null,
  entryDate: string,
) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!coId || branchId == null || !entryDate) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchWithCookie<{ data: T }>(
      `${url}?co_id=${coId}&branch_id=${branchId}&entry_date=${entryDate}`,
      "GET",
    ).then(({ data: res, error: err }) => {
      if (cancelled) return;
      setData(err || !res ? null : res.data);
      setError(err ?? null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [url, coId, branchId, entryDate]);

  return { data, loading, error };
}
