"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Snackbar, Alert } from "@mui/material";
import { Edit as EditIcon } from "lucide-react";
import CreateYarnQuality from "./createYarnQuality";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchYarnQualityTable } from "@/utils/yarnQualityService";
import { useRouter } from "next/navigation";

type YarnQuality = {
  id: number;
  yarn_quality_id: number;
  quality_code: string;
  branch_name: string;
  yarn_type_name: string;
  twist_per_inch: number;
  std_count: number;
  std_doff: number;
  std_wt_doff: number;
  target_eff: number;
  is_active: number;
  [key: string]: any;
};

export default function YarnQualityMasterPage() {
  const [rows, setRows] = useState<YarnQuality[]>([]);
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
  const [editYarnQualityId, setEditYarnQualityId] = useState<number | null>(null);
  const router = useRouter();

  // Fetch yarn quality records from API
  const fetchYarnQualities = async () => {
    setLoading(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";

      if (!co_id) {
        throw new Error("Company not selected");
      }

      const { data, error } = await fetchYarnQualityTable(
        co_id,
        paginationModel.page + 1,
        paginationModel.pageSize,
        searchQuery
      );

      if (error || !data) {
        throw new Error(error || "Failed to fetch yarn qualities");
      }

      const mappedRows = (data.data || []).map((row: any) => ({
        ...row,
        id: row.yarn_quality_id ?? row.id,
        is_active: typeof row.is_active === "string" ? Number(row.is_active) : row.is_active,
      }));

      setRows(mappedRows);
      setTotalRows(data.total || 0);
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || "Error fetching yarn qualities", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchYarnQualities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  const handlePaginationModelChange = (newPaginationModel: GridPaginationModel) => {
    setPaginationModel(newPaginationModel);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchValue = event.target.value;
    setSearchQuery(newSearchValue);
    setPaginationModel((prev) => ({ ...prev, page: 0 }));
  };

  const openCreateDialog = () => {
    setCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setCreateDialogOpen(false);
    fetchYarnQualities();
  };

  const openEditDialog = (yarnQualityId: number) => {
    setEditYarnQualityId(yarnQualityId);
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditYarnQualityId(null);
    fetchYarnQualities();
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
            onClick={() => openEditDialog(params.row.yarn_quality_id)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Edit"
            aria-label="Edit"
          >
            <EditIcon size={18} />
          </button>
        ),
      },
      { field: "quality_code", headerName: "Quality Code", flex: 1, minWidth: 150 },
      { field: "branch_name", headerName: "Branch", flex: 1, minWidth: 150 },
      { field: "yarn_type_name", headerName: "Yarn Type", flex: 1, minWidth: 150 },
      { field: "twist_per_inch", headerName: "Twist/Inch", flex: 1, minWidth: 120, type: "number" },
      { field: "std_count", headerName: "Std Count", flex: 1, minWidth: 120, type: "number" },
      { field: "std_doff", headerName: "Std Doff", flex: 1, minWidth: 120, type: "number" },
      { field: "std_wt_doff", headerName: "Std Wt Doff", flex: 1, minWidth: 120, type: "number" },
      { field: "target_eff", headerName: "Target Eff", flex: 1, minWidth: 120, type: "number" },
      {
        field: "is_active",
        headerName: "Active",
        flex: 0.8,
        minWidth: 100,
        renderCell: (params) => (params.value === 1 ? "Yes" : "No"),
      },
    ],
    []
  );

  return (
    <IndexWrapper
      title="Yarn Quality Master"
      columns={columns}
      rows={rows}
      loading={loading}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      rowCount={totalRows}
      search={{ value: searchQuery, onChange: handleSearchChange, placeholder: "Search quality code or yarn type", debounceDelayMs: 1000 }}
      createAction={{ onClick: openCreateDialog, label: "Create Yarn Quality" }}
    >
      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <CreateYarnQuality
        open={createDialogOpen}
        onClose={closeCreateDialog}
        mode="create"
        yarnQualityId={null}
      />
      {editYarnQualityId && (
        <CreateYarnQuality
          open={editDialogOpen}
          onClose={closeEditDialog}
          mode="edit"
          yarnQualityId={editYarnQualityId}
        />
      )}
    </IndexWrapper>
  );
}
