"use client";

import * as React from "react";
import { Box, Typography } from "@mui/material";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
  WidthPicksBlock,
  WidthPicksReadingRow,
} from "@/app/dashboardportal/juteSQC/widthPicks/types";
import SqcReportShell from "../_shared/SqcReportShell";
import SqcEntryReportTabs from "../_shared/SqcEntryReportTabs";
import WidthPicksSqcPage from "@/app/dashboardportal/juteSQC/widthPicks/page";
import ReportTable, { type ReportColumn } from "../_shared/ReportTable";
import { fmt, pctOf } from "../_shared/reportStats";
import { useSqcReportData, useSqcReportFilters } from "../_shared/useSqcReport";

const COLUMNS_PER_SHEET = 3;

function WidthBlock({ b }: { b: WidthPicksBlock }) {
  const low = b.width_summary.tol_low;
  const high = b.width_summary.tol_high;
  // The register circles any loom narrower than the standard width.
  const out = (r: WidthPicksReadingRow) =>
    r.width_cm != null && b.std_width_cm != null && r.width_cm < b.std_width_cm;
  const columns: ReportColumn<WidthPicksReadingRow>[] = [
    {
      label: "Loom No",
      render: (r) => r.mech_code ?? r.loom_name ?? r.loom_id,
    },
    { label: "Width (cm)", render: (r) => fmt(r.width_cm, 1), flag: out },
    { label: "Picks/dm", render: (r) => fmt(r.picks_dm, 0) },
  ];

  // Split the loom list into side-by-side columns like the register page.
  const perCol = Math.ceil(b.rows.length / COLUMNS_PER_SHEET) || 1;
  const chunks = Array.from({ length: COLUMNS_PER_SHEET }, (_, i) =>
    b.rows.slice(i * perCol, (i + 1) * perCol),
  ).filter((c) => c.length);

  return (
    <Box>
      <Typography fontWeight={700}>
        Loom Width Check — {b.item_name ?? b.item_code ?? "Cloth"} (
        {fmt(b.std_width_cm, 1)} cm)
      </Typography>
      <Typography variant="body2" color="text.secondary" className="mb-1">
        Tolerance {fmt(low, 1)} – {fmt(high, 1)} cm · Std Picks{" "}
        {fmt(b.std_picks, 0)}
        {b.inspector_name ? ` · Checked by ${b.inspector_name}` : ""}
      </Typography>
      <Box className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {chunks.map((c, i) => (
          <ReportTable key={i} columns={columns} rows={c} />
        ))}
      </Box>
      <Box className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        <span>Looms checked = {b.rows.length}</span>
        <span>Avg Width = {fmt(b.width_summary.avg_width, 2)} cm</span>
        <span>Below std width = {fmt(pctOf(b.rows, out), 0)} %</span>
        <span>Avg Picks = {fmt(b.picks_summary.avg_picks, 1)}</span>
        {b.width_summary.remark && (
          <span>Remark: {b.width_summary.remark}</span>
        )}
      </Box>
    </Box>
  );
}

function WidthCheckReport() {
  const filters = useSqcReportFilters();
  const { data, loading, error } = useSqcReportData<{
    blocks: WidthPicksBlock[];
  }>(
    apiRoutesPortalMasters.WIDTH_PICKS_BY_DATE,
    filters.coId,
    filters.branchId,
    filters.entryDate,
  );
  const blocks = data?.blocks ?? [];

  return (
    <SqcReportShell
      title="Width Check Report"
      filters={filters}
      loading={loading}
      error={error}
      isEmpty={!blocks.length}
    >
      {blocks.map((b) => (
        <WidthBlock key={b.width_picks_id} b={b} />
      ))}
    </SqcReportShell>
  );
}

export default function WidthCheckReportPage() {
  return (
    <SqcEntryReportTabs
      entries={[
        { label: "Width & Picks", render: () => <WidthPicksSqcPage /> },
      ]}
      report={<WidthCheckReport />}
    />
  );
}
