"use client";

/**
 * Shared drawing-stage sliver-weight SQC page (R-08-08..10 Drawhead, R-08-12..14 Finisher
 * Drawing). Both backend modules are clones of card_sliver_wt with two deltas each, so one
 * parameterized component serves both routes:
 *   - variant "finDraw":  sections HESS/SWP/SWT, per-cut DLV numbers, id fin_draw_sliver_wt_id
 *   - variant "drawhead": sections DRAWHEAD_SWT, DRAWHEAD_SWP, FINISHER_CARD; AM/PM time band;
 *     id draw_sliver_wt_id
 *
 * Tabs: Entry (day's grid, save via create endpoint), By Date (saved rows + backend-computed
 * section/grand averages, delete action), History (paginated table).
 */

import * as React from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Snackbar,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Plus, Trash2 } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import MuiDataGrid from "@/components/ui/muiDataGrid";

// ─── Constants ──────────────────────────────────────────────────────────────

const SAMPLE_SIZE = 4;
// Drawing-stage std MR% — mirrors the backend's DRAW_STD_MR_PCT (preview only; the
// backend recomputes and persists the authoritative stats).
const DRAW_STD_MR_PCT = 16;

// ─── Variant configs ────────────────────────────────────────────────────────

export type SliverVariantKey = "finDraw" | "drawhead";

type VariantConfig = {
  title: string;
  subtitle: string;
  /** Primary-key field name in row payloads returned by the backend. */
  idField: string;
  /** finDraw carries 4 per-cut delivery (DLV) numbers per row. */
  hasDlv: boolean;
  /** drawhead carries an optional MORNING/AFTERNOON time band per row. */
  hasTimeBand: boolean;
  routes: { setup: string; create: string; byDate: string; table: string; del: string };
};

const VARIANTS: Record<SliverVariantKey, VariantConfig> = {
  finDraw: {
    title: "Finisher Drawing SQC",
    subtitle: "Sliver weight uniformity — 4 cuts (LB per 5 yds) + MR% + DLV per reading",
    idField: "fin_draw_sliver_wt_id",
    hasDlv: true,
    hasTimeBand: false,
    routes: {
      setup: apiRoutesPortalMasters.FIN_DRAW_SLIVER_WT_SETUP,
      create: apiRoutesPortalMasters.FIN_DRAW_SLIVER_WT_CREATE,
      byDate: apiRoutesPortalMasters.FIN_DRAW_SLIVER_WT_BY_DATE,
      table: apiRoutesPortalMasters.FIN_DRAW_SLIVER_WT_TABLE,
      del: apiRoutesPortalMasters.FIN_DRAW_SLIVER_WT_DELETE,
    },
  },
  drawhead: {
    title: "Drawhead SQC",
    subtitle: "Sliver weight uniformity — 4 cuts (LB per 5 yds) + MR% per reading",
    idField: "draw_sliver_wt_id",
    hasDlv: false,
    hasTimeBand: true,
    routes: {
      setup: apiRoutesPortalMasters.DRAW_SLIVER_WT_SETUP,
      create: apiRoutesPortalMasters.DRAW_SLIVER_WT_CREATE,
      byDate: apiRoutesPortalMasters.DRAW_SLIVER_WT_BY_DATE,
      table: apiRoutesPortalMasters.DRAW_SLIVER_WT_TABLE,
      del: apiRoutesPortalMasters.DRAW_SLIVER_WT_DELETE,
    },
  },
};

// ─── Types (backend contract shapes) ────────────────────────────────────────

type SpellOption = {
  spell_id: number;
  spell_code: string;
  spell_name: string | null;
  working_hours: number | null;
};

type MachineOption = {
  machine_id: number;
  machine_name: string;
  mech_code: string | null;
  machine_type_name: string | null;
  dept_id: number | null;
  dept_name: string | null;
  branch_id: number | null;
};

type BatchOption = {
  batch_plan_id: number;
  plan_name: string | null;
  branch_id: number | null;
  line_qty: number;
};

/** One saved reading row (by-date / setup entries / history table). */
type SliverRow = {
  entry_date: string | null;
  section: string | null;
  time_band?: string | null;
  spell_id: number | null;
  spell_code: string | null;
  mc_id: number | null;
  machine_name: string | null;
  mech_code: string | null;
  batch_plan_id: number | null;
  batch_plan_name: string | null;
  weights?: number[] | null;
  mr_pcts?: number[] | null;
  dlv_nos?: (number | null)[] | null;
  std_mr_pct: number | null;
  calc_wt: number | null;
  calc_mr_pct: number | null;
  calc_corr_wt: number | null;
  calc_sdev: number | null;
  calc_cv_pct: number | null;
  cv_within_band: number | null;
  [key: string]: unknown;
};

type SectionAvg = {
  section: string;
  row_count: number;
  avg_obs: number | null;
  avg_mr_pct: number | null;
  avg_corr_wt: number | null;
  avg_sdev: number | null;
  avg_cv_pct: number | null;
};

type GrandAvg = {
  batch_plan_id: number;
  batch_plan_name: string | null;
  row_count: number;
  grand_obs: number | null;
  grand_mr_pct: number | null;
  grand_corr_wt: number | null;
  grand_cv_pct: number | null;
  std_cv_high: number | null;
  cv_within_band: number | null;
};

type SetupData = {
  sections: string[];
  time_bands?: string[];
  spells: SpellOption[];
  machines: MachineOption[];
  batches: BatchOption[];
  entries: SliverRow[];
};

type ByDateData = {
  rows: SliverRow[];
  section_averages: SectionAvg[];
  grand_averages: GrandAvg[];
};

type CreateRowPayload = {
  section: string;
  time_band?: string | null;
  mc_id: number | null;
  spell_id: number | null;
  batch_plan_id: number | null;
  weights: number[];
  mr_pcts: number[];
  dlv_nos?: (number | null)[];
};

/** Entry-form draft row (all readings held as strings for controlled inputs). */
type DraftRow = {
  section: string;
  time_band: string;
  mc_id: number | null;
  spell_id: number | null;
  batch_plan_id: number | null;
  weights: string[];
  mr_pcts: string[];
  dlv_nos: string[];
};

type HistoryRow = {
  id: number;
  entry_date: string;
  section: string;
  time_band: string;
  machine: string;
  spell: string;
  batch: string;
  calc_wt: string;
  calc_mr_pct: string;
  calc_corr_wt: string;
  calc_sdev: string;
  calc_cv_pct: string;
};

type SnackbarState = { open: boolean; message: string; severity: "success" | "error" };

// ─── Helpers ────────────────────────────────────────────────────────────────

const todayISO = (): string => new Date().toISOString().split("T")[0];

const makeBlankDraft = (): DraftRow => ({
  section: "",
  time_band: "",
  mc_id: null,
  spell_id: null,
  batch_plan_id: null,
  weights: Array(SAMPLE_SIZE).fill(""),
  mr_pcts: Array(SAMPLE_SIZE).fill(""),
  dlv_nos: Array(SAMPLE_SIZE).fill(""),
});

const isDraftEmpty = (d: DraftRow): boolean =>
  d.section === "" &&
  d.batch_plan_id == null &&
  d.mc_id == null &&
  d.spell_id == null &&
  d.weights.every((w) => w.trim() === "") &&
  d.mr_pcts.every((m) => m.trim() === "");

/** Format a (possibly string-typed decimal from the API) number, "-" when absent. */
const fmt = (v: unknown, digits = 3): string => {
  if (v == null || v === "") return "-";
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(digits) : "-";
};

/** calc_cv_pct is persisted as a RATIO — render x100 as a percentage. */
const fmtCv = (v: unknown): string => {
  if (v == null || v === "") return "-";
  const n = Number(v);
  return Number.isFinite(n) ? (n * 100).toFixed(2) : "-";
};

const joinNums = (arr: (number | null)[] | null | undefined): string =>
  Array.isArray(arr) && arr.length > 0
    ? arr.map((v) => (v == null ? "-" : String(v))).join(" / ")
    : "-";

/** Client-side live preview mirroring the backend avg-then-correct formulas (std MR 16). */
function previewDraftStats(d: DraftRow): {
  avgW: string;
  avgM: string;
  corrWt: string;
  sdev: string;
  cv: string;
} | null {
  const w = d.weights.map(Number);
  const m = d.mr_pcts.map(Number);
  if (d.weights.some((x) => x.trim() === "") || d.mr_pcts.some((x) => x.trim() === "")) {
    return null;
  }
  if (w.some((x) => !Number.isFinite(x) || x <= 0) || m.some((x) => !Number.isFinite(x) || x < 0)) {
    return null;
  }
  const avgW = w.reduce((a, b) => a + b, 0) / SAMPLE_SIZE;
  const avgM = m.reduce((a, b) => a + b, 0) / SAMPLE_SIZE;
  const corrWt = (avgW * (100 + DRAW_STD_MR_PCT)) / (100 + avgM);
  const corrected = w.map((wi, i) => (wi * (100 + DRAW_STD_MR_PCT)) / (100 + m[i]));
  const corrMean = corrected.reduce((a, b) => a + b, 0) / SAMPLE_SIZE;
  const variance =
    corrected.reduce((sum, c) => sum + (c - corrMean) ** 2, 0) / (SAMPLE_SIZE - 1);
  const sdev = Math.sqrt(variance);
  const cv = corrWt > 0 ? (sdev / corrWt) * 100 : 0;
  return {
    avgW: avgW.toFixed(3),
    avgM: avgM.toFixed(2),
    corrWt: corrWt.toFixed(3),
    sdev: sdev.toFixed(4),
    cv: cv.toFixed(2),
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SliverWtSqcPage({ variant }: { variant: SliverVariantKey }) {
  const cfg = VARIANTS[variant];

  // HYDRATION RULE: reads sidebar context and seeds a date — defer render until mounted.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const { coId } = useSelectedCompanyCoId();
  const { selectedBranches, selectedCompany } = useSidebarContext();

  // Branch resolution: 1 sidebar branch → auto-use it; several → user must pick one.
  const sidebarBranchIds = React.useMemo(
    () => selectedBranches.map(Number),
    [selectedBranches]
  );
  const [pageBranchId, setPageBranchId] = React.useState<number | "">("");
  React.useEffect(() => {
    if (sidebarBranchIds.length === 1) {
      setPageBranchId(sidebarBranchIds[0]);
    } else if (sidebarBranchIds.length === 0) {
      setPageBranchId("");
    } else {
      setPageBranchId((prev) =>
        prev !== "" && sidebarBranchIds.includes(prev as number) ? prev : ""
      );
    }
  }, [sidebarBranchIds]);
  const branchId = pageBranchId === "" ? null : (pageBranchId as number);
  const branchOptions = React.useMemo(
    () =>
      (selectedCompany?.branches ?? []).filter((b) =>
        sidebarBranchIds.includes(Number(b.branch_id))
      ),
    [selectedCompany, sidebarBranchIds]
  );
  const selectedBranchName = branchOptions.find(
    (b) => Number(b.branch_id) === branchId
  )?.branch_name;

  const [tab, setTab] = React.useState(0);
  // One date drives both the Entry setup and the By Date view.
  const [entryDate, setEntryDate] = React.useState<string>(todayISO());
  const [snackbar, setSnackbar] = React.useState<SnackbarState>({
    open: false,
    message: "",
    severity: "success",
  });
  const fail = React.useCallback((message: string) => {
    setSnackbar({ open: true, message, severity: "error" });
  }, []);

  // ─── Setup (pickers + the day's existing entries) ───────────────────────

  const [setup, setSetup] = React.useState<SetupData | null>(null);
  const loadSetup = React.useCallback(async () => {
    if (!coId || branchId == null) return;
    const { data, error } = await fetchWithCookie<{ data: SetupData }>(
      `${cfg.routes.setup}?co_id=${coId}&branch_id=${branchId}&entry_date=${entryDate}`,
      "GET"
    );
    if (error || !data) {
      fail(error ?? "Failed to load setup data");
      return;
    }
    setSetup(data.data);
  }, [coId, branchId, entryDate, cfg.routes.setup, fail]);

  React.useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  // ─── By-date view ───────────────────────────────────────────────────────

  const [byDate, setByDate] = React.useState<ByDateData | null>(null);
  const [byDateLoading, setByDateLoading] = React.useState(false);
  const loadByDate = React.useCallback(async () => {
    if (!coId || branchId == null) return;
    setByDateLoading(true);
    const { data, error } = await fetchWithCookie<{ data: ByDateData }>(
      `${cfg.routes.byDate}?co_id=${coId}&branch_id=${branchId}&entry_date=${entryDate}`,
      "GET"
    );
    setByDateLoading(false);
    if (error || !data) {
      fail(error ?? "Failed to load readings");
      return;
    }
    setByDate(data.data);
  }, [coId, branchId, entryDate, cfg.routes.byDate, fail]);

  React.useEffect(() => {
    loadByDate();
  }, [loadByDate]);

  // ─── History table ──────────────────────────────────────────────────────

  const [histRows, setHistRows] = React.useState<SliverRow[]>([]);
  const [histTotal, setHistTotal] = React.useState(0);
  const [histLoading, setHistLoading] = React.useState(false);
  const [pagination, setPagination] = React.useState<GridPaginationModel>({
    page: 0,
    pageSize: 10,
  });
  const [searchInput, setSearchInput] = React.useState("");
  const [search, setSearch] = React.useState("");
  React.useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadHistory = React.useCallback(async () => {
    if (!coId || branchId == null) return;
    setHistLoading(true);
    const params = new URLSearchParams({
      co_id: coId,
      branch_id: String(branchId),
      page: String(pagination.page + 1),
      limit: String(pagination.pageSize),
    });
    if (search) params.append("search", search);
    const { data, error } = await fetchWithCookie<{ data: SliverRow[]; total: number }>(
      `${cfg.routes.table}?${params}`,
      "GET"
    );
    setHistLoading(false);
    if (error || !data) {
      fail(error ?? "Failed to load history");
      return;
    }
    setHistRows(data.data ?? []);
    setHistTotal(data.total ?? 0);
  }, [coId, branchId, pagination, search, cfg.routes.table, fail]);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ─── Entry drafts ───────────────────────────────────────────────────────

  const [drafts, setDrafts] = React.useState<DraftRow[]>([makeBlankDraft()]);
  const [saving, setSaving] = React.useState(false);

  const updateDraft = (i: number, patch: Partial<DraftRow>) => {
    setDrafts((prev) => prev.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  };

  const updateDraftReading = (
    i: number,
    field: "weights" | "mr_pcts" | "dlv_nos",
    k: number,
    value: string
  ) => {
    setDrafts((prev) =>
      prev.map((d, j) => {
        if (j !== i) return d;
        const arr = [...d[field]];
        arr[k] = value;
        return { ...d, [field]: arr };
      })
    );
  };

  const removeDraft = (i: number) => {
    setDrafts((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : [makeBlankDraft()]));
  };

  const handleSave = async () => {
    if (!coId || branchId == null) {
      fail("No company or branch selected");
      return;
    }
    const active = drafts.filter((d) => !isDraftEmpty(d));
    if (active.length === 0) {
      fail("Nothing to save — fill in at least one reading row");
      return;
    }

    const rows: CreateRowPayload[] = [];
    for (let i = 0; i < active.length; i++) {
      const d = active[i];
      const label = `Row ${i + 1}`;
      if (!d.section) {
        fail(`${label}: select a section`);
        return;
      }
      if (d.batch_plan_id == null) {
        fail(`${label}: select a batch`);
        return;
      }
      const weights = d.weights.map(Number);
      const mrs = d.mr_pcts.map(Number);
      if (
        d.weights.some((w) => w.trim() === "") ||
        weights.some((w) => !Number.isFinite(w) || w <= 0)
      ) {
        fail(`${label}: all ${SAMPLE_SIZE} weights must be positive numbers`);
        return;
      }
      if (
        d.mr_pcts.some((m) => m.trim() === "") ||
        mrs.some((m) => !Number.isFinite(m) || m < 0)
      ) {
        fail(`${label}: all ${SAMPLE_SIZE} MR% readings must be non-negative numbers`);
        return;
      }
      const row: CreateRowPayload = {
        section: d.section,
        mc_id: d.mc_id,
        spell_id: d.spell_id,
        batch_plan_id: d.batch_plan_id,
        weights,
        mr_pcts: mrs,
      };
      if (cfg.hasTimeBand) row.time_band = d.time_band || null;
      if (cfg.hasDlv) {
        const dlv: (number | null)[] = [];
        for (let k = 0; k < SAMPLE_SIZE; k++) {
          const raw = d.dlv_nos[k].trim();
          if (raw === "") {
            dlv.push(null);
            continue;
          }
          const n = parseInt(raw, 10);
          if (!Number.isFinite(n)) {
            fail(`${label}: DLV ${k + 1} must be a whole number`);
            return;
          }
          dlv.push(n);
        }
        row.dlv_nos = dlv;
      }
      rows.push(row);
    }

    setSaving(true);
    const { data, error } = await fetchWithCookie<{ data: { message: string; count: number } }>(
      cfg.routes.create,
      "POST",
      {
        co_id: Number(coId),
        branch_id: branchId,
        entry_date: entryDate,
        rows,
      }
    );
    setSaving(false);
    if (error || !data) {
      fail(error ?? "Failed to save readings");
      return;
    }
    setSnackbar({
      open: true,
      message: `${data.data.count} reading(s) saved`,
      severity: "success",
    });
    setDrafts([makeBlankDraft()]);
    loadSetup();
    loadByDate();
    loadHistory();
  };

  // ─── Delete ─────────────────────────────────────────────────────────────

  const handleDelete = async (row: SliverRow) => {
    const id = Number(row[cfg.idField] ?? 0);
    if (!id) return;
    if (!window.confirm("Delete this reading?")) return;
    const { data, error } = await fetchWithCookie<{ data: { message: string } }>(
      `${cfg.routes.del}/${id}`,
      "DELETE"
    );
    if (error || !data) {
      fail(error ?? "Failed to delete reading");
      return;
    }
    setSnackbar({ open: true, message: "Reading deleted", severity: "success" });
    loadSetup();
    loadByDate();
    loadHistory();
  };

  // ─── History grid rows/columns ──────────────────────────────────────────

  const historyRows = React.useMemo<HistoryRow[]>(
    () =>
      histRows.map((r) => ({
        id: Number(r[cfg.idField] ?? 0),
        entry_date: r.entry_date
          ? new Date(r.entry_date).toLocaleDateString("en-IN")
          : "-",
        section: r.section ?? "-",
        time_band: r.time_band ?? "-",
        machine: r.machine_name ?? "-",
        spell: r.spell_code ?? "-",
        batch: r.batch_plan_name ?? "-",
        calc_wt: fmt(r.calc_wt),
        calc_mr_pct: fmt(r.calc_mr_pct, 2),
        calc_corr_wt: fmt(r.calc_corr_wt),
        calc_sdev: fmt(r.calc_sdev, 4),
        calc_cv_pct: fmtCv(r.calc_cv_pct),
      })),
    [histRows, cfg.idField]
  );

  const historyColumns = React.useMemo<GridColDef[]>(() => {
    const cols: GridColDef[] = [
      { field: "entry_date", headerName: "Date", flex: 0.8, minWidth: 100 },
      { field: "section", headerName: "Section", flex: 0.9, minWidth: 110 },
    ];
    if (cfg.hasTimeBand) {
      cols.push({ field: "time_band", headerName: "Band", flex: 0.7, minWidth: 90 });
    }
    cols.push(
      { field: "machine", headerName: "Machine", flex: 1, minWidth: 120 },
      { field: "spell", headerName: "Spell", flex: 0.6, minWidth: 80 },
      { field: "batch", headerName: "Batch", flex: 1, minWidth: 120 },
      { field: "calc_wt", headerName: "Avg Wt", flex: 0.7, minWidth: 90 },
      { field: "calc_mr_pct", headerName: "MR%", flex: 0.6, minWidth: 80 },
      { field: "calc_corr_wt", headerName: "Corr Wt", flex: 0.7, minWidth: 90 },
      { field: "calc_cv_pct", headerName: "CV%", flex: 0.6, minWidth: 80 }
    );
    return cols;
  }, [cfg.hasTimeBand]);

  // ─── Render ─────────────────────────────────────────────────────────────

  if (!mounted) return null;

  if (!coId) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Select a company to continue.
      </Alert>
    );
  }

  if (sidebarBranchIds.length === 0) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Select at least one branch in the sidebar to continue.
      </Alert>
    );
  }

  const savedCount = setup?.entries?.length ?? 0;

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 600 }}>
        {cfg.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {cfg.subtitle}
      </Typography>

      {sidebarBranchIds.length > 1 ? (
        <TextField
          select
          size="small"
          label="Branch"
          value={pageBranchId}
          onChange={(e) => setPageBranchId(e.target.value === "" ? "" : Number(e.target.value))}
          sx={{ mb: 2, minWidth: 240 }}
        >
          {branchOptions.map((b) => (
            <MenuItem key={b.branch_id} value={Number(b.branch_id)}>
              {b.branch_name}
            </MenuItem>
          ))}
        </TextField>
      ) : selectedBranchName ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Branch: {selectedBranchName}
        </Typography>
      ) : null}

      {branchId == null ? (
        <Alert severity="info">Select a branch to load {cfg.title} data.</Alert>
      ) : (
        <>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
          >
            <Tab label="Entry" sx={{ minHeight: 44 }} />
            <Tab label="By Date" sx={{ minHeight: 44 }} />
            <Tab label="History" sx={{ minHeight: 44 }} />
          </Tabs>

          {/* ─── Tab 0 — Entry ───────────────────────────────────────────── */}
          {tab === 0 && (
            <Box>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}
              >
                <TextField
                  type="date"
                  size="small"
                  label="Entry date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                {savedCount > 0 && (
                  <Chip
                    size="small"
                    color="info"
                    variant="outlined"
                    label={`${savedCount} reading(s) already saved for this date — see By Date tab`}
                  />
                )}
              </Box>

              {drafts.map((d, i) => {
                const preview = previewDraftStats(d);
                return (
                  <Paper key={i} variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid size={{ xs: 12, sm: cfg.hasTimeBand ? 2.1 : 2.6 }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Section"
                          value={d.section}
                          onChange={(e) => updateDraft(i, { section: e.target.value })}
                        >
                          {(setup?.sections ?? []).map((s) => (
                            <MenuItem key={s} value={s}>
                              {s}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      {cfg.hasTimeBand && (
                        <Grid size={{ xs: 12, sm: 1.8 }}>
                          <TextField
                            select
                            fullWidth
                            size="small"
                            label="Time band"
                            value={d.time_band}
                            onChange={(e) => updateDraft(i, { time_band: e.target.value })}
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            {(setup?.time_bands ?? []).map((t) => (
                              <MenuItem key={t} value={t}>
                                {t}
                              </MenuItem>
                            ))}
                          </TextField>
                        </Grid>
                      )}
                      <Grid size={{ xs: 12, sm: cfg.hasTimeBand ? 2.7 : 3 }}>
                        <Autocomplete
                          size="small"
                          options={setup?.machines ?? []}
                          getOptionLabel={(o) =>
                            o.mech_code ? `${o.machine_name} (${o.mech_code})` : o.machine_name
                          }
                          value={
                            (setup?.machines ?? []).find((m) => m.machine_id === d.mc_id) ?? null
                          }
                          onChange={(_, val) =>
                            updateDraft(i, { mc_id: val?.machine_id ?? null })
                          }
                          renderInput={(params) => (
                            <TextField {...params} label="Machine" size="small" />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 2 }}>
                        <TextField
                          select
                          fullWidth
                          size="small"
                          label="Spell"
                          value={d.spell_id ?? ""}
                          onChange={(e) =>
                            updateDraft(i, {
                              spell_id: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        >
                          <MenuItem value="">
                            <em>None</em>
                          </MenuItem>
                          {(setup?.spells ?? []).map((s) => (
                            <MenuItem key={s.spell_id} value={s.spell_id}>
                              {s.spell_code}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: cfg.hasTimeBand ? 2.6 : 3.4 }}>
                        <Autocomplete
                          size="small"
                          options={setup?.batches ?? []}
                          getOptionLabel={(o) => o.plan_name ?? String(o.batch_plan_id)}
                          value={
                            (setup?.batches ?? []).find(
                              (b) => b.batch_plan_id === d.batch_plan_id
                            ) ?? null
                          }
                          onChange={(_, val) =>
                            updateDraft(i, { batch_plan_id: val?.batch_plan_id ?? null })
                          }
                          renderInput={(params) => (
                            <TextField {...params} label="Batch" size="small" />
                          )}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 0.8 }}>
                        <IconButton
                          aria-label="Remove row"
                          onClick={() => removeDraft(i)}
                          size="small"
                        >
                          <Trash2 size={18} />
                        </IconButton>
                      </Grid>
                    </Grid>

                    <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                      {Array.from({ length: SAMPLE_SIZE }, (_, k) => (
                        <Grid key={k} size={{ xs: 12, sm: 3 }}>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <TextField
                              size="small"
                              type="number"
                              label={`Wt ${k + 1}`}
                              value={d.weights[k]}
                              onChange={(e) =>
                                updateDraftReading(i, "weights", k, e.target.value)
                              }
                              slotProps={{ htmlInput: { min: 0, step: 0.001 } }}
                            />
                            <TextField
                              size="small"
                              type="number"
                              label={`MR% ${k + 1}`}
                              value={d.mr_pcts[k]}
                              onChange={(e) =>
                                updateDraftReading(i, "mr_pcts", k, e.target.value)
                              }
                              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                            />
                            {cfg.hasDlv && (
                              <TextField
                                size="small"
                                type="number"
                                label={`DLV ${k + 1}`}
                                value={d.dlv_nos[k]}
                                onChange={(e) =>
                                  updateDraftReading(i, "dlv_nos", k, e.target.value)
                                }
                                slotProps={{ htmlInput: { min: 0, step: 1 } }}
                              />
                            )}
                          </Box>
                        </Grid>
                      ))}
                    </Grid>

                    {preview && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ mt: 1, display: "block" }}
                      >
                        Avg wt {preview.avgW} · Avg MR% {preview.avgM} · Corr wt{" "}
                        {preview.corrWt} · SDev {preview.sdev} · CV% {preview.cv} (std MR{" "}
                        {DRAW_STD_MR_PCT}%)
                      </Typography>
                    )}
                  </Paper>
                );
              })}

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  startIcon={<Plus size={16} />}
                  onClick={() => setDrafts((prev) => [...prev, makeBlankDraft()])}
                >
                  Add Row
                </Button>
                <Button variant="contained" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Readings"}
                </Button>
              </Box>
            </Box>
          )}

          {/* ─── Tab 1 — By Date ─────────────────────────────────────────── */}
          {tab === 1 && (
            <Box>
              <TextField
                type="date"
                size="small"
                label="Date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                sx={{ mb: 2 }}
              />

              {byDateLoading ? (
                <Typography variant="body2" color="text.secondary">
                  Loading...
                </Typography>
              ) : !byDate || byDate.rows.length === 0 ? (
                <Alert severity="info">No readings saved for this date.</Alert>
              ) : (
                <>
                  <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ mb: 3, overflowX: "auto" }}
                  >
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Section</TableCell>
                          {cfg.hasTimeBand && <TableCell>Band</TableCell>}
                          <TableCell>Machine</TableCell>
                          <TableCell>Spell</TableCell>
                          <TableCell>Batch</TableCell>
                          <TableCell>Weights</TableCell>
                          <TableCell>MR%</TableCell>
                          {cfg.hasDlv && <TableCell>DLV</TableCell>}
                          <TableCell align="right">Avg Wt</TableCell>
                          <TableCell align="right">Avg MR%</TableCell>
                          <TableCell align="right">Corr Wt</TableCell>
                          <TableCell align="right">SDev</TableCell>
                          <TableCell align="right">CV%</TableCell>
                          <TableCell />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {byDate.rows.map((r, idx) => (
                          <TableRow key={Number(r[cfg.idField] ?? idx)}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>{r.section ?? "-"}</TableCell>
                            {cfg.hasTimeBand && <TableCell>{r.time_band ?? "-"}</TableCell>}
                            <TableCell>
                              {r.machine_name ?? "-"}
                              {r.mech_code ? ` (${r.mech_code})` : ""}
                            </TableCell>
                            <TableCell>{r.spell_code ?? "-"}</TableCell>
                            <TableCell>{r.batch_plan_name ?? "-"}</TableCell>
                            <TableCell>{joinNums(r.weights)}</TableCell>
                            <TableCell>{joinNums(r.mr_pcts)}</TableCell>
                            {cfg.hasDlv && <TableCell>{joinNums(r.dlv_nos)}</TableCell>}
                            <TableCell align="right">{fmt(r.calc_wt)}</TableCell>
                            <TableCell align="right">{fmt(r.calc_mr_pct, 2)}</TableCell>
                            <TableCell align="right">{fmt(r.calc_corr_wt)}</TableCell>
                            <TableCell align="right">{fmt(r.calc_sdev, 4)}</TableCell>
                            <TableCell align="right">{fmtCv(r.calc_cv_pct)}</TableCell>
                            <TableCell>
                              <IconButton
                                aria-label="Delete reading"
                                size="small"
                                onClick={() => handleDelete(r)}
                              >
                                <Trash2 size={16} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {byDate.section_averages.length > 0 && (
                    <>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Section Averages
                      </Typography>
                      <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={{ mb: 3, overflowX: "auto", maxWidth: 720 }}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Section</TableCell>
                              <TableCell align="right">Rows</TableCell>
                              <TableCell align="right">Avg Obs</TableCell>
                              <TableCell align="right">Avg MR%</TableCell>
                              <TableCell align="right">Avg Corr</TableCell>
                              <TableCell align="right">Avg SDev</TableCell>
                              <TableCell align="right">Avg CV%</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {byDate.section_averages.map((s) => (
                              <TableRow key={s.section}>
                                <TableCell>{s.section}</TableCell>
                                <TableCell align="right">{s.row_count}</TableCell>
                                <TableCell align="right">{fmt(s.avg_obs)}</TableCell>
                                <TableCell align="right">{fmt(s.avg_mr_pct, 2)}</TableCell>
                                <TableCell align="right">{fmt(s.avg_corr_wt)}</TableCell>
                                <TableCell align="right">{fmt(s.avg_sdev, 4)}</TableCell>
                                <TableCell align="right">{fmtCv(s.avg_cv_pct)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}

                  {byDate.grand_averages.length > 0 && (
                    <>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Grand Averages (per batch)
                      </Typography>
                      <TableContainer
                        component={Paper}
                        variant="outlined"
                        sx={{ overflowX: "auto", maxWidth: 720 }}
                      >
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Batch</TableCell>
                              <TableCell align="right">Rows</TableCell>
                              <TableCell align="right">Obs</TableCell>
                              <TableCell align="right">MR%</TableCell>
                              <TableCell align="right">Corr Wt</TableCell>
                              <TableCell align="right">CV%</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {byDate.grand_averages.map((g) => (
                              <TableRow key={g.batch_plan_id}>
                                <TableCell>
                                  {g.batch_plan_name ?? g.batch_plan_id}
                                </TableCell>
                                <TableCell align="right">{g.row_count}</TableCell>
                                <TableCell align="right">{fmt(g.grand_obs)}</TableCell>
                                <TableCell align="right">{fmt(g.grand_mr_pct, 2)}</TableCell>
                                <TableCell align="right">{fmt(g.grand_corr_wt)}</TableCell>
                                <TableCell align="right">{fmtCv(g.grand_cv_pct)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </>
                  )}
                </>
              )}
            </Box>
          )}

          {/* ─── Tab 2 — History ─────────────────────────────────────────── */}
          {tab === 2 && (
            <Box>
              <TextField
                size="small"
                label="Search"
                placeholder="Batch, machine or section"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 0 }));
                }}
                sx={{ mb: 2, minWidth: 280 }}
              />
              <MuiDataGrid
                rows={historyRows}
                columns={historyColumns}
                rowCount={histTotal}
                paginationModel={pagination}
                onPaginationModelChange={setPagination}
                loading={histLoading}
                showLoadingUntilLoaded
              />
            </Box>
          )}
        </>
      )}

      {/* ─── Snackbar ─────────────────────────────────────────────────────── */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
