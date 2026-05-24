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

type Mode = "daily" | "fnwise" | "monthly";

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
  deptId: string;
  lessThan: string;
  scope: "all" | "working";
  attType: "all" | "regular" | "ot";
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

const TAB_MODES: { label: string; mode: Mode }[] = [
  { label: "Daily", mode: "daily" },
  { label: "FN Wise", mode: "fnwise" },
  { label: "Monthly", mode: "monthly" },
];

const formatAmount = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!isFinite(n)) return "";
  return n === 0 ? "" : n.toFixed(2);
};

export default function EmpWagesReportPage() {
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

  const mode: Mode = TAB_MODES[activeTab].mode;

  // Load setup whenever the branch selection changes.
  useEffect(() => {
    const coId = getCoId();
    if (!coId) return;
    (async () => {
      const params = new URLSearchParams({ co_id: coId });
      if (branchKey) params.append("branch_id", branchKey);
      const { data, error: err } = await fetchWithCookie(
        `${apiRoutesPortalMasters.EMP_WAGES_REPORT_SETUP}?${params.toString()}`,
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
        `${apiRoutesPortalMasters.EMP_WAGES_REPORT}?${params.toString()}`,
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
  }, [filters, mode, branchKey]);

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
      width: 110,
      type: "number",
      align: "right",
      headerAlign: "center",
      valueFormatter: (v: unknown) => formatAmount(v),
    };
    const isDateLike = (label: string) =>
      /^\d{2}\/\d{2}$/.test(label) ||
      /^[A-Z][a-z]{2}'\d{2}$/.test(label);
    const dynamic: GridColDef[] = columns.map((c) => ({
      field: c.key,
      headerName: c.label,
      width: isDateLike(c.label) ? 80 : 110,
      type: "number",
      align: "right",
      headerAlign: "center",
      sortable: false,
      valueFormatter: (v: unknown) => formatAmount(v),
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

  const periodLabel = useMemo(
    () => `${filters.fromDate} to ${filters.toDate}`,
    [filters],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{ color: "#0C3C60", fontWeight: "bold", mb: 2 }}
      >
        Employee Wages Report
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
