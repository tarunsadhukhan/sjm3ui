"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import { Edit as EditIcon } from "lucide-react";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import CreateTrolly from "./createTrolly";
import { fetchTrollyTable } from "@/utils/trollyService";

type TrollyRow = {
  id: number;
  trolly_id: number;
  trolly_name: string;
  trolly_weight: number;
  busket_weight: number;
  branch_id: number;
  branch_name: string;
  dept_id: number;
  dept_name: string;
  [key: string]: any;
};

export default function TrollyMasterEntryPage() {
  const [rows, setRows] = useState<TrollyRow[]>([]);
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

      const { data, error } = await fetchTrollyTable(
        co_id,
        paginationModel.page + 1,
        paginationModel.pageSize,
        searchQuery
      );
      if (error || !data) throw new Error(error || "Failed to fetch trolly list");

      const mapped = (data.data || []).map((row: any) => ({
        ...row,
        id: row.trolly_id ?? row.id,
      }));
      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err: any) {
      setSnackbar({ open: true, message: err.message || "Error fetching data", severity: "error" });
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
            onClick={() => openEditDialog(params.row.trolly_id)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Edit"
            aria-label="Edit"
          >
            <EditIcon size={18} />
          </button>
        ),
      },
      { field: "trolly_name", headerName: "Trolly Name", flex: 1, minWidth: 150 },
      { field: "branch_name", headerName: "Branch", flex: 1, minWidth: 150 },
      { field: "dept_name", headerName: "Department", flex: 1, minWidth: 150 },
      { field: "trolly_weight", headerName: "Trolly Weight", flex: 1, minWidth: 120, type: "number" },
      { field: "busket_weight", headerName: "Basket Weight", flex: 1, minWidth: 120, type: "number" },
    ],
    []
  );

  return (
    <IndexWrapper
      title="Trolly Master"
      columns={columns}
      rows={rows}
      loading={loading}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      rowCount={totalRows}
      search={{
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search trolly name / department",
        debounceDelayMs: 1000,
      }}
      createAction={{ onClick: openCreateDialog, label: "Create Trolly" }}
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

      <CreateTrolly
        open={createDialogOpen}
        onClose={closeCreateDialog}
        mode="create"
        trollyId={null}
      />
      {editId && (
        <CreateTrolly
          open={editDialogOpen}
          onClose={closeEditDialog}
          mode="edit"
          trollyId={editId}
        />
      )}
    </IndexWrapper>
  );
}
