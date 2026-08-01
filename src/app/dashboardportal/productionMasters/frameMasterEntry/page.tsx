"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import { Edit as EditIcon } from "lucide-react";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import CreateFrame from "./createFrame";
import { fetchFrameTable } from "@/utils/frameService";

type FrameRow = {
  id: number;
  frame_details_mst_id: number;
  mc_id: number;
  machine_name: string;
  speed: number | null;
  frame_type: string | null;
  bobbin_weight: number | null;
  no_of_spindle: number | null;
};

export default function FrameMasterEntryPage() {
  const [rows, setRows] = useState<FrameRow[]>([]);
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
      const { data, error } = await fetchFrameTable(
        paginationModel.page + 1,
        paginationModel.pageSize,
        searchQuery
      );
      if (error || !data) throw new Error(error || "Failed to fetch frame list");

      const mapped = (data.data || []).map((row: FrameRow) => ({
        ...row,
        id: row.frame_details_mst_id,
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
            onClick={() => openEditDialog(params.row.frame_details_mst_id)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Edit"
            aria-label="Edit"
          >
            <EditIcon size={18} />
          </button>
        ),
      },
      { field: "machine_name", headerName: "Frame No", flex: 1, minWidth: 150 },
      { field: "frame_type", headerName: "Frame Type", flex: 1, minWidth: 130 },
      { field: "speed", headerName: "Speed (RPM)", flex: 1, minWidth: 110, type: "number" },
      { field: "bobbin_weight", headerName: "Bobbin Weight", flex: 1, minWidth: 120, type: "number" },
      { field: "no_of_spindle", headerName: "No. of Spindles", flex: 1, minWidth: 120, type: "number" },
    ],
    []
  );

  return (
    <IndexWrapper
      title="Frame Master"
      columns={columns}
      rows={rows}
      loading={loading}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      rowCount={totalRows}
      search={{
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search frame no / frame type",
        debounceDelayMs: 1000,
      }}
      createAction={{ onClick: openCreateDialog, label: "Create Frame" }}
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

      <CreateFrame
        open={createDialogOpen}
        onClose={closeCreateDialog}
        mode="create"
        frameDetailsMstId={null}
      />
      {editId && (
        <CreateFrame
          open={editDialogOpen}
          onClose={closeEditDialog}
          mode="edit"
          frameDetailsMstId={editId}
        />
      )}
    </IndexWrapper>
  );
}
