"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import { Edit as EditIcon } from "lucide-react";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import CreateSpinningQuality from "./createSpinningQuality";
import { fetchSpinningQualityTable } from "@/utils/spinningQualityService";

type SpinningQuality = {
  id: number;
  spg_quality_mst_id: number;
  spg_quality: string;
  spg_type_name: string;
  branch_name: string;
  speed: number;
  tpi: number;
  std_count: number;
  no_of_spindles: number;
  frame_type: string;
  target_eff: number;
  [key: string]: any;
};

export default function SpgMasterEntryPage() {
  const [rows, setRows] = useState<SpinningQuality[]>([]);
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

      const { data, error } = await fetchSpinningQualityTable(
        co_id,
        paginationModel.page + 1,
        paginationModel.pageSize,
        searchQuery
      );
      if (error || !data) throw new Error(error || "Failed to fetch spinning qualities");

      const mapped = (data.data || []).map((row: any) => ({
        ...row,
        id: row.spg_quality_mst_id ?? row.id,
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
            onClick={() => openEditDialog(params.row.spg_quality_mst_id)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Edit"
            aria-label="Edit"
          >
            <EditIcon size={18} />
          </button>
        ),
      },
      { field: "spg_quality", headerName: "Spg Quality", flex: 1, minWidth: 150 },
      { field: "branch_name", headerName: "Branch", flex: 1, minWidth: 150 },
      { field: "spg_type_name", headerName: "Spinning Group", flex: 1, minWidth: 150 },
      { field: "speed", headerName: "Speed", flex: 1, minWidth: 100, type: "number" },
      { field: "tpi", headerName: "TPI", flex: 1, minWidth: 100, type: "number" },
      { field: "std_count", headerName: "Std Count", flex: 1, minWidth: 110, type: "number" },
      { field: "no_of_spindles", headerName: "No. of Spindles", flex: 1, minWidth: 130, type: "number" },
      { field: "frame_type", headerName: "Frame Type", flex: 1, minWidth: 120 },
      { field: "target_eff", headerName: "Target Eff", flex: 1, minWidth: 110, type: "number" },
    ],
    []
  );

  return (
    <IndexWrapper
      title="Spinning Quality Master"
      columns={columns}
      rows={rows}
      loading={loading}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      rowCount={totalRows}
      search={{
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search spg quality / type / frame",
        debounceDelayMs: 1000,
      }}
      createAction={{ onClick: openCreateDialog, label: "Create Spg Quality" }}
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

      <CreateSpinningQuality
        open={createDialogOpen}
        onClose={closeCreateDialog}
        mode="create"
        spgQualityMstId={null}
      />
      {editId && (
        <CreateSpinningQuality
          open={editDialogOpen}
          onClose={closeEditDialog}
          mode="edit"
          spgQualityMstId={editId}
        />
      )}
    </IndexWrapper>
  );
}
