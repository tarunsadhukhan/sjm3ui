"use client";
import React, { useEffect, useMemo } from "react";
import { Box, Alert, CircularProgress, Typography } from "@mui/material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useBatchCostReport } from "../hooks/useBatchCostReport";
import type { BatchCostReportRow } from "../types/reportTypes";

interface BatchCostReportProps {
  branchId: number | null;
  date: string;
}

/** Format a number to 2 decimal places */
function fmtWeight(value: unknown): string {
  if (value == null) return "";
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

/** Format currency value in Indian numbering */
const inrFormatter = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function fmtCurrency(value: unknown): string {
  if (value == null) return "";
  const n = Number(value);
  return Number.isFinite(n) ? inrFormatter.format(n) : "";
}

const columns: GridColDef<BatchCostReportRow>[] = [
  {
    field: "yarn_type_name",
    headerName: "Yarn Type",
    flex: 1,
    minWidth: 140,
  },
  {
    field: "item_name",
    headerName: "Jute Quality",
    flex: 1,
    minWidth: 160,
  },
  {
    field: "planned_weight",
    headerName: "Planned Wt (kg)",
    type: "number",
    width: 140,
    valueFormatter: (value: unknown) => fmtWeight(value),
  },
  {
    field: "actual_weight",
    headerName: "Actual Wt (kg)",
    type: "number",
    width: 140,
    valueFormatter: (value: unknown) => fmtWeight(value),
  },
  {
    field: "actual_rate",
    headerName: "Rate (per qtl)",
    type: "number",
    width: 130,
    valueFormatter: (value: unknown) => fmtWeight(value),
  },
  {
    field: "issue_value",
    headerName: "Value",
    type: "number",
    width: 140,
    valueFormatter: (value: unknown) => fmtCurrency(value),
  },
  {
    field: "variance",
    headerName: "Variance (kg)",
    type: "number",
    width: 130,
    renderCell: (params: GridRenderCellParams<BatchCostReportRow, number>) => {
      const val = params.value;
      if (val == null) return "";
      const n = Number(val);
      if (!Number.isFinite(n)) return "";
      const color = n >= 0 ? "green" : "red";
      return (
        <Box component="span" sx={{ color, fontWeight: 500 }}>
          {n.toFixed(2)}
        </Box>
      );
    },
  },
];

export default function BatchCostReport({ branchId, date }: BatchCostReportProps) {
  const { rows, loading, error, loadReport } = useBatchCostReport();

  useEffect(() => {
    if (branchId != null && date) {
      loadReport(branchId, date);
    }
  }, [branchId, date, loadReport]);

  const getRowId = useMemo(
    () => (row: BatchCostReportRow) => `${row.yarn_type_id}-${row.item_id}`,
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
              sortModel: [{ field: "yarn_type_name", sort: "asc" }],
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
