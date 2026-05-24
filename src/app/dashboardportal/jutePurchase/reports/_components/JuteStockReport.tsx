"use client";
import React, { useEffect, useMemo } from "react";
import { Box, Alert, CircularProgress, Typography } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useJuteStockReport } from "../hooks/useJuteStockReport";
import type { JuteStockReportRow } from "../types/reportTypes";

interface JuteStockReportProps {
  branchId: number | null;
  date: string;
}

/** Format a number to 2 decimal places */
function fmtWeight(value: unknown): string {
  if (value == null) return "";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

const columns: GridColDef<JuteStockReportRow>[] = [
  {
    field: "item_group_name",
    headerName: "Item Group",
    flex: 1,
    minWidth: 140,
  },
  {
    field: "item_name",
    headerName: "Item",
    flex: 1,
    minWidth: 160,
  },
  {
    field: "opening_weight",
    headerName: "Opening (kg)",
    type: "number",
    width: 130,
    valueFormatter: (value: unknown) => fmtWeight(value),
  },
  {
    field: "receipt_weight",
    headerName: "Receipt (kg)",
    type: "number",
    width: 130,
    valueFormatter: (value: unknown) => fmtWeight(value),
  },
  {
    field: "issue_weight",
    headerName: "Issue (kg)",
    type: "number",
    width: 120,
    valueFormatter: (value: unknown) => fmtWeight(value),
  },
  {
    field: "closing_weight",
    headerName: "Closing (kg)",
    type: "number",
    width: 130,
    valueFormatter: (value: unknown) => fmtWeight(value),
  },
  {
    field: "mtd_receipt_weight",
    headerName: "MTD Receipt (kg)",
    type: "number",
    width: 150,
    valueFormatter: (value: unknown) => fmtWeight(value),
  },
  {
    field: "mtd_issue_weight",
    headerName: "MTD Issue (kg)",
    type: "number",
    width: 140,
    valueFormatter: (value: unknown) => fmtWeight(value),
  },
];

export default function JuteStockReport({ branchId, date }: JuteStockReportProps) {
  const { rows, loading, error, loadReport } = useJuteStockReport();

  useEffect(() => {
    if (branchId != null && date) {
      loadReport(branchId, date);
    }
  }, [branchId, date, loadReport]);

  const getRowId = useMemo(
    () => (row: JuteStockReportRow) => `${row.item_grp_id}-${row.item_id}`,
    [],
  );

  if (branchId == null) {
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <Typography color="text.secondary">
          Select a branch to view the report
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative", width: "100%" }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "rgba(255,255,255,0.7)",
            zIndex: 10,
          }}
        >
          <CircularProgress />
        </Box>
      )}

      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={getRowId}
          pageSizeOptions={[25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 50 } },
            sorting: {
              sortModel: [{ field: "item_group_name", sort: "asc" }],
            },
          }}
          disableRowSelectionOnClick
          sx={{
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "#3ea6da",
              color: "white",
              fontWeight: "bold",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
            },
          }}
        />
      </Box>
    </Box>
  );
}
