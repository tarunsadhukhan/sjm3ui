"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { exportReportExcel } from "@/utils/excelReportExport";
import {
  AbsentRow,
  ReportColumn,
  ReportRow,
  buildAbsentRows,
} from "./absentRows";

interface DeptOption {
  dept_id: number;
  dept_name: string;
}

interface ReportResponse {
  columns: ReportColumn[];
  data: ReportRow[];
}

interface SetupResponse {
  departments: DeptOption[];
}

interface Filters {
  fromDate: string;
  toDate: string;
  deptId: string; // "" means All
  minAbsent: string; // show only employees with >= N absent days; "0" = all
}

function getCoId(): string {
  if (typeof window === "undefined") return "";
  const raw = localStorage.getItem("sidebar_selectedCompany");
  if (!raw) return "";
  try {
    return JSON.parse(raw).co_id?.toString() ?? "";
  } catch {
    return "";
  }
}

function getDateOffset(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function EmpAbsentReportPage() {
  const { selectedBranches } = useSidebarContext();
  const branchKey = useMemo(
    () => (selectedBranches ?? []).join(","),
    [selectedBranches],
  );

  const [filters, setFilters] = useState<Filters>({
    fromDate: getDateOffset(15),
    toDate: getToday(),
    deptId: "",
    minAbsent: "1",
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<Filters>(filters);
  const [searchText, setSearchText] = useState("");

  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [columns, setColumns] = useState<ReportColumn[]>([]);
  const [rows, setRows] = useState<AbsentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Departments are scoped to the selected branch.
  useEffect(() => {
    const coId = getCoId();
    if (!coId) return;
    (async () => {
      const params = new URLSearchParams({ co_id: coId });
      if (branchKey) params.append("branch_id", branchKey);
      const { data, error: err } = await fetchWithCookie(
        `${apiRoutesPortalMasters.EMP_ATTENDANCE_REPORT_SETUP}?${params.toString()}`,
        "GET",
      );
      if (err || !data) return;
      const setup = data as SetupResponse;
      setDepartments(setup.departments ?? []);
      setFilters((f) => {
        if (!f.deptId) return f;
        const stillValid = (setup.departments ?? []).some(
          (d) => String(d.dept_id) === f.deptId,
        );
        return stillValid ? f : { ...f, deptId: "" };
      });
    })();
  }, [branchKey]);

  const loadReport = useCallback(async () => {
    const coId = getCoId();
    if (!coId) {
      setError("No company selected");
      return;
    }
    if (!filters.fromDate || !filters.toDate) {
      setError("From date and To date are required");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Reuse the attendance report in daily mode: every joined employee
      // with per-day hours. Absence is derived client-side (0 hours = A).
      const params = new URLSearchParams({
        co_id: coId,
        mode: "daily",
        from_date: filters.fromDate,
        to_date: filters.toDate,
        scope: "all",
        att_type: "all",
      });
      if (branchKey) params.append("branch_id", branchKey);
      if (filters.deptId) params.append("dept_id", filters.deptId);

      const { data, error: err } = await fetchWithCookie(
        `${apiRoutesPortalMasters.EMP_ATTENDANCE_REPORT}?${params.toString()}`,
        "GET",
      );
      if (err || !data) throw new Error(err || "Failed to load report");
      const resp = data as ReportResponse;
      setColumns(resp.columns ?? []);
      setRows(buildAbsentRows(resp.columns ?? [], resp.data ?? []));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error loading report");
      setColumns([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters, branchKey]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const openFilter = useCallback(() => {
    setDraftFilters(filters);
    setFilterOpen(true);
  }, [filters]);

  const applyFilter = useCallback(() => {
    setFilters(draftFilters);
    setFilterOpen(false);
  }, [draftFilters]);

  // Search + min-absent filter, shared by the grid and the Excel export.
  const visibleRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const minAbsent = Number(filters.minAbsent) || 0;
    return rows.filter(
      (r) =>
        r.absent >= minAbsent &&
        (!q ||
          r.emp_code.toLowerCase().includes(q) ||
          r.emp_name.toLowerCase().includes(q)),
    );
  }, [rows, searchText, filters.minAbsent]);

  const handleExportExcel = useCallback(async () => {
    if (!columns.length || !visibleRows.length) return;
    await exportReportExcel<AbsentRow>({
      title: `Employee Absent Report for the period from ${filters.fromDate} to ${filters.toDate}`,
      sheetName: "Absent",
      fileName: `EmpAbsent_${filters.fromDate}_to_${filters.toDate}.xlsx`,
      cols: [
        { header: "Emp Code", width: 12, text: true, value: (r) => r.emp_code },
        { header: "Name", width: 26, text: true, value: (r) => r.emp_name },
        { header: "Status", width: 12, text: true, value: (r) => r.status },
        {
          header: "Department",
          width: 18,
          text: true,
          value: (r) => r.department,
        },
        { header: "Days", width: 8, value: (r) => r.days },
        { header: "Present", width: 8, value: (r) => r.present },
        { header: "Absent", width: 8, value: (r) => r.absent },
        ...columns.map((c) => ({
          header: c.label,
          width: 7,
          text: true,
          value: (r: AbsentRow) => r.marks[c.key] ?? "A",
        })),
      ],
      rows: visibleRows,
    });
  }, [columns, visibleRows, filters]);

  const gridColumns = useMemo<GridColDef[]>(() => {
    const fixed: GridColDef[] = [
      { field: "emp_code", headerName: "Emp Code", width: 110 },
      { field: "emp_name", headerName: "Name", width: 180 },
      { field: "status", headerName: "Status", width: 110 },
      { field: "department", headerName: "Department", width: 150 },
      {
        field: "days",
        headerName: "Days",
        width: 70,
        type: "number",
        align: "right",
        headerAlign: "center",
      },
      {
        field: "present",
        headerName: "Present",
        width: 80,
        type: "number",
        align: "right",
        headerAlign: "center",
      },
      {
        field: "absent",
        headerName: "Absent",
        width: 80,
        type: "number",
        align: "right",
        headerAlign: "center",
      },
    ];
    const dynamic: GridColDef[] = columns.map((c) => ({
      field: c.key,
      headerName: c.label,
      width: 62,
      align: "center",
      headerAlign: "center",
      sortable: false,
      cellClassName: (params) =>
        params.value === "A" ? "absent-cell" : "present-cell",
    }));
    return [...fixed, ...dynamic];
  }, [columns]);

  const gridRows = useMemo(
    () => visibleRows.map((r) => ({ ...r, ...r.marks })),
    [visibleRows],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{ color: "#0C3C60", fontWeight: "bold", mb: 2 }}
      >
        Employee Absent Report
      </Typography>

      <Paper elevation={1} sx={{ mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            p: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Period:{" "}
            <strong>
              {filters.fromDate} to {filters.toDate}
            </strong>
            {filters.deptId && departments.length
              ? ` | Dept: ${
                  departments.find((d) => String(d.dept_id) === filters.deptId)
                    ?.dept_name ?? filters.deptId
                }`
              : ""}
            {Number(filters.minAbsent) > 0
              ? ` | Absent >= ${filters.minAbsent} days`
              : ""}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              placeholder="Search emp code / name"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              sx={{ minWidth: 240 }}
            />
            <Button variant="contained" onClick={openFilter}>
              Filter
            </Button>
            <Button
              variant="outlined"
              onClick={handleExportExcel}
              disabled={loading || !visibleRows.length}
            >
              Excel
            </Button>
          </Stack>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ position: "relative", width: "100%" }}>
        {loading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
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
          {mounted && (
            <DataGrid
              rows={gridRows}
              columns={gridColumns}
              pageSizeOptions={[10, 20, 25, 50, 100]}
              initialState={{
                pagination: { paginationModel: { page: 0, pageSize: 20 } },
                sorting: {
                  sortModel: [{ field: "absent", sort: "desc" }],
                },
              }}
              disableRowSelectionOnClick
              rowHeight={32}
              columnHeaderHeight={36}
              sx={{
                "& .MuiDataGrid-columnHeader": {
                  backgroundColor: "#3ea6da",
                  color: "white",
                  fontWeight: "bold",
                },
                "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
                "& .absent-cell": { color: "error.main", fontWeight: 700 },
                "& .present-cell": { color: "text.disabled" },
              }}
            />
          )}
        </Box>
      </Box>

      {/* Filter popup */}
      <Dialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Filter</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              type="date"
              label="From Date"
              value={draftFilters.fromDate}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, fromDate: e.target.value }))
              }
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              type="date"
              label="To Date"
              value={draftFilters.toDate}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, toDate: e.target.value }))
              }
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              select
              label="Department"
              value={draftFilters.deptId}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, deptId: e.target.value }))
              }
              fullWidth
            >
              <MenuItem value="">All</MenuItem>
              {departments.map((d) => (
                <MenuItem key={d.dept_id} value={String(d.dept_id)}>
                  {d.dept_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="number"
              label="Min Absent Days (0 = show all employees)"
              value={draftFilters.minAbsent}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, minAbsent: e.target.value }))
              }
              slotProps={{ htmlInput: { min: 0 } }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFilterOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={applyFilter}>
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
