"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import { Edit as EditIcon } from "lucide-react";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import CreateSelector from "./createSelector";
import { fetchSelectorTable } from "@/utils/selectorService";

type SelectorRow = {
  id: number;
  tbl_selector_mst_id: number;
  selector_name: string;
  selector_shr_name: string | null;
  branch_id: number;
  branch_name: string;
  under_selectror_master: number | null;
  under_selector_name: string | null;
  active: number;
  [key: string]: unknown;
};

export default function SelectorMasterEntryPage() {
  const [rows, setRows] = useState<SelectorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const loadRows = async () => {
    setLoading(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      if (!co_id) throw new Error("Company not selected");

      const { data, error } = await fetchSelectorTable(
        co_id,
        paginationModel.page + 1,
        paginationModel.pageSize,
        searchQuery
      );
      if (error || !data) throw new Error(error || "Failed to fetch selector list");

      const mapped = (data.data || []).map((row: Record<string, unknown>) => ({
        ...row,
        id: row.tbl_selector_mst_id ?? row.id,
      }));
      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err) {
      setSnackbar({
        open: true,
        message: err instanceof Error ? err.message : "Error fetching data",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const openCreateDialog = () => setCreateDialogOpen(true);
  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    loadRows();
  };
  const openEditDialog = (id: number) => {
    setEditId(id);
    setEditDialogOpen(true);
  };
  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditId(null);
    loadRows();
  };

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "actions",
        headerName: "Actions",
        flex: 0.6,
        minWidth: 60,
        sortable: false,
        renderCell: (params) => (
          <button
            onClick={() => openEditDialog(params.row.tbl_selector_mst_id)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Edit"
            aria-label="Edit"
          >
            <EditIcon size={18} />
          </button>
        ),
      },
      { field: "selector_name", headerName: "Selector Name", flex: 1, minWidth: 150 },
      { field: "selector_shr_name", headerName: "Short Name", flex: 0.8, minWidth: 100 },
      { field: "under_selector_name", headerName: "Under Selector", flex: 1, minWidth: 150 },
      { field: "branch_name", headerName: "Branch", flex: 1, minWidth: 150 },
      {
        field: "active",
        headerName: "Active",
        flex: 0.6,
        minWidth: 80,
        valueFormatter: (value: number) => (value === 1 ? "Yes" : "No"),
      },
    ],
    []
  );

  return (
    <IndexWrapper
      title="Selector Master"
      columns={columns}
      rows={rows}
      loading={loading}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      rowCount={totalRows}
      search={{
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search selector name / short name",
        debounceDelayMs: 1000,
      }}
      createAction={{ onClick: openCreateDialog, label: "Create Selector" }}
    >
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <CreateSelector
        open={createDialogOpen}
        onClose={closeCreateDialog}
        mode="create"
        selectorId={null}
      />
      {editId && (
        <CreateSelector
          open={editDialogOpen}
          onClose={closeEditDialog}
          mode="edit"
          selectorId={editId}
        />
      )}
    </IndexWrapper>
  );
}
