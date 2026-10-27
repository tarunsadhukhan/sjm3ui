"use client";

import * as React from "react";
import { Box, Typography } from "@mui/material";
import { apiRoutesPortalMasters } from "@/utils/api";
import SqcReportShell from "../_shared/SqcReportShell";
import SqcEntryReportTabs from "../_shared/SqcEntryReportTabs";
import BreakerCardSqcPage from "@/app/dashboardportal/juteSQC/breakerCard/page";
import InterCardSqcPage from "@/app/dashboardportal/juteSQC/interCard/page";
import DrawheadSqcPage from "@/app/dashboardportal/juteSQC/drawhead/page";
import FinisherDrawingSqcPage from "@/app/dashboardportal/juteSQC/finDraw/page";
import SpreaderSqcPage from "@/app/dashboardportal/juteSQC/spreader/page";
import MorrahWeightQCPage from "@/app/dashboardportal/juteSQC/r-08-01/page";
import ReportTable, { type ReportColumn } from "../_shared/ReportTable";
import { fmt, groupBy } from "../_shared/reportStats";
import { useSqcReportData, useSqcReportFilters } from "../_shared/useSqcReport";

// Server contract: e:\sjm\sjmvowerp3be\src\juteSQC\sqc_reports.py
type SliverReading = {
  sl_no: number;
  wt: number | null;
  mr_pct: number | null;
  regain_wt: number | null;
};
type SliverBlock = {
  stage: string;
  section: string | null;
  mech_code: string | null;
  machine_name: string | null;
  quality: string | null;
  spell_code: string | null;
  std_mr_pct: number;
  readings: SliverReading[];
  avg_wt: number | null;
  avg_mr_pct: number | null;
  avg_regain_wt: number | null;
  cv_pct: number | null;
};
type MorrahSheet = {
  morrah_wt_id: number;
  trolley_no: string | null;
  inspector_name: string | null;
  department: string | null;
  jute_quality: string | null;
  avg_mr_pct: number | null;
  weights: number[];
  calc_avg_weight: number | null;
  calc_max_weight: number | null;
  calc_min_weight: number | null;
  calc_cv_pct: number | null;
  count_lt: number | null;
  count_ok: number | null;
  count_hy: number | null;
};
type SliverReport = { blocks: SliverBlock[]; morrah: MorrahSheet[] };

const columns: ReportColumn<SliverReading>[] = [
  { label: "Sl No", render: (r) => r.sl_no },
  { label: "Wt (lbs/100 yds)", render: (r) => fmt(r.wt) },
  { label: "MR %", render: (r) => fmt(r.mr_pct, 1) },
  { label: "Regain Wt (lbs)", render: (r) => fmt(r.regain_wt) },
];

function SliverMachine({ b }: { b: SliverBlock }) {
  return (
    <Box>
      <Typography fontWeight={700} variant="body2">
        {b.section ?? b.stage} M/C {b.mech_code ?? b.machine_name ?? "-"}
        {b.quality ? ` — Qua ${b.quality}` : ""}
        {b.spell_code ? ` (${b.spell_code})` : ""}
      </Typography>
      <ReportTable
        columns={columns}
        rows={b.readings}
        footer={[
          "Avg",
          fmt(b.avg_wt),
          `${fmt(b.avg_mr_pct, 2)} %`,
          `${fmt(b.avg_regain_wt)} lbs`,
        ]}
      />
      <Typography variant="caption" color="text.secondary">
        Std MR {fmt(b.std_mr_pct, 0)} % · CV {fmt(b.cv_pct)} %
      </Typography>
    </Box>
  );
}

function MorrahBlock({ m }: { m: MorrahSheet }) {
  // Two side-by-side columns of weights, as on the register.
  const half = Math.ceil(m.weights.length / 2);
  const pairs = Array.from({ length: half }, (_, i) => ({
    a: m.weights[i],
    b: m.weights[i + half],
  }));
  return (
    <Box>
      <Typography fontWeight={700} variant="body2">
        Morrah Weight (gm){m.jute_quality ? ` — ${m.jute_quality}` : ""}
        {m.trolley_no ? ` · Trolley ${m.trolley_no}` : ""}
        {m.department ? ` · ${m.department}` : ""}
      </Typography>
      <ReportTable
        columns={[
          {
            label: "Wt (gm)",
            render: (p: { a?: number; b?: number }) => p.a ?? "",
          },
          {
            label: "Wt (gm)",
            render: (p: { a?: number; b?: number }) => p.b ?? "",
          },
        ]}
        rows={pairs}
      />
      <Typography variant="body2" className="mt-1">
        Avg {fmt(m.calc_avg_weight, 0)} gm · Max {fmt(m.calc_max_weight, 0)} ·
        Min {fmt(m.calc_min_weight, 0)} · CV {fmt(m.calc_cv_pct)} % · LT/OK/HY{" "}
        {m.count_lt ?? 0}/{m.count_ok ?? 0}/{m.count_hy ?? 0}
      </Typography>
    </Box>
  );
}

function SliverWeightReport() {
  const filters = useSqcReportFilters();
  const { data, loading, error } = useSqcReportData<SliverReport>(
    apiRoutesPortalMasters.SQC_REPORT_SLIVER_WEIGHT,
    filters.coId,
    filters.branchId,
    filters.entryDate,
  );
  const blocks = data?.blocks ?? [];
  const morrah = data?.morrah ?? [];

  return (
    <SqcReportShell
      title="Sliver Weight Report"
      filters={filters}
      loading={loading}
      error={error}
      isEmpty={!blocks.length && !morrah.length}
    >
      {groupBy(blocks, (b) => b.stage).map(([stage, rows]) => (
        <Box key={stage}>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            className="mb-2 underline"
          >
            {stage}
          </Typography>
          <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {rows.map((b, i) => (
              <SliverMachine key={i} b={b} />
            ))}
          </Box>
        </Box>
      ))}
      {morrah.length > 0 && (
        <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {morrah.map((m) => (
            <MorrahBlock key={m.morrah_wt_id} m={m} />
          ))}
        </Box>
      )}
    </SqcReportShell>
  );
}

export default function SliverWeightReportPage() {
  return (
    <SqcEntryReportTabs
      entries={[
        { label: "Breaker Card", render: () => <BreakerCardSqcPage /> },
        {
          label: "Inter Card / Tow Breaker / Hopper",
          render: () => <InterCardSqcPage />,
        },
        {
          label: "Drawhead / Finisher Card",
          render: () => <DrawheadSqcPage />,
        },
        { label: "Finisher Drawing", render: () => <FinisherDrawingSqcPage /> },
        {
          label: "Spreader (Sliver + Roll)",
          render: () => <SpreaderSqcPage />,
        },
        { label: "Morrah Weight", render: () => <MorrahWeightQCPage /> },
      ]}
      report={<SliverWeightReport />}
    />
  );
}
