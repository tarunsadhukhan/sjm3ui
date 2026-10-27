"use client";

import * as React from "react";
import { Box, Typography } from "@mui/material";
import { apiRoutesPortalMasters } from "@/utils/api";
import type {
  BagCheckBagRow,
  BagCheckBlock,
} from "@/app/dashboardportal/juteSQC/bagCheck/types";
import SqcReportShell from "../_shared/SqcReportShell";
import SqcEntryReportTabs from "../_shared/SqcEntryReportTabs";
import BagCheckSqcPage from "@/app/dashboardportal/juteSQC/bagCheck/page";
import ReportTable, { type ReportColumn } from "../_shared/ReportTable";
import { fmt, hyLt, pctOf } from "../_shared/reportStats";
import { useSqcReportData, useSqcReportFilters } from "../_shared/useSqcReport";

const below = (v: number | null, std: number | null) =>
  v != null && std != null && v < std;

function BagBlock({ b }: { b: BagCheckBlock }) {
  const agg = b.aggregates;
  const columns: ReportColumn<BagCheckBagRow>[] = [
    { label: "Sl No", render: (r) => r.sl_no },
    {
      label: "Length (cm)",
      render: (r) => fmt(r.length_cm, 1),
      flag: (r) => below(r.length_cm, b.std_length),
    },
    {
      label: "Width (cm)",
      render: (r) => fmt(r.width_cm, 1),
      flag: (r) => below(r.width_cm, b.std_width),
    },
    {
      label: "Ends/dm",
      render: (r) => fmt(r.ends_dm, 0),
      flag: (r) => below(r.ends_dm, b.std_ends),
    },
    {
      label: "Picks/dm",
      render: (r) => fmt(r.picks_dm, 0),
      flag: (r) => below(r.picks_dm, b.std_picks),
    },
    {
      label: "Stitch/dm",
      render: (r) => fmt(r.stitch_dm, 0),
      flag: (r) => below(r.stitch_dm, b.std_stitch),
    },
    { label: "Bag Wt (gm)", render: (r) => fmt(r.bag_wt_gm, 0) },
    { label: "MR %", render: (r) => fmt(r.mr_pct, 1) },
    {
      label: "Corr Wt (gm)",
      render: (r) => fmt(r.corr_wt_gm, 0),
      flag: (r) => below(r.corr_wt_gm, b.std_bag_weight),
    },
    { label: "Remarks", render: (r) => r.defects ?? "", align: "left" },
  ];

  const bags = b.bags;
  const dimShort = pctOf(
    bags,
    (r) => below(r.length_cm, b.std_length) || below(r.width_cm, b.std_width),
  );
  const stitchShort = pctOf(bags, (r) => below(r.stitch_dm, b.std_stitch));
  const aboveStd = pctOf(
    bags,
    (r) =>
      r.corr_wt_gm != null &&
      b.std_bag_weight != null &&
      r.corr_wt_gm > b.std_bag_weight,
  );
  const std = (v: number | null, d = 0) => (v == null ? "" : fmt(v, d));

  return (
    <Box>
      <Typography fontWeight={700}>
        {b.item_name ?? b.bag_type_label ?? "Bag"} — {std(b.std_length)} cm ×{" "}
        {std(b.std_width)} cm — {std(b.std_bag_weight)} gm/bag
        {b.vendor_name ? ` (${b.vendor_name})` : ""}
        {b.id_code ? ` [${b.id_code}]` : ""}
      </Typography>
      <Typography variant="body2" color="text.secondary" className="mb-1">
        Std: Ends {std(b.std_ends)} · Picks {std(b.std_picks)} · Stitch{" "}
        {std(b.std_stitch)} · MR {std(b.std_mr_pct, 1)}%
      </Typography>
      <ReportTable
        columns={columns}
        rows={bags}
        footer={[
          "Avg",
          fmt(agg.length_cm?.avg, 1),
          fmt(agg.width_cm?.avg, 1),
          fmt(agg.ends_dm?.avg, 1),
          fmt(agg.picks_dm?.avg, 1),
          fmt(agg.stitch_dm?.avg, 1),
          fmt(agg.bag_wt_gm?.avg, 1),
          fmt(agg.mr_pct?.avg, 1),
          fmt(agg.corr_wt_gm?.avg, 1),
          "",
        ]}
      />
      <Box className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
        <span>
          Actual Bag Wt = {fmt(agg.bag_wt_gm?.avg, 1)} gm (
          {hyLt(b.obs_hy_lt_pct)})
        </span>
        <span>Actual MR = {fmt(agg.mr_pct?.avg, 1)} %</span>
        <span>
          Corrected Bag Wt = {fmt(agg.corr_wt_gm?.avg, 1)} gm (
          {hyLt(b.corr_hy_lt_pct)})
        </span>
        <span>
          Above {std(b.std_bag_weight)} gm = {fmt(aboveStd, 0)} %
        </span>
        <span>Dimension short = {fmt(dimShort, 0)} %</span>
        <span>Stitch/dm short = {fmt(stitchShort, 0)} %</span>
      </Box>
    </Box>
  );
}

function JuteBagTestReport() {
  const filters = useSqcReportFilters();
  const { data, loading, error } = useSqcReportData<{
    blocks: BagCheckBlock[];
  }>(
    apiRoutesPortalMasters.BAG_CHECK_BY_DATE,
    filters.coId,
    filters.branchId,
    filters.entryDate,
  );
  const blocks = data?.blocks ?? [];

  return (
    <SqcReportShell
      title="Jute Bag Test Report"
      filters={filters}
      loading={loading}
      error={error}
      isEmpty={!blocks.length}
    >
      {blocks.map((b) => (
        <BagBlock key={b.bag_check_id} b={b} />
      ))}
    </SqcReportShell>
  );
}

export default function JuteBagTestReportPage() {
  return (
    <SqcEntryReportTabs
      entries={[{ label: "Bag Checking", render: () => <BagCheckSqcPage /> }]}
      report={<JuteBagTestReport />}
    />
  );
}
