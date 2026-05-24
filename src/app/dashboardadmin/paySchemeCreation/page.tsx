"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import IndexWrapper from "@/components/ui/IndexWrapper";
import {
  Snackbar,
  Alert,
} from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

interface PaySchemeRow {
  id: number;
  payscheme_id: number;
  co_id: number | null;
  payscheme_code: string;
  payscheme_name: string;
  record_status: number | null;
  wage_type: number | null;
  wage_type_name: string | null;
  status_desc: string | null;
  effective_from: string | null;
  updated_date_time: string | null;
}

export default function PaySchemeCreationPage() {
  const router = useRouter();
  const [rows, setRows] = useState<PaySchemeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRows, setTotalRows] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 20,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // Fetch pay schemes
  const fetchSchemes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(paginationModel.page + 1),
        page_size: String(paginationModel.pageSize),
      });
      if (searchQuery) params.append("search", searchQuery);

      const { data, error } = (await fetchWithCookie(
        `${apiRoutesPortalMasters.HRMS_PAY_SCHEME_LIST}?${params}`,
        "GET"
      )) as { data?: { data: PaySchemeRow[]; total: number }; error?: string };

      if (error || !data) throw new Error(error || "Failed to fetch");

      setRows(
        (data.data || []).map((r) => ({ ...r, id: r.payscheme_id })) as (PaySchemeRow & { id: number })[]
      );
      setTotalRows(data.total || 0);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  useEffect(() => {
    fetchSchemes();
  }, [fetchSchemes]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const columns: GridColDef[] = [
    {
      field: "payscheme_code",
      headerName: "Pay Scheme Code",
      width: 160,
      headerClassName: "bg-[#3ea6da] text-white",
    },
    {
      field: "payscheme_name",
      headerName: "Pay Scheme Name",
      flex: 1,
      minWidth: 200,
      headerClassName: "bg-[#3ea6da] text-white",
    },
    {
      field: "wage_type_name",
      headerName: "Wage Type",
      width: 140,
      headerClassName: "bg-[#3ea6da] text-white",
      renderCell: (p) => p.value || "-",
    },
    {
      field: "status_desc",
      headerName: "Status",
      width: 120,
      headerClassName: "bg-[#3ea6da] text-white",
      renderCell: (p) => p.value || "-",
    },
    {
      field: "effective_from",
      headerName: "Effective From",
      width: 140,
      headerClassName: "bg-[#3ea6da] text-white",
      renderCell: (p) => (p.value ? String(p.value).slice(0, 10) : "-"),
    },
  ];

  const handleEdit = useCallback(
    (row: PaySchemeRow & { id: number }) => {
      router.push(
        `/dashboardadmin/paySchemeCreation/create?id=${row.payscheme_id}`
      );
    },
    [router]
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#0C3C60]">Pay Scheme</h1>
          <Button
            className="btn-primary"
            onClick={() =>
              router.push(
                `/dashboardadmin/paySchemeCreation/create`
              )
            }
          >
            + Create Pay Scheme
          </Button>
        </div>

        <IndexWrapper
          title="Pay Scheme"
          rows={rows}
          columns={columns}
          rowCount={totalRows}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          loading={loading}
          onEdit={handleEdit}
          search={{
            value: searchQuery,
            onChange: handleSearchChange,
            placeholder: "Search...",
            debounceDelayMs: 1000,
          }}
        />

        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            severity={snackbar.severity}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </div>
  );
}
