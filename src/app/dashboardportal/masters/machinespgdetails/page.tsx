"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import CreateMachineSpgDetailsPage from "./CreateMachineSpgDetailsPage";
import ViewMachineSpgDetailsPage from "./ViewMachineSpgDetailsPage";
import EditMachineSpgDetailsPage from "./EditMachineSpgDetailsPage";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";

type Row = {
  id?: string | number;
  mc_spg_det_id?: string | number;
  machine_name?: string;
  speed?: number;
  no_of_spindle?: number;
  weight_per_spindle?: number;
  branch_name?: string;
  is_active?: number | boolean | string;
};

export default function MachineSpgDetailsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [totalRows, setTotalRows] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [viewDialogOpen, setViewDialogOpen] = useState<boolean>(false);
  const [editDialogOpen, setEditDialogOpen] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const fetchMachineSpgDetails = async (): Promise<void> => {
    setLoading(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const selectedBranches = localStorage.getItem("sidebar_selectedBranches");
      let branch_ids = "";
      if (selectedBranches) {
        try {
          const parsed = JSON.parse(selectedBranches);
          if (Array.isArray(parsed)) {
            const ids = parsed
              .map((b: any) => {
                if (b && typeof b === "object") return b.branch_id ?? b.id ?? b.value ?? "";
                if (b === 0) return "0";
                if (b) return String(b);
                return "";
              })
              .map(String)
              .filter(Boolean);
            branch_ids = ids.join(",");
          } else if (parsed) {
            branch_ids = String(parsed);
          }
        } catch (e) {
          /* ignore malformed branch cache */
        }
      }

      const queryParams = new URLSearchParams({
        page: String((paginationModel.page ?? 0) + 1),
        limit: String(paginationModel.pageSize ?? 10),
        co_id,
        branch_id: branch_ids,
      });
      if (searchQuery) queryParams.append("search", searchQuery);

      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.MACHINE_SPG_DETAILS_TABLE}?${queryParams}`,
        "GET"
      ) as any;

      if (error || !data) throw new Error(error || "Failed to fetch");

      const mapped = (data.data || []).map((r: any) => ({
        ...r,
        id: r.mc_spg_det_id ?? r.id,
        mc_spg_det_id: r.mc_spg_det_id ?? r.id,
        machine_name: r.machine_name,
        speed: r.speed,
        no_of_spindle: r.no_of_spindle,
        weight_per_spindle: r.weight_per_spindle,
        branch_name: r.branch_name,
        is_active: typeof r.is_active === "string" ? Number(r.is_active) : r.is_active,
      }));

      setRows(mapped);
      setTotalRows(data.total || 0);
    } catch (err: any) {
      setSnackbar({ open: true, message: err?.message || "Error fetching", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachineSpgDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  const handlePaginationModelChange = (newModel: GridPaginationModel) => setPaginationModel(newModel);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSearchQuery(v);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const openCreate = () => setCreateOpen(true);
  const closeCreate = () => setCreateOpen(false);

  const handleView = (row: Row) => {
    const id = row.mc_spg_det_id ?? row.id;
    if (!id) return;
    setSelectedId(id);
    setViewDialogOpen(true);
  };

  const handleEdit = (row: Row) => {
    const id = row.mc_spg_det_id ?? row.id;
    if (!id) return;
    setSelectedId(id);
    setEditDialogOpen(true);
  };

  const columns = useMemo<GridColDef<Row>[]>(() => [
    { field: "machine_name", headerName: "Machine Name", flex: 1, minWidth: 200 },
    { field: "speed", headerName: "Speed", flex: 0.8, minWidth: 100 },
    { field: "no_of_spindle", headerName: "No. of Spindles", flex: 0.8, minWidth: 140 },
    { field: "weight_per_spindle", headerName: "Weight/Spindle", flex: 0.8, minWidth: 140 },
    { field: "branch_name", headerName: "Branch", flex: 1, minWidth: 150 },
    {
      field: "is_active",
      headerName: "Active",
      width: 120,
      renderCell: (params: GridRenderCellParams<Row>) => <span>{params.value ? "Yes" : "No"}</span>,
    },
  ], []);

  return (
    <IndexWrapper
      title="Machine SPG Details"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      search={{ value: searchQuery, onChange: handleSearchChange, placeholder: "Search details", debounceDelayMs: 1000 }}
      createAction={{ onClick: openCreate, label: "Create New" }}
      onView={handleView}
      onEdit={handleEdit}
    >
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <CreateMachineSpgDetailsPage
        open={createOpen}
        onClose={() => {
          closeCreate();
          fetchMachineSpgDetails();
        }}
        existingRows={rows}
      />

      {selectedId !== null ? (
        <ViewMachineSpgDetailsPage
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            setSelectedId(null);
          }}
          mc_spg_det_id={selectedId}
        />
      ) : null}

      {selectedId !== null ? (
        <EditMachineSpgDetailsPage
          open={editDialogOpen}
          onClose={(saved?: boolean) => {
            setEditDialogOpen(false);
            setSelectedId(null);
            if (saved) fetchMachineSpgDetails();
          }}
          mc_spg_det_id={selectedId}
          existingRows={rows}
        />
      ) : null}
    </IndexWrapper>
  );
}
