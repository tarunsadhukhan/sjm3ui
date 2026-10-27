"use client";

import * as React from "react";
import { Box, Typography } from "@mui/material";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
  QrCv15aGroup,
  QrCv15aReading,
} from "@/app/dashboardportal/juteSQC/qrCv15a/types";
import type {
  SqcCountByDateResponse,
  SqcCountReadingRow,
} from "@/app/dashboardportal/juteSQC/spinning/types/sqcSpinningTypes";
import SqcReportShell from "../_shared/SqcReportShell";
import SqcEntryReportTabs from "../_shared/SqcEntryReportTabs";
import QrCv15aSqcPage from "@/app/dashboardportal/juteSQC/qrCv15a/page";
import SpinningSqcPage from "@/app/dashboardportal/juteSQC/spinning/page";
import ReportTable, { type ReportColumn } from "../_shared/ReportTable";
import { cvPct, fmt, groupBy, mean, stdev } from "../_shared/reportStats";
import { useSqcReportData, useSqcReportFilters } from "../_shared/useSqcReport";

function BreakingStrength({ g }: { g: QrCv15aGroup }) {
  const s = g.stats;
  const pctOfCount = (v: number | null) =>
    v != null && g.observed_count ? (v / g.observed_count) * 100 : null;
  const columns: ReportColumn<QrCv15aReading>[] = [
    { label: "No", render: (r) => r.reading_no },
    {
      label: "Breaking Strength (lbs)",
      render: (r) =>
        `${fmt(r.reading_val)}${r.reading_val === s.min ? "  Min" : r.reading_val === s.max ? "  Max" : ""}`,
      flag: (r) =>
        r.reading_val != null &&
        (r.reading_val === s.min || r.reading_val === s.max),
    },
  ];
  return (
    <Box>
      <Typography fontWeight={700}>
        {g.item_name ?? g.item_code ?? "Yarn"} — Frame No{" "}
        {g.mech_code ?? g.machine_name ?? "-"}
        {g.drawing_mech_code ? ` (Drawing ${g.drawing_mech_code})` : ""}
      </Typography>
      <Box className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ReportTable columns={columns} rows={g.readings} />
        <Box className="flex flex-col gap-1 text-sm">
          <span>Yarn Wt (count) = {fmt(g.observed_count)} lbs</span>
          <span>MR = {fmt(g.mr_pct, 1)} %</span>
          <span>ATS = {fmt(s.avg_bs)} lbs</span>
          <span>SD = {fmt(s.std_dev, 3)}</span>
          <span>St. CV % = {fmt(s.cv_pct)} %</span>
          <span>QR = {fmt(s.qr_pct)} %</span>
          <span>
            QR at Min = {fmt(s.qr_at_min)} · QR at Max ={" "}
            {fmt(pctOfCount(s.max))}
          </span>
          <span>
            Range = ({fmt(s.min)} – {fmt(s.max)}) lbs ={" "}
            {fmt(s.max != null && s.min != null ? s.max - s.min : null)} lbs
          </span>
        </Box>
      </Box>
    </Box>
  );
}

type CountRow = {
  frame: string;
  dptp: string;
  gist: number | null;
  mr: number | null;
  regain: number | null;
  note: string;
  avg?: boolean;
};

/** Flattens one quality's count readings into register rows: readings per frame, then the frame's average line. */
function buildCountRows(readings: SqcCountReadingRow[]): CountRow[] {
  const rows: CountRow[] = [];
  for (const [, frameRows] of groupBy(readings, (r) =>
    String(r.mc_id ?? r.mech_code ?? ""),
  )) {
    const regains = frameRows.map((r) => r.corrected_count ?? null);
    frameRows.forEach((r, i) =>
      rows.push({
        frame: i === 0 ? (r.mech_code ?? r.machine_name ?? "-") : "",
        dptp:
          i === 0 && (r.dp != null || r.tp != null)
            ? `${r.dp ?? "-"}/${r.tp ?? "-"}`
            : "",
        gist: r.observed_count,
        mr: r.mr_pct ?? null,
        regain: r.corrected_count ?? null,
        note: "",
      }),
    );
    rows.push({
      frame: "",
      dptp: "Avg",
      gist: mean(frameRows.map((r) => r.observed_count)),
      mr: mean(frameRows.map((r) => r.mr_pct)),
      regain: mean(regains),
      note: `SD = ${fmt(stdev(regains), 3)} · CV = ${fmt(cvPct(regains))} %`,
      avg: true,
    });
  }
  return rows;
}

const countColumns: ReportColumn<CountRow>[] = [
  { label: "Frame No", render: (r) => r.frame },
  { label: "DP/TP", render: (r) => r.dptp },
  { label: "Actual Gist (lbs)", render: (r) => fmt(r.gist) },
  { label: "MR %", render: (r) => fmt(r.mr, r.avg ? 2 : 1) },
  { label: "Regain Wt (lbs)", render: (r) => fmt(r.regain) },
  { label: "CV %", render: (r) => r.note, align: "left" },
];

function YarnTestReport() {
  const filters = useSqcReportFilters();
  const { coId, branchId, entryDate } = filters;
  const qr = useSqcReportData<{ groups: QrCv15aGroup[] }>(
    apiRoutesPortalMasters.QR_CV_15A_BY_DATE,
    coId,
    branchId,
    entryDate,
  );
  const count = useSqcReportData<SqcCountByDateResponse>(
    apiRoutesPortalMasters.SPINNING_SQC_COUNT_BY_DATE,
    coId,
    branchId,
    entryDate,
  );
  const groups = qr.data?.groups ?? [];
  const readings = count.data?.readings ?? [];
  const averages = count.data?.averages ?? [];

  return (
    <SqcReportShell
      title="Yarn Test Report"
      filters={filters}
      loading={qr.loading || count.loading}
      error={qr.error ?? count.error}
      isEmpty={!groups.length && !readings.length}
    >
      {groups.length > 0 && (
        <Box className="flex flex-col gap-4">
          <Typography
            variant="subtitle1"
            fontWeight={700}
            className="underline"
          >
            Yarn Breaking Strength
          </Typography>
          {groups.map((g) => (
            <BreakingStrength key={g.qr_cv_15a_id} g={g} />
          ))}
        </Box>
      )}
      {readings.length > 0 && (
        <Box className="flex flex-col gap-4">
          <Typography
            variant="subtitle1"
            fontWeight={700}
            className="underline"
          >
            Yarn Count (Actual Gist / MR / Regain)
          </Typography>
          {groupBy(readings, (r) => String(r.item_id)).map(([itemId, rows]) => (
            <Box key={itemId}>
              <Typography fontWeight={700}>
                Count — {rows[0].item_name ?? rows[0].item_code ?? itemId}
              </Typography>
              <ReportTable columns={countColumns} rows={buildCountRows(rows)} />
            </Box>
          ))}
          <Box className="flex flex-col gap-1 text-sm">
            <Typography fontWeight={700}>
              Quality-wise Average (Regain Wt)
            </Typography>
            {averages.map((a) => (
              <span key={a.item_id}>
                {a.item_name ?? a.item_code} —{" "}
                {fmt(a.avg_corrected ?? a.avg_count)} lbs
              </span>
            ))}
          </Box>
        </Box>
      )}
    </SqcReportShell>
  );
}

export default function YarnTestReportPage() {
  return (
    <SqcEntryReportTabs
      entries={[
        {
          label: "Yarn Breaking Strength (QR / CV)",
          render: () => <QrCv15aSqcPage />,
        },
        {
          label: "Yarn Count (Spinning SQC)",
          render: () => <SpinningSqcPage />,
        },
      ]}
      report={<YarnTestReport />}
    />
  );
}
