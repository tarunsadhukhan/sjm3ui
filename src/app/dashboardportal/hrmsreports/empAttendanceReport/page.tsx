"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  SyntheticEvent,
} from "react";
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import AttendanceChartPanel from "./AttendanceChartPanel";

type Mode = "daily" | "fnwise" | "monthly";
type TabKind = Mode | "chart";

interface DeptOption {
  dept_id: number;
  dept_name: string;
}

interface ReportColumn {
  key: string;
  label: string;
}

interface ReportRow {
  emp_code: string;
  emp_name: string;
  status?: string;
  department: string;
  values: Record<string, number>;
  total: number;
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
  lessThan: string; // "" or "0" means no filter
  scope: "all" | "working"; // all joined employees vs only those who worked
  attType: "all" | "regular" | "ot"; // attendance type filter
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

const TAB_MODES: { label: string; mode: TabKind }[] = [
  { label: "Daily", mode: "daily" },
  { label: "FN Wise", mode: "fnwise" },
  { label: "Monthly", mode: "monthly" },
  { label: "Chart", mode: "chart" },
];

export default function EmpAttendanceReportPage() {
  const { selectedBranches } = useSidebarContext();
  const branchKey = useMemo(
    () => (selectedBranches ?? []).join(","),
    [selectedBranches],
  );

  const [activeTab, setActiveTab] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    fromDate: getDateOffset(15),
    toDate: getToday(),
    deptId: "",
    lessThan: "",
    scope: "all",
    attType: "all",
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<Filters>(filters);
  const [searchText, setSearchText] = useState("");

  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [columns, setColumns] = useState<ReportColumn[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeKind: TabKind = TAB_MODES[activeTab].mode;
  const isChart = activeKind === "chart";
  const mode: Mode = isChart ? "daily" : (activeKind as Mode);

  // Load setup whenever the branch selection changes (departments are
  // scoped to the selected branch).
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
      // If the previously selected dept is no longer valid, clear it.
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
    if (isChart) return;
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
      const params = new URLSearchParams({
        co_id: coId,
        mode,
        from_date: filters.fromDate,
        to_date: filters.toDate,
      });
      if (branchKey) params.append("branch_id", branchKey);
      if (filters.deptId) params.append("dept_id", filters.deptId);
      params.append("scope", filters.scope);
      params.append("att_type", filters.attType);
      if (filters.lessThan && filters.lessThan !== "0") {
        params.append("less_than", filters.lessThan);
      }

      const { data, error: err } = await fetchWithCookie(
        `${apiRoutesPortalMasters.EMP_ATTENDANCE_REPORT}?${params.toString()}`,
        "GET",
      );
      if (err || !data) throw new Error(err || "Failed to load report");
      const resp = data as ReportResponse;
      setColumns(resp.columns ?? []);
      setRows(resp.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error loading report");
      setColumns([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters, mode, branchKey, isChart]);

  // Auto-load on tab change or filter apply.
  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleTabChange = useCallback(
    (_: SyntheticEvent, v: number) => setActiveTab(v),
    [],
  );

  const openFilter = useCallback(() => {
    setDraftFilters(filters);
    setFilterOpen(true);
  }, [filters]);

  const applyFilter = useCallback(() => {
    setFilters(draftFilters);
    setFilterOpen(false);
  }, [draftFilters]);

  // Excel/CSV export of the currently loaded report.
  const handleExportExcel = useCallback(async () => {
    if (!columns.length || !rows.length) return;
    const ExcelJS = (await import("exceljs")).default;
    const { saveAs } = await import("file-saver");

    const modeLabel =
      mode === "daily" ? "Daily" : mode === "fnwise" ? "FN Wise" : "Monthly";
    const heading = `${modeLabel} Attendance Report for the period from ${filters.fromDate} to ${filters.toDate}`;

    const filtered = (() => {
      const q = searchText.trim().toLowerCase();
      return q
        ? rows.filter(
            (r) =>
              (r.emp_code ?? "").toLowerCase().includes(q) ||
              (r.emp_name ?? "").toLowerCase().includes(q),
          )
        : rows;
    })();

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(modeLabel);

    const headers = [
      "Emp Code",
      "Name",
      "Status",
      "Department",
      "Total",
      ...columns.map((c) => c.label),
    ];
    const totalCols = headers.length;

    // Title row
    ws.mergeCells(1, 1, 1, totalCols);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = heading;
    titleCell.font = { bold: true, size: 14, color: { argb: "FF0C3C60" } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 24;

    // Header row
    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF3EA6DA" },
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });
    headerRow.height = 22;

    // Data rows
    for (const r of filtered) {
      const row = ws.addRow([
        r.emp_code,
        r.emp_name,
        r.status ?? "",
        r.department,
        r.total,
        ...columns.map((c) => r.values?.[c.key] ?? 0),
      ]);
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        if (colNumber >= 5) {
          cell.alignment = { horizontal: "right" };
          cell.numFmt = mode === "daily" ? "0.0" : "0.00";
        }
      });
    }

    // Column widths
    ws.getColumn(1).width = 12; // Emp Code
    ws.getColumn(2).width = 26; // Name
    ws.getColumn(3).width = 12; // Status
    ws.getColumn(4).width = 18; // Department
    ws.getColumn(5).width = 10; // Total
    for (let i = 6; i <= totalCols; i++) ws.getColumn(i).width = 9;

    ws.views = [{ state: "frozen", xSplit: 5, ySplit: 2 }];

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const fileTag =
      mode === "daily" ? "Daily" : mode === "fnwise" ? "FN" : "Monthly";
    saveAs(
      blob,
      `EmpAttendance_${fileTag}_${filters.fromDate}_to_${filters.toDate}.xlsx`,
    );
  }, [columns, rows, mode, filters, searchText]);

  // Build DataGrid columns.
  const gridColumns = useMemo<GridColDef[]>(() => {
    const fixed: GridColDef[] = [
      { field: "emp_code", headerName: "Emp Code", width: 110 },
      { field: "emp_name", headerName: "Name", width: 180 },
      { field: "status", headerName: "Status", width: 110 },
      { field: "department", headerName: "Department", width: 150 },
    ];
    const totalCol: GridColDef = {
      field: "total",
      headerName: "Total",
      width: 90,
      type: "number",
      align: "right",
      headerAlign: "center",
    };
    // Date columns: pick the smallest width that still fits the header label.
    // Daily headers like "01/04" need ~62px; monthly like "Jan'26" ~70px;
    // fortnight names can be longer — fall back to 90 for those.
    const isDateLike = (label: string) =>
      /^\d{2}\/\d{2}$/.test(label) ||
      /^[A-Z][a-z]{2}'\d{2}$/.test(label);
    const dynamic: GridColDef[] = columns.map((c) => ({
      field: c.key,
      headerName: c.label,
      width: isDateLike(c.label) ? 62 : 90,
      type: "number",
      align: "right",
      headerAlign: "center",
      sortable: false,
    }));
    return [...fixed, totalCol, ...dynamic];
  }, [columns]);

  const gridRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (r) =>
            (r.emp_code ?? "").toLowerCase().includes(q) ||
            (r.emp_name ?? "").toLowerCase().includes(q),
        )
      : rows;
    return filtered.map((r, idx) => ({
      id: `${r.emp_code}-${idx}`,
      emp_code: r.emp_code,
      emp_name: r.emp_name,
      status: r.status ?? "",
      department: r.department,
      total: r.total,
      ...r.values,
    }));
  }, [rows, searchText]);

  const periodLabel = useMemo(() => {
    return `${filters.fromDate} to ${filters.toDate}`;
  }, [filters]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{ color: "#0C3C60", fontWeight: "bold", mb: 2 }}
      >
        Employee Attendance Report
      </Typography>

      <Paper elevation={1} sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": { textTransform: "none", fontWeight: 600 },
            "& .Mui-selected": { color: "#0C3C60" },
            "& .MuiTabs-indicator": { backgroundColor: "#0C3C60" },
          }}
        >
          {TAB_MODES.map((t) => (
            <Tab key={t.mode} label={t.label} />
          ))}
        </Tabs>

        {!isChart && (
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
            Period: <strong>{periodLabel}</strong>
            {filters.deptId && departments.length
              ? ` | Dept: ${
                  departments.find(
                    (d) => String(d.dept_id) === filters.deptId,
                  )?.dept_name ?? filters.deptId
                }`
              : ""}
            {filters.lessThan && filters.lessThan !== "0"
              ? ` | Less than ${filters.lessThan} days`
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
              disabled={loading || !rows.length}
            >
              Excel
            </Button>
          </Stack>
        </Box>
        )}
      </Paper>

      {isChart ? (
        <AttendanceChartPanel
          coId={typeof window !== "undefined" ? getCoId() : ""}
          branchKey={branchKey}
          departments={departments}
          initialFromDate={filters.fromDate}
          initialToDate={filters.toDate}
        />
      ) : (
      <>
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
              }}
            />
          )}
        </Box>
      </Box>
      </>
      )}

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
              select
              label="Employees"
              value={draftFilters.scope}
              onChange={(e) =>
                setDraftFilters((f) => ({
                  ...f,
                  scope: e.target.value === "working" ? "working" : "all",
                }))
              }
              fullWidth
              helperText="All = every joined employee. Working = only those who attended in the period."
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="working">Working</MenuItem>
            </TextField>
            <TextField
              select
              label="Attendance Type"
              value={draftFilters.attType}
              onChange={(e) => {
                const v = e.target.value;
                setDraftFilters((f) => ({
                  ...f,
                  attType:
                    v === "regular" ? "regular" : v === "ot" ? "ot" : "all",
                }));
              }}
              fullWidth
            >
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="regular">Regular</MenuItem>
              <MenuItem value="ot">OT</MenuItem>
            </TextField>
            <TextField
              type="number"
              label="Less than No. of Days (0 = no filter)"
              value={draftFilters.lessThan}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, lessThan: e.target.value }))
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
