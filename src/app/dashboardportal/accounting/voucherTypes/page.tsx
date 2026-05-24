"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Snackbar, Alert, Chip } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchVoucherTypes } from "@/utils/accountingService";
import type { VoucherType } from "@/app/dashboardportal/accounting/types/accountingTypes";

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

type VoucherTypeRow = VoucherType & { id: number };

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VoucherTypesPage() {
  const { selectedCompany } = useSidebarContext();

  const [rows, setRows] = useState<VoucherTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 15,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const data = await fetchVoucherTypes(selectedCompany.co_id);
      const voucherTypes = data as unknown as VoucherType[];
      const mapped: VoucherTypeRow[] = voucherTypes.map((vt) => ({
        ...vt,
        id: vt.acc_voucher_type_id,
      }));
      setRows(mapped);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error fetching voucher types";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Filtered rows
  // -----------------------------------------------------------------------

  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      (r) =>
        r.type_name.toLowerCase().includes(q) ||
        r.type_code.toLowerCase().includes(q) ||
        r.type_category.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setPaginationModel((prev) => ({ ...prev, page: 0 }));
    },
    []
  );

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------

  const columns = useMemo<GridColDef<VoucherTypeRow>[]>(
    () => [
      {
        field: "type_name",
        headerName: "Type Name",
        flex: 2,
        minWidth: 200,
      },
      {
        field: "type_code",
        headerName: "Code",
        flex: 0.8,
        minWidth: 90,
      },
      {
        field: "type_category",
        headerName: "Category",
        flex: 1.2,
        minWidth: 130,
        renderCell: (params) => (
          <Chip label={params.value} size="small" variant="outlined" />
        ),
      },
      {
        field: "prefix",
        headerName: "Prefix",
        flex: 0.8,
        minWidth: 80,
        renderCell: (params) => params.value ?? "-",
      },
      {
        field: "requires_bank_cash",
        headerName: "Requires Bank/Cash",
        flex: 1,
        minWidth: 140,
        renderCell: (params) =>
          params.value ? (
            <Chip label="Yes" size="small" color="info" />
          ) : (
            <Chip label="No" size="small" variant="outlined" />
          ),
      },
    ],
    []
  );

  // -----------------------------------------------------------------------
  // Render (read-only - no create/edit actions)
  // -----------------------------------------------------------------------

  return (
    <IndexWrapper
      title="Voucher Types"
      subtitle="System-defined voucher types (read-only)"
      rows={filteredRows}
      columns={columns}
      rowCount={filteredRows.length}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search by name, code, or category",
        debounceDelayMs: 300,
      }}
    >
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
