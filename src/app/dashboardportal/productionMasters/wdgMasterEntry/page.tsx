"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import { Edit as EditIcon } from "lucide-react";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import CreateWindingQuality from "./createWindingQuality";
import { fetchWindingQualityTable } from "@/utils/windingQualityService";

type WindingQuality = {
  id: number;
  wng_quality_mst_id: number;
  wng_quality: string;
  target_prod: number | null;
  spool_cop: string | null;
};

const SPOOL_COP_LABELS: Record<string, string> = { S: "Spool", C: "Cop" };

export default function WdgMasterEntryPage() {
  const [rows, setRows] = useState<WindingQuality[]>([]);
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
      const { data, error } = await fetchWindingQualityTable(
        paginationModel.page + 1,
        paginationModel.pageSize,
        searchQuery
      );
      if (error || !data) throw new Error(error || "Failed to fetch winding qualities");

      const mapped = (data.data || []).map((row: WindingQuality) => ({
        ...row,
        id: row.wng_quality_mst_id ?? row.id,
      }));
      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error fetching data";
      setSnackbar({ open: true, message, severity: "error" });
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
            onClick={() => openEditDialog(params.row.wng_quality_mst_id)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Edit"
            aria-label="Edit"
          >
            <EditIcon size={18} />
          </button>
        ),
      },
      { field: "wng_quality", headerName: "Wdg Quality", flex: 1, minWidth: 180 },
      { field: "target_prod", headerName: "Target Prod", flex: 1, minWidth: 120, type: "number" },
      {
        field: "spool_cop",
        headerName: "Spool / Cop",
        flex: 1,
        minWidth: 120,
        valueFormatter: (value: unknown) =>
          typeof value === "string" ? SPOOL_COP_LABELS[value] ?? value : "",
      },
    ],
    []
  );

  return (
    <IndexWrapper
      title="Winding Quality Master"
      columns={columns}
      rows={rows}
      loading={loading}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      rowCount={totalRows}
      search={{
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search wdg quality",
        debounceDelayMs: 1000,
      }}
      createAction={{ onClick: openCreateDialog, label: "Create Wdg Quality" }}
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

      <CreateWindingQuality
        open={createDialogOpen}
        onClose={closeCreateDialog}
        mode="create"
        wngQualityMstId={null}
      />
      {editId && (
        <CreateWindingQuality
          open={editDialogOpen}
          onClose={closeEditDialog}
          mode="edit"
          wngQualityMstId={editId}
        />
      )}
    </IndexWrapper>
  );
}
