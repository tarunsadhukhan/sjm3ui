"use client";
import { useState, useCallback } from "react";
import { fetchJuteStockReport } from "@/utils/juteReportService";
import type { JuteStockReportRow } from "../types/reportTypes";

export function useJuteStockReport() {
  const [rows, setRows] = useState<JuteStockReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async (branchId: number, date: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJuteStockReport(branchId, date);
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
