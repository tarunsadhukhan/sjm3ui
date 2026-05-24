"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Snackbar, Alert, Chip, IconButton, Tooltip } from "@mui/material";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useRouter } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import BomTreeEditor from "@/app/dashboardportal/BomCosting/itemBomMaster/_components/BomTreeEditor";

type BomItem = {
  id: number;
  item_id: number;
  item_code: string;
  full_item_code?: string;
  item_name: string;
  item_group_name: string;
  component_count: number;
  bom_hdr_id: number | null;
  bom_version: number | null;
  version_label: string | null;
  costing_status: string | null;
  total_cost: number | null;
  [key: string]: any;
};

export default function ItemBomMasterPage() {
  const router = useRouter();
  const [rows, setRows] = useState<BomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ pageSize: 10, page: 0 });
  const [totalRows, setTotalRows] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BomItem | null>(null);

  const fetchBomList = async () => {
    setLoading(true);
    try {
      const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
      const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";
      const queryParams = new URLSearchParams({
        co_id: co_id,
      });
      if (searchQuery) {
        queryParams.append("search", searchQuery);
      }
      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.BOM_LIST}?${queryParams}`,
        "GET"
      );
      if (error || !data) {
        throw new Error(error || "Failed to fetch BOM list");
      }
      const mappedRows = (data.data || []).map((row: any) => ({
        ...row,
        id: row.item_id ?? row.id,
      }));
      setRows(mappedRows);
      setTotalRows(mappedRows.length);
    } catch (error: any) {
      setSnackbar({ open: true, message: error.message || "Error fetching BOM list", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBomList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page, paginationModel.pageSize, searchQuery]);

  const handlePaginationModelChange = (newPaginationModel: GridPaginationModel) => {
    setPaginationModel(newPaginationModel);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handleView = (row: BomItem) => {
    setSelectedItem(row);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setSelectedItem(null);
    fetchBomList();
  };

  const columns = useMemo<GridColDef<BomItem>[]>(() => ([
    { field: "full_item_code", headerName: "Item Code", flex: 1, minWidth: 180,
      valueGetter: (_value: string, row: BomItem) => row.full_item_code || row.item_code || "-",
    },
    { field: "item_name", headerName: "Item Name", flex: 1.5, minWidth: 180 },
    { field: "item_group_name", headerName: "Item Group", flex: 1, minWidth: 140 },
    { field: "component_count", headerName: "Components", flex: 0.5, minWidth: 90, type: "number" },
    {
      field: "bom_version",
      headerName: "Cost Ver",
      flex: 0.4,
      minWidth: 70,
      renderCell: (params: GridRenderCellParams<BomItem>) =>
        params.row.bom_version != null
          ? `v${params.row.bom_version}${params.row.version_label ? ` (${params.row.version_label})` : ""}`
          : "-",
    },
    {
      field: "total_cost",
      headerName: "Total Cost",
      flex: 0.7,
      minWidth: 100,
      type: "number",
      valueFormatter: (value: number | null) =>
        value && value > 0 ? `\u20B9 ${value.toLocaleString("en-IN")}` : "-",
    },
    {
      field: "costing_status",
      headerName: "Costing",
      flex: 0.5,
      minWidth: 80,
      renderCell: (params: GridRenderCellParams<BomItem>) =>
        params.row.costing_status ? (
          <Chip label={params.row.costing_status} size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
        ) : (
          "-"
        ),
    },
    {
      field: "__cost_sheet",
      headerName: "",
      width: 40,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<BomItem>) =>
        params.row.bom_hdr_id ? (
          <Tooltip title="Open Cost Sheet">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                router.push(
                  `/dashboardportal/BomCosting/bomCosting/costSheet?mode=edit&bom_hdr_id=${params.row.bom_hdr_id}`
                );
              }}
            >
              <FileSpreadsheet size={15} />
            </IconButton>
          </Tooltip>
        ) : null,
    },
  ]), [router]);

  return (
    <IndexWrapper
      title="Item BOM Master"
      rows={rows}
      columns={columns}
      rowCount={totalRows}
      paginationModel={paginationModel}
      onPaginationModelChange={handlePaginationModelChange}
      loading={loading}
      showLoadingUntilLoaded
      search={{ value: searchQuery, onChange: handleSearchChange, placeholder: "Search items with BOM", debounceDelayMs: 1000 }}
      createAction={{ onClick: () => {
        setSelectedItem(null);
        setEditorOpen(true);
      }}}
      onView={handleView}
    >
      <BomTreeEditor
        open={editorOpen}
        onClose={handleCloseEditor}
        item={selectedItem}
        onSnackbar={(message, severity) => setSnackbar({ open: true, message, severity })}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}