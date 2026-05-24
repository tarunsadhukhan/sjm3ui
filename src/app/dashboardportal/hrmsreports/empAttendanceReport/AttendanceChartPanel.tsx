"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

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

type ChartKind = "day" | "department" | "day_dept" | "day_pa";

interface AttendanceChartPanelProps {
  coId: string;
  branchKey: string;
  departments: DeptOption[];
  initialFromDate: string;
  initialToDate: string;
}

function getNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return isFinite(n) ? n : 0;
}

const CHART_OPTIONS: { value: ChartKind; label: string }[] = [
  { value: "day", label: "Day-wise Attendance" },
  { value: "department", label: "Department-wise Attendance" },
  { value: "day_dept", label: "Day & Department-wise Attendance" },
  { value: "day_pa", label: "Day-wise Present and Absent" },
];

export default function AttendanceChartPanel({
  coId,
  branchKey,
  departments,
  initialFromDate,
  initialToDate,
}: AttendanceChartPanelProps) {
  const [fromDate, setFromDate] = useState(initialFromDate);
  const [toDate, setToDate] = useState(initialToDate);
  const [deptId, setDeptId] = useState("");
  const [chartKind, setChartKind] = useState<ChartKind>("day");

  const [columns, setColumns] = useState<ReportColumn[]>([]);
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!coId) {
      setError("No company selected");
      return;
    }
    if (!fromDate || !toDate) {
      setError("From date and To date are required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        co_id: coId,
        mode: "daily",
        from_date: fromDate,
        to_date: toDate,
        scope: "all",
        att_type: "all",
      });
      if (branchKey) params.append("branch_id", branchKey);
      if (deptId) params.append("dept_id", deptId);
      const { data, error: err } = await fetchWithCookie(
        `${apiRoutesPortalMasters.EMP_ATTENDANCE_REPORT}?${params.toString()}`,
        "GET",
      );
      if (err || !data) throw new Error(err || "Failed to load chart data");
      const resp = data as ReportResponse;
      setColumns(resp.columns ?? []);
      setRows(resp.data ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error loading chart data");
      setColumns([]);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [coId, branchKey, fromDate, toDate, deptId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Aggregations
  // Backend returns hours per (employee, day) in `daily` mode. For the
  // chart we display ATTENDANCE IN DAYS, so divide hours by 8.
  const HOURS_PER_DAY = 8;
  const toDays = (hours: number) =>
    Math.round((hours / HOURS_PER_DAY) * 100) / 100;

  const dayWise = useMemo(() => {
    const labels = columns.map((c) => c.label);
    const totals = columns.map((c) =>
      toDays(
        rows.reduce((acc, r) => acc + getNum(r.values?.[c.key]), 0),
      ),
    );
    return { labels, totals };
  }, [columns, rows]);

  const deptWise = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = r.department || "(Unassigned)";
      map.set(key, (map.get(key) ?? 0) + getNum(r.total));
    }
    const entries = Array.from(map.entries())
      .map(([d, hours]) => [d, toDays(hours)] as const)
      .sort((a, b) => b[1] - a[1]);
    return {
      labels: entries.map(([d]) => d),
      totals: entries.map(([, v]) => v),
    };
  }, [rows]);

  const dayDeptWise = useMemo(() => {
    const depts = Array.from(
      new Set(rows.map((r) => r.department || "(Unassigned)")),
    );
    const series = depts.map((d) => {
      const data = columns.map((c) =>
        toDays(
          rows
            .filter((r) => (r.department || "(Unassigned)") === d)
            .reduce((acc, r) => acc + getNum(r.values?.[c.key]), 0),
        ),
      );
      return { label: d, data };
    });
    return { labels: columns.map((c) => c.label), series };
  }, [columns, rows]);

  const dayPresentAbsent = useMemo(() => {
    const total = rows.length;
    const labels = columns.map((c) => c.label);
    const present = columns.map(
      (c) => rows.filter((r) => getNum(r.values?.[c.key]) > 0).length,
    );
    const absent = present.map((p) => Math.max(total - p, 0));
    return { labels, present, absent };
  }, [columns, rows]);

  const renderChart = () => {
    if (chartKind === "day") {
      return (
        <BarChart
          height={420}
          xAxis={[{ data: dayWise.labels, label: "Date" }]}
          yAxis={[{ label: "Hands" }]}
          series={[
            { data: dayWise.totals, label: "Hands", color: "#0C3C60" },
          ]}
        />
      );
    }
    if (chartKind === "department") {
      return (
        <BarChart
          height={420}
          xAxis={[{ data: deptWise.labels, label: "Department" }]}
          yAxis={[{ label: "Hands" }]}
          series={[
            { data: deptWise.totals, label: "Hands", color: "#3ea6da" },
          ]}
        />
      );
    }
    if (chartKind === "day_dept") {
      return (
        <BarChart
          height={460}
          xAxis={[{ data: dayDeptWise.labels, label: "Date" }]}
          yAxis={[{ label: "Hands" }]}
          series={dayDeptWise.series.map((s) => ({
            label: s.label,
            data: s.data,
            stack: "total",
          }))}
        />
      );
    }
    return (
      <BarChart
        height={420}
        xAxis={[{ data: dayPresentAbsent.labels, label: "Date" }]}
        yAxis={[{ label: "Employees" }]}
        series={[
          {
            label: "Present",
            data: dayPresentAbsent.present,
            color: "#2e7d32",
            stack: "pa",
          },
          {
            label: "Absent",
            data: dayPresentAbsent.absent,
            color: "#c62828",
            stack: "pa",
          },
        ]}
      />
    );
  };

  // appended below renderChart logic via switch

  const hasData =
    (chartKind === "day" && dayWise.totals.some((v) => v > 0)) ||
    (chartKind === "department" && deptWise.totals.some((v) => v > 0)) ||
    (chartKind === "day_dept" &&
      dayDeptWise.series.some((s) => s.data.some((v) => v > 0))) ||
    (chartKind === "day_pa" &&
      (dayPresentAbsent.present.some((v) => v > 0) ||
        dayPresentAbsent.absent.some((v) => v > 0)));

  return (
    <Box>
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          alignItems={{ md: "center" }}
        >
          <TextField
            type="date"
            label="From Date"
            size="small"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            type="date"
            label="To Date"
            size="small"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ minWidth: 160 }}
          />
          <TextField
            select
            size="small"
            label="Department"
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            sx={{ minWidth: 200 }}
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
            size="small"
            label="Chart For"
            value={chartKind}
            onChange={(e) => setChartKind(e.target.value as ChartKind)}
            sx={{ minWidth: 260 }}
          >
            {CHART_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            onClick={loadData}
            disabled={loading}
          >
            Show
          </Button>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={1} sx={{ p: 2, position: "relative", minHeight: 460 }}>
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
        {!loading && !hasData ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", py: 6 }}
          >
            No attendance data for the selected filters.
          </Typography>
        ) : (
          renderChart()
        )}
      </Paper>
    </Box>
  );
}
