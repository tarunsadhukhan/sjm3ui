"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Snackbar,
	Alert,
	Button,
	Box,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	type SelectChangeEvent,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import {
	DataGrid,
	GridColDef,
	GridColumnGroupingModel,
	GridPaginationModel,
} from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContextSafe } from "@/components/dashboard/sidebarContext";
import {
	fetchDrawingSummaryReport,
	fetchDrawingDateProductionReport,
	fetchDrawingDateIssueReport,
	fetchDrawingShiftMatrixReport,
} from "@/utils/drawingReportService";
import type {
	DrawingSummaryRow,
	DrawingDateProductionRow,
	DrawingDateIssueRow,
	DrawingShiftMatrixRow,
} from "./types/drawingReportTypes";
import DrawingFilterDialog, {
	type DrawingFilterValues,
	getDefaultFromDate,
	getDefaultToDate,
} from "./DrawingFilterDialog";

type SummaryRow = DrawingSummaryRow & { id: string };

// Flat row used by the "Details Report" grouped view. Each date group ends
// with an isTotal row holding the per-day totals across machines.
type DateProductionRow = {
	id: string;
	report_date: string;
	quality_name: string;
	opening: number;
	production: number;
	issue: number;
	closing: number;
	isTotal: boolean;
};

// Machine-by-date pivot (single value per cell). Used by "Date Wise Output".
// Columns: d{idx} per date, plus Total and Average.
type PivotRow = {
	id: string;
	quality_name: string;
	isGrandTotal?: boolean;
	[key: string]: string | number | boolean | undefined;
};

// Machine day-wise pivot — rows are machines, columns are dates with
// Production + Issue sub-columns + Total / Average column groups.
type QualityDayWiseRow = {
	id: string;
	quality_name: string;
	isGrandTotal?: boolean;
	[key: string]: string | number | boolean | undefined;
};

type ViewKey =
	| "shiftMatrix"
	| "summary"
	| "dateProduction"
	| "dateIssue"
	| "qualityDayWise";

const VIEW_TITLES: Record<ViewKey, string> = {
	shiftMatrix: "Drawing Efficiency Report",
	summary: "Summary Report",
	dateProduction: "Details Report",
	dateIssue: "Date Wise Output",
	qualityDayWise: "Machine Day Wise Report",
};

// Row used by the shift matrix view — one row per machine with shift A/B/C
// columns plus an Overall group. Keys for shift columns are
// s{spell_id}_{op|cl|unit|eff}.
type ShiftMatrixRow = {
	id: string;
	mc_id: number;
	mc_short_name: string;
	shed_type: string | null;
	drg_type: number | null;
	overall_op: number;
	overall_cl: number;
	overall_unit: number;
	overall_eff: number;
	isDrgTotal?: boolean;
	isShedTotal?: boolean;
	isGrandTotal?: boolean;
	[key: string]: string | number | boolean | null | undefined;
};

const DRG_TYPE_LABELS: Record<number, string> = {
	1: "1st Drawing",
	2: "2nd Drawing",
	3: "Inter Drawing",
	4: "3rd Drawing",
};

const drgLabel = (t: number | null | undefined): string =>
	t == null ? "" : (DRG_TYPE_LABELS[t] ?? `Drawing #${t}`);

// Pivot raw shift-matrix rows into one row per machine with columns per
// distinct spell. Injects sub-total rows after each drg_type group and after
// each shed_type group, plus a Grand Total row at the end. Returns the
// discovered spell list (id + name) in spell_id order so the grid can build
// column groups for each shift plus Overall.
function pivotShiftMatrix(rows: DrawingShiftMatrixRow[]): {
	spells: Array<{ id: number; name: string }>;
	rows: ShiftMatrixRow[];
} {
	const spellMap = new Map<number, string>();
	type MachineKey = string;
	type MachineEntry = {
		mc_id: number;
		mc_short_name: string;
		shed_type: string | null;
		drg_type: number | null;
		perSpell: Map<number, DrawingShiftMatrixRow>;
	};
	const machineMap = new Map<MachineKey, MachineEntry>();
	rows.forEach((r) => {
		if (!spellMap.has(r.spell_id)) spellMap.set(r.spell_id, r.spell_name);
		const key: MachineKey = `${r.shed_type ?? ""}|${r.drg_type ?? ""}|${r.mc_id}`;
		let mach = machineMap.get(key);
		if (!mach) {
			mach = {
				mc_id: r.mc_id,
				mc_short_name: r.mc_short_name,
				shed_type: r.shed_type ?? null,
				drg_type: r.drg_type ?? null,
				perSpell: new Map(),
			};
			machineMap.set(key, mach);
		}
		mach.perSpell.set(r.spell_id, r);
	});

	const spells = Array.from(spellMap.entries())
		.sort((a, b) => a[0] - b[0])
		.map(([id, name]) => ({ id, name }));

	// Sort machines by shed_type, drg_type, mc_short_name (matches SQL ORDER BY)
	const machines = Array.from(machineMap.values()).sort((a, b) => {
		const sA = a.shed_type ?? "";
		const sB = b.shed_type ?? "";
		if (sA !== sB) return sA.localeCompare(sB);
		const dA = a.drg_type ?? 0;
		const dB = b.drg_type ?? 0;
		if (dA !== dB) return dA - dB;
		return a.mc_short_name.localeCompare(b.mc_short_name);
	});

	const buildMachineRow = (m: MachineEntry): ShiftMatrixRow => {
		const row: ShiftMatrixRow = {
			id: `m_${m.mc_id}_${m.shed_type ?? ""}_${m.drg_type ?? ""}`,
			mc_id: m.mc_id,
			mc_short_name: m.mc_short_name,
			shed_type: m.shed_type,
			drg_type: m.drg_type,
			overall_op: 0,
			overall_cl: 0,
			overall_unit: 0,
			overall_eff: 0,
		};
		let totalUnit = 0;
		let effSum = 0;
		let effCount = 0;
		let opMin = Number.POSITIVE_INFINITY;
		let clMax = Number.NEGATIVE_INFINITY;
		spells.forEach(({ id }) => {
			const cell = m.perSpell.get(id);
			const op = cell ? Number(cell.op) || 0 : 0;
			const cl = cell ? Number(cell.cl) || 0 : 0;
			const unit = cell ? Number(cell.unit) || 0 : 0;
			const eff = cell ? Number(cell.eff) || 0 : 0;
			row[`s${id}_op`] = op;
			row[`s${id}_cl`] = cl;
			row[`s${id}_unit`] = unit;
			row[`s${id}_eff`] = eff;
			if (cell) {
				totalUnit += unit;
				if (eff > 0) {
					effSum += eff;
					effCount += 1;
				}
				if (op > 0 && op < opMin) opMin = op;
				if (cl > clMax) clMax = cl;
			}
		});
		row.overall_op = opMin === Number.POSITIVE_INFINITY ? 0 : opMin;
		row.overall_cl = clMax === Number.NEGATIVE_INFINITY ? 0 : clMax;
		row.overall_unit = totalUnit;
		row.overall_eff = effCount > 0 ? effSum / effCount : 0;
		return row;
	};

	// Aggregate a slice of machine rows into a single sub/grand total row.
	// OP / CL aren't meaningful at aggregate level → keep as 0 (rendered blank).
	const buildTotalRow = (
		idPrefix: string,
		label: string,
		machineRows: ShiftMatrixRow[],
		kind: "drg" | "shed" | "grand",
	): ShiftMatrixRow => {
		const row: ShiftMatrixRow = {
			id: idPrefix,
			mc_id: 0,
			mc_short_name: label,
			shed_type: null,
			drg_type: null,
			overall_op: 0,
			overall_cl: 0,
			overall_unit: 0,
			overall_eff: 0,
			isDrgTotal: kind === "drg",
			isShedTotal: kind === "shed",
			isGrandTotal: kind === "grand",
		};
		let totalUnit = 0;
		let effSum = 0;
		let effCount = 0;
		spells.forEach(({ id }) => {
			let unit = 0;
			let effS = 0;
			let effC = 0;
			machineRows.forEach((r) => {
				const u = Number(r[`s${id}_unit`]) || 0;
				const e = Number(r[`s${id}_eff`]) || 0;
				unit += u;
				if (e > 0) {
					effS += e;
					effC += 1;
				}
			});
			row[`s${id}_op`] = 0;
			row[`s${id}_cl`] = 0;
			row[`s${id}_unit`] = unit;
			row[`s${id}_eff`] = effC > 0 ? effS / effC : 0;
			totalUnit += unit;
			effSum += effS;
			effCount += effC;
		});
		row.overall_unit = totalUnit;
		row.overall_eff = effCount > 0 ? effSum / effCount : 0;
		return row;
	};

	// Walk machines, building rows. On group boundary, flush the appropriate
	// sub-totals for the just-finished group(s). At the end, flush remaining
	// sub-totals and a grand total.
	const out: ShiftMatrixRow[] = [];
	const allRows: ShiftMatrixRow[] = [];
	let shedBuf: ShiftMatrixRow[] = [];
	let drgBuf: ShiftMatrixRow[] = [];
	let curShed: string | null | undefined = undefined;
	let curDrg: number | null | undefined = undefined;

	const flushDrg = () => {
		if (drgBuf.length === 0) return;
		out.push(
			buildTotalRow(
				`__drg_total__${curShed ?? ""}_${curDrg ?? ""}`,
				`${drgLabel(curDrg ?? null)} Total`,
				drgBuf,
				"drg",
			),
		);
		drgBuf = [];
	};
	const flushShed = () => {
		flushDrg();
		if (shedBuf.length === 0) return;
		out.push(
			buildTotalRow(
				`__shed_total__${curShed ?? ""}`,
				`${curShed ?? ""} Total`,
				shedBuf,
				"shed",
			),
		);
		shedBuf = [];
	};

	machines.forEach((m) => {
		const row = buildMachineRow(m);
		if (curShed !== undefined && m.shed_type !== curShed) {
			flushShed();
		} else if (curDrg !== undefined && m.drg_type !== curDrg) {
			flushDrg();
		}
		curShed = m.shed_type;
		curDrg = m.drg_type;
		out.push(row);
		drgBuf.push(row);
		shedBuf.push(row);
		allRows.push(row);
	});
	flushShed();

	if (allRows.length > 0) {
		out.push(buildTotalRow("__grand_total__", "Grand Total", allRows, "grand"));
	}

	return { spells, rows: out };
}

const fmtNum = (value: unknown): string => {
	if (value == null) return "";
	const n = Number(value);
	if (!Number.isFinite(n)) return "";
	return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const escapeHtml = (s: string): string =>
	s.replace(
		/[&<>"']/g,
		(c) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
				"'": "&#39;",
			})[c] ?? c,
	);

function openPrintWindow(title: string, bodyHtml: string) {
	const w = window.open("", "_blank", "width=1100,height=800");
	if (!w) return;
	w.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #111; margin: 16px; }
  h1 { font-size: 18px; margin: 0 0 4px; color: #0C3C60; }
  .meta { font-size: 12px; color: #555; margin-bottom: 12px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { border: 1px solid #999; padding: 4px 6px; text-align: right; }
  th { background: #3ea6da; color: #fff; font-weight: 700; text-align: center; }
  td.text { text-align: left; }
  tr.grand-total td { background: #0C3C60; color: #fff; font-weight: 700; }
  tr.shed-total td { background: #bbdefb; font-weight: 700; }
  tr.drg-total td { background: #e3f2fd; font-weight: 600; }
  @media print {
    body { margin: 0.4in; }
    button { display: none; }
  }
</style>
</head>
<body>
${bodyHtml}
<script>
  window.addEventListener('load', function () {
    setTimeout(function () { window.focus(); window.print(); }, 100);
  });
</script>
</body>
</html>`);
	w.document.close();
}

// Pivot a list of (date, machine, value) tuples into a date×machine matrix
// with per-machine Total + Average columns and a Grand-Total row.
function pivotByDate(
	rows: Array<{ report_date: string; quality_id: number; quality_name: string; value: number }>,
): { dates: string[]; rows: PivotRow[] } {
	const dateOrder: string[] = [];
	const seenDate = new Set<string>();
	const qualities = new Map<number, { quality_name: string; cells: Map<string, number> }>();

	rows.forEach((r) => {
		if (!seenDate.has(r.report_date)) {
			seenDate.add(r.report_date);
			dateOrder.push(r.report_date);
		}
		let q = qualities.get(r.quality_id);
		if (!q) {
			q = { quality_name: r.quality_name, cells: new Map() };
			qualities.set(r.quality_id, q);
		}
		const current = q.cells.get(r.report_date) ?? 0;
		q.cells.set(r.report_date, current + (Number(r.value) || 0));
	});

	const out: PivotRow[] = Array.from(qualities.entries())
		.sort((a, b) => a[1].quality_name.localeCompare(b[1].quality_name))
		.map(([quality_id, { quality_name, cells }]) => {
			const row: PivotRow = { id: String(quality_id), quality_name };
			let total = 0;
			let nNonZero = 0;
			dateOrder.forEach((d, idx) => {
				const v = cells.get(d) ?? 0;
				row[`d${idx}`] = v;
				total += v;
				if (v > 0) nNonZero += 1;
			});
			row.total = total;
			row.average = nNonZero > 0 ? total / nNonZero : 0;
			return row;
		});

	if (out.length > 0 && dateOrder.length > 0) {
		const grand: PivotRow = {
			id: "__GRAND_TOTAL__",
			quality_name: "Grand Total",
			isGrandTotal: true,
		};
		let gTotal = 0;
		let gNNonZero = 0;
		dateOrder.forEach((_, idx) => {
			const dTotal = out.reduce((s, r) => s + (Number(r[`d${idx}`]) || 0), 0);
			grand[`d${idx}`] = dTotal;
			gTotal += dTotal;
			if (dTotal > 0) gNNonZero += 1;
		});
		grand.total = gTotal;
		grand.average = gNNonZero > 0 ? gTotal / gNNonZero : 0;
		out.push(grand);
	}

	return { dates: dateOrder, rows: out };
}

// Machine day-wise pivot: rows are machines, columns are dates with
// (Production, Issue) sub-columns + Total and Average column groups.
function pivotQualityDayWise(
	rows: Array<{
		report_date: string;
		quality_id: number;
		quality_name: string;
		production: number;
		issue: number;
	}>,
): { dates: string[]; rows: QualityDayWiseRow[] } {
	const dateOrder: string[] = [];
	const seenDate = new Set<string>();
	type Cell = { prod: number; iss: number };
	const qualities = new Map<
		number,
		{ quality_name: string; cells: Map<string, Cell> }
	>();

	rows.forEach((r) => {
		if (!seenDate.has(r.report_date)) {
			seenDate.add(r.report_date);
			dateOrder.push(r.report_date);
		}
		let q = qualities.get(r.quality_id);
		if (!q) {
			q = { quality_name: r.quality_name, cells: new Map() };
			qualities.set(r.quality_id, q);
		}
		q.cells.set(r.report_date, {
			prod: Number(r.production) || 0,
			iss: Number(r.issue) || 0,
		});
	});

	const out: QualityDayWiseRow[] = Array.from(qualities.entries())
		.sort((a, b) => a[1].quality_name.localeCompare(b[1].quality_name))
		.map(([quality_id, { quality_name, cells }]) => {
			const row: QualityDayWiseRow = { id: String(quality_id), quality_name };
			let totalProd = 0;
			let totalIss = 0;
			let nProd = 0;
			let nIss = 0;
			dateOrder.forEach((d, idx) => {
				const c = cells.get(d) ?? { prod: 0, iss: 0 };
				row[`d${idx}_prod`] = c.prod;
				row[`d${idx}_iss`] = c.iss;
				totalProd += c.prod;
				totalIss += c.iss;
				if (c.prod > 0) nProd += 1;
				if (c.iss > 0) nIss += 1;
			});
			row.total_prod = totalProd;
			row.total_iss = totalIss;
			row.avg_prod = nProd > 0 ? totalProd / nProd : 0;
			row.avg_iss = nIss > 0 ? totalIss / nIss : 0;
			return row;
		});

	if (out.length > 0 && dateOrder.length > 0) {
		const grand: QualityDayWiseRow = {
			id: "__GRAND_TOTAL__",
			quality_name: "Grand Total",
			isGrandTotal: true,
		};
		let gTotalProd = 0;
		let gTotalIss = 0;
		let gNProd = 0;
		let gNIss = 0;
		dateOrder.forEach((_, idx) => {
			const dProd = out.reduce((s, r) => s + (Number(r[`d${idx}_prod`]) || 0), 0);
			const dIss = out.reduce((s, r) => s + (Number(r[`d${idx}_iss`]) || 0), 0);
			grand[`d${idx}_prod`] = dProd;
			grand[`d${idx}_iss`] = dIss;
			gTotalProd += dProd;
			gTotalIss += dIss;
			if (dProd > 0) gNProd += 1;
			if (dIss > 0) gNIss += 1;
		});
		grand.total_prod = gTotalProd;
		grand.total_iss = gTotalIss;
		grand.avg_prod = gNProd > 0 ? gTotalProd / gNProd : 0;
		grand.avg_iss = gNIss > 0 ? gTotalIss / gNIss : 0;
		out.push(grand);
	}

	return { dates: dateOrder, rows: out };
}

// Build flat rows grouped by date, appending a "Total" row at the end of each
// date group with the summed opening / production / issue / closing across all
// machines for that date.
function buildDateProductionRowsWithTotals(
	rows: Array<{
		report_date: string;
		quality_id: number;
		quality_name: string;
		opening: number;
		production: number;
		issue: number;
		closing: number;
	}>,
): DateProductionRow[] {
	const out: DateProductionRow[] = [];
	let currentDate: string | null = null;
	let groupStart = 0;
	const flushTotal = (date: string, fromIdx: number) => {
		let opening = 0;
		let production = 0;
		let issue = 0;
		let closing = 0;
		for (let i = fromIdx; i < out.length; i++) {
			opening += Number(out[i].opening) || 0;
			production += Number(out[i].production) || 0;
			issue += Number(out[i].issue) || 0;
			closing += Number(out[i].closing) || 0;
		}
		out.push({
			id: `__TOTAL__${date}`,
			report_date: date,
			quality_name: "Total",
			opening,
			production,
			issue,
			closing,
			isTotal: true,
		});
	};
	rows.forEach((r) => {
		if (currentDate !== null && r.report_date !== currentDate) {
			flushTotal(currentDate, groupStart);
			groupStart = out.length;
		}
		currentDate = r.report_date;
		out.push({
			id: `${r.report_date}__${r.quality_id}`,
			report_date: r.report_date,
			quality_name: r.quality_name,
			opening: r.opening,
			production: r.production,
			issue: r.issue,
			closing: r.closing,
			isTotal: false,
		});
	});
	if (currentDate !== null) {
		flushTotal(currentDate, groupStart);
	}
	return out;
}

export default function DrawingReportsPage() {
	const sidebar = useSidebarContextSafe();
	const selectedCompany = sidebar?.selectedCompany ?? null;
	const selectedBranches = sidebar?.selectedBranches ?? [];

	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		setMounted(true);
	}, []);

	const branchId = useMemo<number | null>(() => {
		if (!selectedCompany) return null;
		const branches = selectedCompany.branches ?? [];
		const chosen = branches.find((b) => selectedBranches.includes(b.branch_id));
		return (chosen ?? branches[0])?.branch_id ?? null;
	}, [selectedCompany, selectedBranches]);

	const [view, setView] = useState<ViewKey>("shiftMatrix");
	const [shiftMatrixSpells, setShiftMatrixSpells] = useState<
		Array<{ id: number; name: string }>
	>([]);
	const [shiftMatrixRows, setShiftMatrixRows] = useState<ShiftMatrixRow[]>([]);
	const [summaryRows, setSummaryRows] = useState<SummaryRow[]>([]);
	const [dateProductionRows, setDateProductionRows] = useState<DateProductionRow[]>([]);
	const [pivotDates, setPivotDates] = useState<string[]>([]);
	const [pivotRows, setPivotRows] = useState<PivotRow[]>([]);
	const [qualityDayWiseDates, setQualityDayWiseDates] = useState<string[]>([]);
	const [qualityDayWiseRows, setQualityDayWiseRows] = useState<QualityDayWiseRow[]>([]);
	const [chartOpen, setChartOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState<DrawingFilterValues>(() => ({
		fromDate: getDefaultFromDate(),
		toDate: getDefaultToDate(),
	}));
	const [filterDialogOpen, setFilterDialogOpen] = useState(false);
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		pageSize: 25,
		page: 0,
	});
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const loadReport = useCallback(async () => {
		if (!branchId) {
			setShiftMatrixSpells([]);
			setShiftMatrixRows([]);
			setSummaryRows([]);
			setDateProductionRows([]);
			setPivotDates([]);
			setPivotRows([]);
			setQualityDayWiseDates([]);
			setQualityDayWiseRows([]);
			return;
		}
		if (!filter.fromDate || !filter.toDate) return;

		setLoading(true);
		try {
			if (view === "shiftMatrix") {
				const data = await fetchDrawingShiftMatrixReport(
					branchId,
					filter.fromDate,
					filter.toDate,
				);
				const pivot = pivotShiftMatrix(data);
				setShiftMatrixSpells(pivot.spells);
				setShiftMatrixRows(pivot.rows);
			} else if (view === "summary") {
				const data = await fetchDrawingSummaryReport(branchId, filter.fromDate, filter.toDate);
				setSummaryRows(data.map((r) => ({ ...r, id: r.report_date })));
			} else if (view === "dateProduction") {
				const data = await fetchDrawingDateProductionReport(
					branchId,
					filter.fromDate,
					filter.toDate,
				);
				setDateProductionRows(buildDateProductionRowsWithTotals(data));
			} else if (view === "dateIssue") {
				const data = await fetchDrawingDateIssueReport(
					branchId,
					filter.fromDate,
					filter.toDate,
				);
				const pivot = pivotByDate(
					data.map((r: DrawingDateIssueRow) => ({
						report_date: r.report_date,
						quality_id: r.quality_id,
						quality_name: r.quality_name,
						value: r.issue,
					})),
				);
				setPivotDates(pivot.dates);
				setPivotRows(pivot.rows);
			} else if (view === "qualityDayWise") {
				const data = await fetchDrawingDateProductionReport(
					branchId,
					filter.fromDate,
					filter.toDate,
				);
				const pivot = pivotQualityDayWise(
					data.map((r) => ({
						report_date: r.report_date,
						quality_id: r.quality_id,
						quality_name: r.quality_name,
						production: r.production,
						issue: r.issue,
					})),
				);
				setQualityDayWiseDates(pivot.dates);
				setQualityDayWiseRows(pivot.rows);
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error fetching report";
			setSnackbar({ open: true, message, severity: "error" });
			setShiftMatrixSpells([]);
			setShiftMatrixRows([]);
			setSummaryRows([]);
			setDateProductionRows([]);
			setPivotDates([]);
			setPivotRows([]);
			setQualityDayWiseDates([]);
			setQualityDayWiseRows([]);
		} finally {
			setLoading(false);
		}
	}, [view, branchId, filter.fromDate, filter.toDate]);

	useEffect(() => {
		loadReport();
	}, [loadReport]);

	const handleViewChange = useCallback((e: SelectChangeEvent<ViewKey>) => {
		setView(e.target.value as ViewKey);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, []);

	const viewSelect = (
		<FormControl size="small" sx={{ minWidth: 240 }}>
			<InputLabel id="drawing-report-view-label">Report</InputLabel>
			<Select<ViewKey>
				labelId="drawing-report-view-label"
				label="Report"
				value={view}
				onChange={handleViewChange}
			>
				<MenuItem value="shiftMatrix">Drawing Efficiency Report</MenuItem>
				<MenuItem value="summary">Summary Report</MenuItem>
				<MenuItem value="dateProduction">Details Report</MenuItem>
				<MenuItem value="dateIssue">Date Wise Output</MenuItem>
				<MenuItem value="qualityDayWise">Machine Day Wise Report</MenuItem>
			</Select>
		</FormControl>
	);

	const handleApply = useCallback((values: DrawingFilterValues) => {
		setFilter(values);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, []);

	const handleSnackbarClose = useCallback(() => {
		setSnackbar((prev) => ({ ...prev, open: false }));
	}, []);

	const branchLabel = useMemo(() => {
		if (!branchId) return "";
		return (
			selectedCompany?.branches.find((b) => b.branch_id === branchId)?.branch_name ??
			String(branchId)
		);
	}, [branchId, selectedCompany]);

	const buildMetaHtml = useCallback(() => {
		const branchPart = branchLabel ? `Branch: ${escapeHtml(branchLabel)} | ` : "";
		return `<div class="meta">${branchPart}From ${escapeHtml(filter.fromDate)} to ${escapeHtml(filter.toDate)}</div>`;
	}, [branchLabel, filter.fromDate, filter.toDate]);

	const summaryTotals = useMemo(() => {
		if (summaryRows.length === 0) {
			return { opening: 0, production: 0, issue: 0, closing: 0, hasData: false };
		}
		const production = summaryRows.reduce((acc, r) => acc + (Number(r.production) || 0), 0);
		const issue = summaryRows.reduce((acc, r) => acc + (Number(r.issue) || 0), 0);
		return {
			opening: Number(summaryRows[0].opening) || 0,
			production,
			issue,
			closing: Number(summaryRows[summaryRows.length - 1].closing) || 0,
			hasData: true,
		};
	}, [summaryRows]);

	// Sum of Production / Issue across all machines, per date — used by the
	// Machine Day Wise bar chart. Skips the Grand-Total pivot row.
	const qualityDayWiseChartTotals = useMemo(() => {
		const prod: number[] = qualityDayWiseDates.map(() => 0);
		const iss: number[] = qualityDayWiseDates.map(() => 0);
		qualityDayWiseRows.forEach((row) => {
			if (row.isGrandTotal) return;
			qualityDayWiseDates.forEach((_, idx) => {
				prod[idx] += Number(row[`d${idx}_prod`]) || 0;
				iss[idx] += Number(row[`d${idx}_iss`]) || 0;
			});
		});
		return { prod, iss };
	}, [qualityDayWiseDates, qualityDayWiseRows]);

	const handlePrint = useCallback(() => {
		const title = VIEW_TITLES[view];
		let body = `<h1>${escapeHtml(title)}</h1>` + buildMetaHtml();

		if (view === "shiftMatrix") {
			const shiftGroups = shiftMatrixSpells
				.map((sp) => `<th colspan="4">${escapeHtml(sp.name)}</th>`)
				.join("");
			const subHeaderPerShift = shiftMatrixSpells
				.map(() => `<th>OP</th><th>CL</th><th>Unit</th><th>Eff%</th>`)
				.join("");
			body += `<table><thead>`;
			body +=
				`<tr><th rowspan="2">Machine</th>${shiftGroups}` +
				`<th colspan="4">Overall</th></tr>`;
			body +=
				`<tr>${subHeaderPerShift}` +
				`<th>OP</th><th>CL</th><th>Unit</th><th>Eff%</th></tr>`;
			body += `</thead><tbody>`;
			shiftMatrixRows.forEach((r) => {
				const cls = r.isGrandTotal
					? ' class="grand-total"'
					: r.isShedTotal
						? ' class="shed-total"'
						: r.isDrgTotal
							? ' class="drg-total"'
							: "";
				const isTotal = r.isGrandTotal || r.isShedTotal || r.isDrgTotal;
				let tds = `<td class="text">${escapeHtml(r.mc_short_name)}</td>`;
				shiftMatrixSpells.forEach(({ id }) => {
					tds +=
						`<td>${isTotal ? "" : fmtNum(r[`s${id}_op`])}</td>` +
						`<td>${isTotal ? "" : fmtNum(r[`s${id}_cl`])}</td>` +
						`<td>${fmtNum(r[`s${id}_unit`])}</td>` +
						`<td>${fmtNum(r[`s${id}_eff`])}</td>`;
				});
				tds +=
					`<td>${isTotal ? "" : fmtNum(r.overall_op)}</td>` +
					`<td>${isTotal ? "" : fmtNum(r.overall_cl)}</td>` +
					`<td>${fmtNum(r.overall_unit)}</td>` +
					`<td>${fmtNum(r.overall_eff)}</td>`;
				body += `<tr${cls}>${tds}</tr>`;
			});
			body += `</tbody></table>`;
		} else if (view === "summary") {
			body +=
				`<table><thead><tr>` +
				["Date", "Opening", "Production", "Issue", "Closing"]
					.map((h) => `<th>${h}</th>`)
					.join("") +
				`</tr></thead><tbody>`;
			summaryRows.forEach((r) => {
				body +=
					`<tr><td class="text">${escapeHtml(r.report_date)}</td>` +
					`<td>${fmtNum(r.opening)}</td>` +
					`<td>${fmtNum(r.production)}</td>` +
					`<td>${fmtNum(r.issue)}</td>` +
					`<td>${fmtNum(r.closing)}</td></tr>`;
			});
			if (summaryTotals.hasData) {
				body +=
					`<tr class="grand-total"><td class="text">Grand Total</td>` +
					`<td>${fmtNum(summaryTotals.opening)}</td>` +
					`<td>${fmtNum(summaryTotals.production)}</td>` +
					`<td>${fmtNum(summaryTotals.issue)}</td>` +
					`<td>${fmtNum(summaryTotals.closing)}</td></tr>`;
			}
			body += `</tbody></table>`;
		} else if (view === "qualityDayWise") {
			const dateGroups = qualityDayWiseDates.map((d) => escapeHtml(d));
			body += `<table><thead>`;
			body +=
				`<tr><th rowspan="2">Machine</th>` +
				dateGroups.map((d) => `<th colspan="2">${d}</th>`).join("") +
				`<th colspan="2">Total</th><th colspan="2">Average</th></tr>`;
			const subHeaders = dateGroups
				.map(() => `<th>Prod</th><th>Issue</th>`)
				.join("");
			body +=
				`<tr>${subHeaders}` +
				`<th>Prod</th><th>Issue</th><th>Prod</th><th>Issue</th></tr>`;
			body += `</thead><tbody>`;
			qualityDayWiseRows.forEach((r) => {
				const cls = r.isGrandTotal ? ' class="grand-total"' : "";
				let tds = `<td class="text">${escapeHtml(r.quality_name)}</td>`;
				qualityDayWiseDates.forEach((_, idx) => {
					tds += `<td>${fmtNum(r[`d${idx}_prod`])}</td>`;
					tds += `<td>${fmtNum(r[`d${idx}_iss`])}</td>`;
				});
				tds +=
					`<td>${fmtNum(r.total_prod)}</td>` +
					`<td>${fmtNum(r.total_iss)}</td>` +
					`<td>${fmtNum(r.avg_prod)}</td>` +
					`<td>${fmtNum(r.avg_iss)}</td>`;
				body += `<tr${cls}>${tds}</tr>`;
			});
			body += `</tbody></table>`;
		} else if (view === "dateProduction") {
			body +=
				`<table><thead><tr>` +
				["Date", "Machine", "Opening", "Production", "Issue", "Closing"]
					.map((h) => `<th>${h}</th>`)
					.join("") +
				`</tr></thead><tbody>`;
			dateProductionRows.forEach((r) => {
				const cls = r.isTotal ? ' class="subtotal"' : "";
				body +=
					`<tr${cls}>` +
					`<td class="text">${escapeHtml(r.report_date)}</td>` +
					`<td class="text">${escapeHtml(r.quality_name)}</td>` +
					`<td>${fmtNum(r.opening)}</td>` +
					`<td>${fmtNum(r.production)}</td>` +
					`<td>${fmtNum(r.issue)}</td>` +
					`<td>${fmtNum(r.closing)}</td></tr>`;
			});
			body += `</tbody></table>`;
		} else {
			// dateIssue — pivoted matrix
			const dateHeaders = pivotDates.map((d) => escapeHtml(d));
			body += `<table><thead><tr>`;
			body +=
				`<th>Machine</th>` +
				dateHeaders.map((d) => `<th>${d}</th>`).join("") +
				`<th>Total</th><th>Average</th></tr>`;
			body += `</thead><tbody>`;
			pivotRows.forEach((r) => {
				const cls = r.isGrandTotal ? ' class="grand-total"' : "";
				let tds = `<td class="text">${escapeHtml(r.quality_name)}</td>`;
				pivotDates.forEach((_, idx) => {
					tds += `<td>${fmtNum(r[`d${idx}`])}</td>`;
				});
				tds += `<td>${fmtNum(r.total)}</td><td>${fmtNum(r.average)}</td>`;
				body += `<tr${cls}>${tds}</tr>`;
			});
			body += `</tbody></table>`;
		}

		openPrintWindow(title, body);
	}, [
		view,
		shiftMatrixSpells,
		shiftMatrixRows,
		summaryRows,
		summaryTotals,
		qualityDayWiseDates,
		qualityDayWiseRows,
		dateProductionRows,
		pivotDates,
		pivotRows,
		buildMetaHtml,
	]);

	const printButton = (
		<Button variant="outlined" onClick={handlePrint}>
			Print
		</Button>
	);

	const shiftMatrixColumns = useMemo<GridColDef<ShiftMatrixRow>[]>(() => {
		const machineCol: GridColDef<ShiftMatrixRow> = {
			field: "mc_short_name",
			headerName: "Machine",
			width: 140,
			sortable: false,
		};
		const numCol = (
			field: string,
			header: "OP" | "CL" | "Unit" | "Eff%",
		): GridColDef<ShiftMatrixRow> => ({
			field,
			headerName: header,
			type: "number",
			width: 90,
			sortable: false,
			valueFormatter: (value: unknown) => fmtNum(value),
		});
		const shiftCols: GridColDef<ShiftMatrixRow>[] = shiftMatrixSpells.flatMap(
			({ id }) => [
				numCol(`s${id}_op`, "OP"),
				numCol(`s${id}_cl`, "CL"),
				numCol(`s${id}_unit`, "Unit"),
				numCol(`s${id}_eff`, "Eff%"),
			],
		);
		const overallCols: GridColDef<ShiftMatrixRow>[] = [
			numCol("overall_op", "OP"),
			numCol("overall_cl", "CL"),
			numCol("overall_unit", "Unit"),
			numCol("overall_eff", "Eff%"),
		];
		return [machineCol, ...shiftCols, ...overallCols];
	}, [shiftMatrixSpells]);

	const shiftMatrixGroupingModel = useMemo<GridColumnGroupingModel>(() => {
		const shiftGroups = shiftMatrixSpells.map(({ id, name }) => ({
			groupId: `g_s${id}`,
			headerName: name,
			children: [
				{ field: `s${id}_op` },
				{ field: `s${id}_cl` },
				{ field: `s${id}_unit` },
				{ field: `s${id}_eff` },
			],
		}));
		return [
			...shiftGroups,
			{
				groupId: "g_overall",
				headerName: "Overall",
				children: [
					{ field: "overall_op" },
					{ field: "overall_cl" },
					{ field: "overall_unit" },
					{ field: "overall_eff" },
				],
			},
		];
	}, [shiftMatrixSpells]);

	const summaryColumns = useMemo<GridColDef<SummaryRow>[]>(
		() => [
			{ field: "report_date", headerName: "Date", flex: 1, minWidth: 130 },
			{
				field: "opening",
				headerName: "Opening",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtNum(value),
			},
			{
				field: "production",
				headerName: "Production",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtNum(value),
			},
			{
				field: "issue",
				headerName: "Issue",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtNum(value),
			},
			{
				field: "closing",
				headerName: "Closing",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtNum(value),
			},
		],
		[],
	);

	const dateProductionColumns = useMemo<GridColDef<DateProductionRow>[]>(
		() => [
			{ field: "report_date", headerName: "Date", flex: 0.8, minWidth: 120 },
			{ field: "quality_name", headerName: "Machine", flex: 1.2, minWidth: 160 },
			{
				field: "opening",
				headerName: "Opening",
				type: "number",
				flex: 1,
				minWidth: 120,
				valueFormatter: (value: unknown) => fmtNum(value),
			},
			{
				field: "production",
				headerName: "Production",
				type: "number",
				flex: 1,
				minWidth: 120,
				valueFormatter: (value: unknown) => fmtNum(value),
			},
			{
				field: "issue",
				headerName: "Issue",
				type: "number",
				flex: 1,
				minWidth: 120,
				valueFormatter: (value: unknown) => fmtNum(value),
			},
			{
				field: "closing",
				headerName: "Closing",
				type: "number",
				flex: 1,
				minWidth: 120,
				valueFormatter: (value: unknown) => fmtNum(value),
			},
		],
		[],
	);

	const qualityDayWiseColumns = useMemo<GridColDef<QualityDayWiseRow>[]>(() => {
		const qualityCol: GridColDef<QualityDayWiseRow> = {
			field: "quality_name",
			headerName: "Machine",
			width: 180,
			sortable: false,
		};
		const numCol = (field: string): GridColDef<QualityDayWiseRow> => ({
			field,
			headerName: field.endsWith("_prod") ? "Prod" : "Issue",
			type: "number",
			width: 100,
			sortable: false,
			valueFormatter: (value: unknown) => fmtNum(value),
		});
		const dateCols: GridColDef<QualityDayWiseRow>[] = qualityDayWiseDates.flatMap(
			(_, idx) => [numCol(`d${idx}_prod`), numCol(`d${idx}_iss`)],
		);
		const aggCols: GridColDef<QualityDayWiseRow>[] = [
			numCol("total_prod"),
			numCol("total_iss"),
			numCol("avg_prod"),
			numCol("avg_iss"),
		];
		return [qualityCol, ...dateCols, ...aggCols];
	}, [qualityDayWiseDates]);

	const qualityDayWiseGroupingModel = useMemo<GridColumnGroupingModel>(() => {
		const dateGroups = qualityDayWiseDates.map((d, idx) => ({
			groupId: `g_d${idx}`,
			headerName: d,
			children: [{ field: `d${idx}_prod` }, { field: `d${idx}_iss` }],
		}));
		return [
			...dateGroups,
			{
				groupId: "g_total",
				headerName: "Total",
				children: [{ field: "total_prod" }, { field: "total_iss" }],
			},
			{
				groupId: "g_avg",
				headerName: "Average",
				children: [{ field: "avg_prod" }, { field: "avg_iss" }],
			},
		];
	}, [qualityDayWiseDates]);

	const pivotColumns = useMemo<GridColDef<PivotRow>[]>(() => {
		const qualityCol: GridColDef<PivotRow> = {
			field: "quality_name",
			headerName: "Machine",
			width: 180,
			sortable: false,
		};
		const numCol = (field: string, header: string): GridColDef<PivotRow> => ({
			field,
			headerName: header,
			type: "number",
			width: 110,
			sortable: false,
			valueFormatter: (value: unknown) => fmtNum(value),
		});
		const dateCols: GridColDef<PivotRow>[] = pivotDates.map((d, idx) =>
			numCol(`d${idx}`, d),
		);
		const aggCols: GridColDef<PivotRow>[] = [
			numCol("total", "Total"),
			numCol("average", "Average"),
		];
		return [qualityCol, ...dateCols, ...aggCols];
	}, [pivotDates]);

	const pivotGroupingModel = useMemo<GridColumnGroupingModel>(() => {
		if (pivotDates.length === 0) return [];
		return [
			{
				groupId: "g_dates",
				headerName: "Date",
				children: pivotDates.map((_, idx) => ({ field: `d${idx}` })),
			},
		];
	}, [pivotDates]);

	const subtitle = !mounted
		? " "
		: branchId
			? `Branch: ${
					selectedCompany?.branches.find((b) => b.branch_id === branchId)
						?.branch_name ?? branchId
				} | ${filter.fromDate} to ${filter.toDate}`
			: "Select a company / branch from the sidebar";

	const filterButton = (
		<Button variant="outlined" onClick={() => setFilterDialogOpen(true)}>
			Filter
		</Button>
	);

	const filterDialog = (
		<DrawingFilterDialog
			open={filterDialogOpen}
			onClose={() => setFilterDialogOpen(false)}
			onApply={handleApply}
			initial={filter}
			title={`Filter — ${VIEW_TITLES[view]}`}
		/>
	);

	const snackbarEl = (
		<Snackbar
			open={snackbar.open}
			autoHideDuration={4000}
			onClose={handleSnackbarClose}
			anchorOrigin={{ vertical: "top", horizontal: "center" }}
		>
			<Alert
				severity={snackbar.severity}
				onClose={handleSnackbarClose}
				sx={{ width: "100%" }}
			>
				{snackbar.message}
			</Alert>
		</Snackbar>
	);

	if (view === "shiftMatrix") {
		return (
			<IndexWrapper
				title={VIEW_TITLES[view]}
				subtitle={subtitle}
				rows={shiftMatrixRows}
				columns={shiftMatrixColumns}
				rowCount={shiftMatrixRows.length}
				paginationModel={paginationModel}
				onPaginationModelChange={setPaginationModel}
				loading={loading}
				showLoadingUntilLoaded
				toolbarContent={viewSelect}
				extraActions={
					<>
						{printButton}
						{filterButton}
					</>
				}
				columnGroupingModel={shiftMatrixGroupingModel}
				getRowClassName={(params) => {
					const r = params.row as ShiftMatrixRow;
					if (r.isGrandTotal) return "drawing-row-grand-total";
					if (r.isShedTotal) return "drawing-row-shed-total";
					if (r.isDrgTotal) return "drawing-row-drg-total";
					return "";
				}}
				extraSx={{
					"& .drawing-row-drg-total": {
						bgcolor: "#e3f2fd",
						fontWeight: 600,
					},
					"& .drawing-row-drg-total:hover": { bgcolor: "#e3f2fd" },
					"& .drawing-row-shed-total": {
						bgcolor: "#bbdefb",
						fontWeight: 700,
					},
					"& .drawing-row-shed-total:hover": { bgcolor: "#bbdefb" },
					"& .drawing-row-grand-total": {
						bgcolor: "#0C3C60",
						color: "#fff",
						fontWeight: 700,
					},
					"& .drawing-row-grand-total:hover": { bgcolor: "#0C3C60" },
					"& .drawing-row-grand-total .MuiDataGrid-cell": { color: "#fff" },
				}}
			>
				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	if (view === "summary") {
		return (
			<IndexWrapper
				title={VIEW_TITLES[view]}
				subtitle={subtitle}
				rows={summaryRows}
				columns={summaryColumns}
				rowCount={summaryRows.length}
				paginationModel={paginationModel}
				onPaginationModelChange={setPaginationModel}
				loading={loading}
				showLoadingUntilLoaded
				toolbarContent={viewSelect}
				extraActions={
					<>
						{printButton}
						{filterButton}
					</>
				}
			>
				<Box sx={{ mt: 2, height: 56 }}>
					{mounted ? (
						<DataGrid
							rows={[
								{
									id: "__GRAND_TOTAL__",
									report_date: "Grand Total",
									opening: summaryTotals.opening,
									production: summaryTotals.production,
									issue: summaryTotals.issue,
									closing: summaryTotals.closing,
								},
							]}
							columns={summaryColumns}
							hideFooter
							disableColumnMenu
							disableColumnSorting
							disableRowSelectionOnClick
							columnHeaderHeight={0}
							rowHeight={48}
							sx={{
								"& .MuiDataGrid-columnHeaders": { display: "none" },
								"& .MuiDataGrid-row": { bgcolor: "#0C3C60" },
								"& .MuiDataGrid-cell": {
									color: "#fff",
									fontWeight: 700,
									borderBottom: "none",
								},
								"& .MuiDataGrid-row:hover": { bgcolor: "#0C3C60" },
							}}
						/>
					) : null}
				</Box>
				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	if (view === "qualityDayWise") {
		const chartButton = (
			<Button
				variant="outlined"
				color="primary"
				onClick={() => setChartOpen(true)}
				disabled={qualityDayWiseDates.length === 0}
			>
				Bar Chart
			</Button>
		);

		const chartDialog = (
			<Dialog open={chartOpen} onClose={() => setChartOpen(false)} maxWidth="lg" fullWidth>
				<DialogTitle>Drawing Day-wise — Production vs Issue</DialogTitle>
				<DialogContent dividers>
					{qualityDayWiseDates.length === 0 ? (
						<Typography color="text.secondary" sx={{ p: 4, textAlign: "center" }}>
							No data to chart for the selected range.
						</Typography>
					) : (
						<Box sx={{ width: "100%" }}>
							<BarChart
								xAxis={[
									{
										data: qualityDayWiseDates,
										scaleType: "band",
										label: "Date",
									},
								]}
								yAxis={[{ label: "Meters" }]}
								series={[
									{
										data: qualityDayWiseChartTotals.prod,
										label: "Production",
										color: "#1976d2",
										valueFormatter: (v) => (v == null ? "" : fmtNum(v)),
									},
									{
										data: qualityDayWiseChartTotals.iss,
										label: "Issue",
										color: "#e53935",
										valueFormatter: (v) => (v == null ? "" : fmtNum(v)),
									},
								]}
								height={420}
								margin={{ top: 30, right: 30, left: 70, bottom: 60 }}
							/>
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setChartOpen(false)}>Close</Button>
				</DialogActions>
			</Dialog>
		);

		return (
			<IndexWrapper
				title={VIEW_TITLES[view]}
				subtitle={subtitle}
				rows={qualityDayWiseRows}
				columns={qualityDayWiseColumns}
				rowCount={qualityDayWiseRows.length}
				paginationModel={paginationModel}
				onPaginationModelChange={setPaginationModel}
				loading={loading}
				showLoadingUntilLoaded
				toolbarContent={viewSelect}
				extraActions={
					<>
						{chartButton}
						{printButton}
						{filterButton}
					</>
				}
				columnGroupingModel={qualityDayWiseGroupingModel}
				getRowClassName={(params) =>
					(params.row as QualityDayWiseRow).isGrandTotal ? "drawing-row-total" : ""
				}
				extraSx={{
					"& .drawing-row-total": {
						bgcolor: "#bbdefb",
						fontWeight: 700,
					},
					"& .drawing-row-total:hover": { bgcolor: "#bbdefb" },
				}}
			>
				{chartDialog}
				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	if (view === "dateProduction") {
		return (
			<IndexWrapper
				title={VIEW_TITLES[view]}
				subtitle={subtitle}
				rows={dateProductionRows}
				columns={dateProductionColumns}
				rowCount={dateProductionRows.length}
				paginationModel={paginationModel}
				onPaginationModelChange={setPaginationModel}
				loading={loading}
				showLoadingUntilLoaded
				toolbarContent={viewSelect}
				extraActions={
					<>
						{printButton}
						{filterButton}
					</>
				}
				getRowClassName={(params) =>
					(params.row as DateProductionRow).isTotal ? "drawing-row-total" : ""
				}
				extraSx={{
					"& .drawing-row-total": {
						bgcolor: "#bbdefb",
						fontWeight: 700,
					},
					"& .drawing-row-total:hover": { bgcolor: "#bbdefb" },
				}}
			>
				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	// dateIssue — pivoted grid
	return (
		<IndexWrapper
			title={VIEW_TITLES[view]}
			subtitle={subtitle}
			rows={pivotRows}
			columns={pivotColumns}
			rowCount={pivotRows.length}
			paginationModel={paginationModel}
			onPaginationModelChange={setPaginationModel}
			loading={loading}
			showLoadingUntilLoaded
			toolbarContent={viewSelect}
			extraActions={
				<>
					{printButton}
					{filterButton}
				</>
			}
			columnGroupingModel={pivotGroupingModel}
			getRowClassName={(params) =>
				(params.row as PivotRow).isGrandTotal ? "drawing-row-total" : ""
			}
			extraSx={{
				"& .drawing-row-total": {
					bgcolor: "#bbdefb",
					fontWeight: 700,
				},
				"& .drawing-row-total:hover": { bgcolor: "#bbdefb" },
			}}
		>
			{filterDialog}
			{snackbarEl}
		</IndexWrapper>
	);
}
