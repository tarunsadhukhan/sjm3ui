"use client";
import { useState, useCallback } from "react";
import { fetchBatchCostReport } from "@/utils/juteReportService";
import type { BatchCostReportRow } from "../types/reportTypes";

export function useBatchCostReport() {
  const [rows, setRows] = useState<BatchCostReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (branchId: number, date: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchBatchCostReport(branchId, date);
      setRows(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { rows, loading, error, loadReport };
}
