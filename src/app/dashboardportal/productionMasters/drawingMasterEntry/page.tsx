"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import { Edit as EditIcon } from "lucide-react";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import CreateDrawing, { METER_TYPES, DRG_TYPES } from "./createDrawing";
import { fetchDrawingTable } from "@/utils/drawingMasterService";

type DrawingRow = {
  id: number;
  drg_mst_id: number;
  mc_id: number;
  machine_name: string;
  short_name: string | null;
  shed_type: string | null;
  drg_type: number | null;
  const_meter: number | null;
  meter_type: number;
  branch_id: number | null;
  branch_name: string | null;
};

export default function DrawingMasterEntryPage() {
  const [rows, setRows] = useState<DrawingRow[]>([]);
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
      const { data, error } = await fetchDrawingTable(
        paginationModel.page + 1,
        paginationModel.pageSize,
        searchQuery
      );
      if (error || !data) throw new Error(error || "Failed to fetch drawing master list");

      const mapped = (data.data || []).map((row: DrawingRow) => ({
        ...row,
        id: row.drg_mst_id,
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
            onClick={() => openEditDialog(params.row.drg_mst_id)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Edit"
            aria-label="Edit"
          >
            <EditIcon size={18} />
          </button>
        ),
      },
      { field: "machine_name", headerName: "Machine", flex: 1, minWidth: 150 },
      { field: "short_name", headerName: "Short Name", flex: 0.8, minWidth: 100 },
      { field: "shed_type", headerName: "Shed Type", flex: 1, minWidth: 110 },
      {
        field: "drg_type",
        headerName: "Drawing Type",
        flex: 1,
        minWidth: 120,
        valueFormatter: (value: number | null) =>
          DRG_TYPES.find((d) => d.value === value)?.label ?? value ?? "",
      },
      { field: "const_meter", headerName: "Const Meter", flex: 1, minWidth: 110, type: "number" },
      {
        field: "meter_type",
        headerName: "Meter Type",
        flex: 1,
        minWidth: 110,
        valueFormatter: (value: number | null) =>
          METER_TYPES.find((m) => m.value === value)?.label ?? value ?? "",
      },
      { field: "branch_name", headerName: "Branch", flex: 1, minWidth: 130 },
    ],
    []
  );

  return (
    <IndexWrapper
      title="Drawing Master"
      columns={columns}
      rows={rows}
      loading={loading}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      rowCount={totalRows}
      search={{
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search machine / short name / shed",
        debounceDelayMs: 1000,
      }}
      createAction={{ onClick: openCreateDialog, label: "Create Drawing Master" }}
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

      <CreateDrawing
        open={createDialogOpen}
        onClose={closeCreateDialog}
        mode="create"
        drgMstId={null}
      />
      {editId && (
        <CreateDrawing
          open={editDialogOpen}
          onClose={closeEditDialog}
          mode="edit"
          drgMstId={editId}
        />
      )}
    </IndexWrapper>
  );
}
