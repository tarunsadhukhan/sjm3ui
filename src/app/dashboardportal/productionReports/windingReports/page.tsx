"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Snackbar,
	Alert,
	Button,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	type SelectChangeEvent,
} from "@mui/material";
import {
	GridColDef,
	GridColumnGroupingModel,
	GridPaginationModel,
} from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContextSafe } from "@/components/dashboard/sidebarContext";
import {
	fetchWindingDayWise,
	fetchWindingFnWise,
	fetchWindingMonthWise,
	fetchWindingDaily,
} from "@/utils/windingReportService";
import type {
	WindingEmpPeriodRow,
	WindingDailyRow,
} from "./types/windingReportTypes";
import WindingFilterDialog, {
	type WindingFilterValues,
	getDefaultFromDate,
	getDefaultToDate,
} from "./WindingFilterDialog";

type ViewKey = "dayWise" | "fnWise" | "monthWise" | "daily";

const VIEW_TITLES: Record<ViewKey, string> = {
	dayWise: "Winding Day-wise Production",
	fnWise: "Winding FN-wise Production",
	monthWise: "Winding Month-wise Production",
	daily: "Daily Winding Production",
};

// Sort dd-mm-yyyy date strings chronologically in place.
function sortDdMmYyyy(dates: string[]): void {
	dates.sort((a, b) => {
		const [da, ma, ya] = a.split("-").map(Number);
		const [db, mb, yb] = b.split("-").map(Number);
		return (ya || 0) - (yb || 0) || (ma || 0) - (mb || 0) || (da || 0) - (db || 0);
	});
}

// ─── Daily Winding (Date × Quality × Shift) ─────────────────────────────────
// Pivot into A/B/C shift slots (first 3 distinct spell_ids encountered, sorted
// ascending) with Winders + Production per slot + Total. Avg Prod/8 Hrs is
// computed on the row's total = total_prod / total_winders (each winder works
// an 8-hour shift, so prod/winder == prod-per-8-hours). Per-date Total rows
// are injected at the end of each date group.

const DAILY_SHIFT_SLOTS = ["A", "B", "C"] as const;
type DailyShiftSlot = (typeof DAILY_SHIFT_SLOTS)[number];

type DailyWindingRow = {
	id: string;
	report_date: string;
	quality_id: number | null;
	quality_name: string;
	A_winders: number;
	B_winders: number;
	C_winders: number;
	winders_total: number;
	A_prod: number;
	B_prod: number;
	C_prod: number;
	prod_total: number;
	avg_per_8h: number;
	isDateTotal?: boolean;
};

function pivotDailyWinding(rows: WindingDailyRow[]): DailyWindingRow[] {
	const spellIds = Array.from(
		new Set(
			rows.filter((r) => r.spell_id != null).map((r) => r.spell_id as number),
		),
	).sort((a, b) => a - b);
	const slotForSpell = new Map<number, DailyShiftSlot>();
	spellIds.slice(0, 3).forEach((id, i) => slotForSpell.set(id, DAILY_SHIFT_SLOTS[i]));

	type Cell = { winders: number; production: number };
	type Entry = {
		report_date: string;
		quality_id: number | null;
		quality_name: string;
		perSpell: Map<number, Cell>;
	};
	const dqMap = new Map<string, Entry>();
	const dateOrder: string[] = [];
	const seenDate = new Set<string>();

	rows.forEach((r) => {
		if (!seenDate.has(r.report_date)) {
			seenDate.add(r.report_date);
			dateOrder.push(r.report_date);
		}
		const qId = r.quality_id ?? 0;
		const key = `${r.report_date}|${qId}`;
		let e = dqMap.get(key);
		if (!e) {
			e = {
				report_date: r.report_date,
				quality_id: r.quality_id ?? null,
				quality_name: (r.quality_name ?? "—").trim() || "—",
				perSpell: new Map(),
			};
			dqMap.set(key, e);
		}
		if (r.spell_id != null) {
			e.perSpell.set(r.spell_id, {
				winders: Number(r.winders) || 0,
				production: Number(r.production) || 0,
			});
		}
	});
	sortDdMmYyyy(dateOrder);

	const aggregate = (perSpell: Map<number, Cell>) => {
		const slotW: Record<DailyShiftSlot, number> = { A: 0, B: 0, C: 0 };
		const slotP: Record<DailyShiftSlot, number> = { A: 0, B: 0, C: 0 };
		let wTotal = 0;
		let pTotal = 0;
		perSpell.forEach((cell, spellId) => {
			const slot = slotForSpell.get(spellId);
			if (slot) {
				slotW[slot] += cell.winders;
				slotP[slot] += cell.production;
			}
			wTotal += cell.winders;
			pTotal += cell.production;
		});
		return { slotW, slotP, wTotal, pTotal };
	};

	const buildRow = (e: Entry): DailyWindingRow => {
		const a = aggregate(e.perSpell);
		return {
			id: `${e.report_date}__${e.quality_id ?? 0}`,
			report_date: e.report_date,
			quality_id: e.quality_id,
			quality_name: e.quality_name,
			A_winders: a.slotW.A,
			B_winders: a.slotW.B,
			C_winders: a.slotW.C,
			winders_total: a.wTotal,
			A_prod: a.slotP.A,
			B_prod: a.slotP.B,
			C_prod: a.slotP.C,
			prod_total: a.pTotal,
			avg_per_8h: a.wTotal > 0 ? a.pTotal / a.wTotal : 0,
		};
	};

	const out: DailyWindingRow[] = [];
	dateOrder.forEach((d) => {
		const dateEntries = Array.from(dqMap.values())
			.filter((e) => e.report_date === d)
			.sort((a, b) => a.quality_name.localeCompare(b.quality_name));
		out.push(...dateEntries.map(buildRow));

		const merged = new Map<number, Cell>();
		dateEntries.forEach((e) => {
			e.perSpell.forEach((cell, spellId) => {
				const prev = merged.get(spellId);
				if (prev) {
					prev.winders += cell.winders;
					prev.production += cell.production;
				} else {
					merged.set(spellId, { ...cell });
				}
			});
		});
		const a = aggregate(merged);
		out.push({
			id: `__date_total__${d}`,
			report_date: d,
			quality_id: null,
			quality_name: "Total",
			A_winders: a.slotW.A,
			B_winders: a.slotW.B,
			C_winders: a.slotW.C,
			winders_total: a.wTotal,
			A_prod: a.slotP.A,
			B_prod: a.slotP.B,
			C_prod: a.slotP.C,
			prod_total: a.pTotal,
			avg_per_8h: a.wTotal > 0 ? a.pTotal / a.wTotal : 0,
			isDateTotal: true,
		});
	});

	return out;
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
  tr.date-total td { background: #bbdefb; font-weight: 700; }
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

// Employee × Period pivot. One row per employee, one Prod column per period,
// plus a Total group with Total Prod and Avg Prod/8 Hrs (= total_prod /
// total_hours * 8). A Grand-Total row is appended at the bottom.
type PeriodInfo = { key: string; label: string };

type EmpRow = {
	id: string;
	emp_code: string;
	emp_name: string;
	total_prod: number;
	total_hours: number;
	avg_per_8h: number;
	isGrandTotal?: boolean;
	[key: string]: string | number | boolean | undefined;
};

function pivotEmpPeriod(rows: WindingEmpPeriodRow[]): {
	periods: PeriodInfo[];
	rows: EmpRow[];
} {
	const periodMap = new Map<string, string>();
	type Cell = { prod: number; hours: number };
	const emps = new Map<
		number,
		{ emp_code: string; emp_name: string; cells: Map<string, Cell> }
	>();

	rows.forEach((r) => {
		if (!periodMap.has(r.period_key)) {
			periodMap.set(r.period_key, r.period_label);
		}
		const id = r.emp_id ?? 0;
		let e = emps.get(id);
		if (!e) {
			e = {
				emp_code: r.emp_code ?? "—",
				emp_name: (r.emp_name ?? "—").replace(/\s+/g, " ").trim(),
				cells: new Map(),
			};
			emps.set(id, e);
		}
		const prev = e.cells.get(r.period_key);
		const prod = Number(r.production) || 0;
		const hours = Number(r.total_hours) || 0;
		if (prev) {
			prev.prod += prod;
			prev.hours += hours;
		} else {
			e.cells.set(r.period_key, { prod, hours });
		}
	});

	const periods: PeriodInfo[] = Array.from(periodMap.entries())
		.sort((a, b) => a[0].localeCompare(b[0]))
		.map(([key, label]) => ({ key, label }));

	const out: EmpRow[] = Array.from(emps.entries())
		.sort((a, b) => a[1].emp_code.localeCompare(b[1].emp_code))
		.map(([emp_id, { emp_code, emp_name, cells }]) => {
			const row: EmpRow = {
				id: String(emp_id),
				emp_code,
				emp_name,
				total_prod: 0,
				total_hours: 0,
				avg_per_8h: 0,
			};
			let totalProd = 0;
			let totalHours = 0;
			periods.forEach((p, idx) => {
				const c = cells.get(p.key) ?? { prod: 0, hours: 0 };
				row[`p${idx}_prod`] = c.prod;
				totalProd += c.prod;
				totalHours += c.hours;
			});
			row.total_prod = totalProd;
			row.total_hours = totalHours;
			row.avg_per_8h = totalHours > 0 ? (totalProd / totalHours) * 8 : 0;
			return row;
		});

	if (out.length > 0 && periods.length > 0) {
		const grand: EmpRow = {
			id: "__GRAND_TOTAL__",
			emp_code: "",
			emp_name: "Grand Total",
			total_prod: 0,
			total_hours: 0,
			avg_per_8h: 0,
			isGrandTotal: true,
		};
		let gProd = 0;
		let gHours = 0;
		periods.forEach((p, idx) => {
			let prod = 0;
			let hours = 0;
			emps.forEach(({ cells }) => {
				const c = cells.get(p.key);
				if (!c) return;
				prod += c.prod;
				hours += c.hours;
			});
			grand[`p${idx}_prod`] = prod;
			gProd += prod;
			gHours += hours;
		});
		grand.total_prod = gProd;
		grand.total_hours = gHours;
		grand.avg_per_8h = gHours > 0 ? (gProd / gHours) * 8 : 0;
		out.push(grand);
	}

	return { periods, rows: out };
}

export default function WindingReportsPage() {
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

	const [view, setView] = useState<ViewKey>("dayWise");
	const [periods, setPeriods] = useState<PeriodInfo[]>([]);
	const [empRows, setEmpRows] = useState<EmpRow[]>([]);
	const [dailyRows, setDailyRows] = useState<DailyWindingRow[]>([]);

	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState<WindingFilterValues>(() => ({
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
			setPeriods([]);
			setEmpRows([]);
			setDailyRows([]);
			return;
		}
		if (!filter.fromDate || !filter.toDate) return;

		setLoading(true);
		try {
			if (view === "daily") {
				const data = await fetchWindingDaily(
					branchId,
					filter.fromDate,
					filter.toDate,
				);
				setDailyRows(pivotDailyWinding(data));
			} else {
				let data: WindingEmpPeriodRow[];
				if (view === "dayWise") {
					data = await fetchWindingDayWise(branchId, filter.fromDate, filter.toDate);
				} else if (view === "fnWise") {
					data = await fetchWindingFnWise(branchId, filter.fromDate, filter.toDate);
				} else {
					data = await fetchWindingMonthWise(branchId, filter.fromDate, filter.toDate);
				}
				const pivot = pivotEmpPeriod(data);
				setPeriods(pivot.periods);
				setEmpRows(pivot.rows);
			}
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching report";
			setSnackbar({ open: true, message, severity: "error" });
			setPeriods([]);
			setEmpRows([]);
			setDailyRows([]);
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
		<FormControl size="small" sx={{ minWidth: 280 }}>
			<InputLabel id="winding-report-view-label">Report</InputLabel>
			<Select<ViewKey>
				labelId="winding-report-view-label"
				label="Report"
				value={view}
				onChange={handleViewChange}
			>
				<MenuItem value="dayWise">Day Wise Production</MenuItem>
				<MenuItem value="fnWise">FN Wise Production</MenuItem>
				<MenuItem value="monthWise">Month Wise Production</MenuItem>
				<MenuItem value="daily">Daily Winding Production</MenuItem>
			</Select>
		</FormControl>
	);

	const handleApply = useCallback((values: WindingFilterValues) => {
		setFilter(values);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, []);

	const handleSnackbarClose = useCallback(() => {
		setSnackbar((prev) => ({ ...prev, open: false }));
	}, []);

	const branchLabel = useMemo(() => {
		if (!branchId) return "";
		return (
			selectedCompany?.branches.find((b) => b.branch_id === branchId)
				?.branch_name ?? String(branchId)
		);
	}, [branchId, selectedCompany]);

	const buildMetaHtml = useCallback(() => {
		const branchPart = branchLabel ? `Branch: ${escapeHtml(branchLabel)} | ` : "";
		return `<div class="meta">${branchPart}From ${escapeHtml(filter.fromDate)} to ${escapeHtml(filter.toDate)}</div>`;
	}, [branchLabel, filter.fromDate, filter.toDate]);

	const handlePrint = useCallback(() => {
		const title = VIEW_TITLES[view];
		let body = `<h1>${escapeHtml(title)}</h1>` + buildMetaHtml();

		if (view === "daily") {
			body += `<table><thead>`;
			body +=
				`<tr>` +
				`<th rowspan="2">Date</th>` +
				`<th rowspan="2">Quality</th>` +
				`<th colspan="4">No of Winders</th>` +
				`<th colspan="4">Production</th>` +
				`<th rowspan="2">Avg Prod/8 Hrs</th>` +
				`</tr>`;
			body +=
				`<tr>` +
				`<th>A</th><th>B</th><th>C</th><th>Total</th>` +
				`<th>A</th><th>B</th><th>C</th><th>Total</th>` +
				`</tr>`;
			body += `</thead><tbody>`;
			dailyRows.forEach((r) => {
				const cls = r.isDateTotal ? ' class="date-total"' : "";
				body +=
					`<tr${cls}>` +
					`<td class="text">${escapeHtml(r.report_date)}</td>` +
					`<td class="text">${escapeHtml(r.quality_name)}</td>` +
					`<td>${fmtNum(r.A_winders)}</td>` +
					`<td>${fmtNum(r.B_winders)}</td>` +
					`<td>${fmtNum(r.C_winders)}</td>` +
					`<td>${fmtNum(r.winders_total)}</td>` +
					`<td>${fmtNum(r.A_prod)}</td>` +
					`<td>${fmtNum(r.B_prod)}</td>` +
					`<td>${fmtNum(r.C_prod)}</td>` +
					`<td>${fmtNum(r.prod_total)}</td>` +
					`<td>${fmtNum(r.avg_per_8h)}</td>` +
					`</tr>`;
			});
			body += `</tbody></table>`;
			openPrintWindow(title, body);
			return;
		}

		const periodCols = periods
			.map((p) => `<th>${escapeHtml(p.label)}</th>`)
			.join("");
		body += `<table><thead>`;
		body +=
			`<tr>` +
			`<th rowspan="2">Emp Code</th>` +
			`<th rowspan="2">Name</th>` +
			`<th colspan="${Math.max(periods.length, 1)}">Production</th>` +
			`<th colspan="2">Total</th>` +
			`</tr>`;
		body += `<tr>${periodCols || "<th></th>"}<th>Prod</th><th>Avg Prod/8 Hrs</th></tr>`;
		body += `</thead><tbody>`;
		empRows.forEach((r) => {
			const cls = r.isGrandTotal ? ' class="grand-total"' : "";
			let tds =
				`<td class="text">${escapeHtml(r.emp_code)}</td>` +
				`<td class="text">${escapeHtml(r.emp_name)}</td>`;
			periods.forEach((_, idx) => {
				tds += `<td>${fmtNum(r[`p${idx}_prod`])}</td>`;
			});
			tds +=
				`<td>${fmtNum(r.total_prod)}</td>` +
				`<td>${fmtNum(r.avg_per_8h)}</td>`;
			body += `<tr${cls}>${tds}</tr>`;
		});
		body += `</tbody></table>`;
		openPrintWindow(title, body);
	}, [view, periods, empRows, dailyRows, buildMetaHtml]);

	const columns = useMemo<GridColDef<EmpRow>[]>(() => {
		const num = (
			field: string,
			header: string,
			minWidth = 90,
			flex = 1,
		): GridColDef<EmpRow> => ({
			field,
			headerName: header,
			type: "number",
			flex,
			minWidth,
			sortable: false,
			valueFormatter: (value: unknown) => fmtNum(value),
		});
		const periodCols: GridColDef<EmpRow>[] = periods.map((p, idx) =>
			num(`p${idx}_prod`, p.label, 100),
		);
		return [
			{
				field: "emp_code",
				headerName: "Emp Code",
				flex: 1,
				minWidth: 100,
				sortable: false,
			},
			{
				field: "emp_name",
				headerName: "Name",
				flex: 2,
				minWidth: 180,
				sortable: false,
			},
			...periodCols,
			num("total_prod", "Prod", 100),
			num("avg_per_8h", "Avg Prod/8 Hrs", 130),
		];
	}, [periods]);

	const dailyColumns = useMemo<GridColDef<DailyWindingRow>[]>(() => {
		const num = (
			field: keyof DailyWindingRow,
			header: string,
			minWidth = 80,
			flex = 1,
		): GridColDef<DailyWindingRow> => ({
			field: field as string,
			headerName: header,
			type: "number",
			flex,
			minWidth,
			sortable: false,
			valueFormatter: (value: unknown) => fmtNum(value),
		});
		return [
			{
				field: "report_date",
				headerName: "Date",
				flex: 1,
				minWidth: 100,
				sortable: false,
			},
			{
				field: "quality_name",
				headerName: "Quality",
				flex: 2,
				minWidth: 200,
				sortable: false,
			},
			num("A_winders", "A", 65),
			num("B_winders", "B", 65),
			num("C_winders", "C", 65),
			num("winders_total", "Total", 85),
			num("A_prod", "A", 85),
			num("B_prod", "B", 85),
			num("C_prod", "C", 85),
			num("prod_total", "Total", 95),
			num("avg_per_8h", "Avg Prod/8 Hrs", 130),
		];
	}, []);

	const dailyGroupingModel = useMemo<GridColumnGroupingModel>(
		() => [
			{
				groupId: "g_winders",
				headerName: "No of Winders",
				children: [
					{ field: "A_winders" },
					{ field: "B_winders" },
					{ field: "C_winders" },
					{ field: "winders_total" },
				],
			},
			{
				groupId: "g_prod",
				headerName: "Production",
				children: [
					{ field: "A_prod" },
					{ field: "B_prod" },
					{ field: "C_prod" },
					{ field: "prod_total" },
				],
			},
		],
		[],
	);

	const groupingModel = useMemo<GridColumnGroupingModel>(() => {
		if (periods.length === 0) {
			return [
				{
					groupId: "g_total",
					headerName: "Total",
					children: [{ field: "total_prod" }, { field: "avg_per_8h" }],
				},
			];
		}
		return [
			{
				groupId: "g_periods",
				headerName: "Production",
				children: periods.map((_, idx) => ({ field: `p${idx}_prod` })),
			},
			{
				groupId: "g_total",
				headerName: "Total",
				children: [{ field: "total_prod" }, { field: "avg_per_8h" }],
			},
		];
	}, [periods]);

	const subtitle = !mounted
		? " "
		: branchId
			? `Branch: ${branchLabel} | ${filter.fromDate} to ${filter.toDate}`
			: "Select a company / branch from the sidebar";

	const filterButton = (
		<Button variant="outlined" onClick={() => setFilterDialogOpen(true)}>
			Filter
		</Button>
	);

	const printButton = (
		<Button variant="outlined" onClick={handlePrint}>
			Print
		</Button>
	);

	const filterDialog = (
		<WindingFilterDialog
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

	const totalRowSx = {
		"& .winding-row-date-total": { bgcolor: "#bbdefb", fontWeight: 700 },
		"& .winding-row-date-total:hover": { bgcolor: "#bbdefb" },
		"& .winding-row-grand-total": {
			bgcolor: "#0C3C60",
			color: "#fff",
			fontWeight: 700,
		},
		"& .winding-row-grand-total:hover": { bgcolor: "#0C3C60" },
		"& .winding-row-grand-total .MuiDataGrid-cell": { color: "#fff" },
	};

	if (view === "daily") {
		return (
			<IndexWrapper
				title={VIEW_TITLES[view]}
				subtitle={subtitle}
				rows={dailyRows}
				columns={dailyColumns}
				rowCount={dailyRows.length}
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
				columnGroupingModel={dailyGroupingModel}
				getRowClassName={(params) =>
					(params.row as DailyWindingRow).isDateTotal
						? "winding-row-date-total"
						: ""
				}
				extraSx={totalRowSx}
			>
				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	return (
		<IndexWrapper
			title={VIEW_TITLES[view]}
			subtitle={subtitle}
			rows={empRows}
			columns={columns}
			rowCount={empRows.length}
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
			columnGroupingModel={groupingModel}
			getRowClassName={(params) =>
				(params.row as EmpRow).isGrandTotal ? "winding-row-grand-total" : ""
			}
			extraSx={totalRowSx}
		>
			{filterDialog}
			{snackbarEl}
		</IndexWrapper>
	);
}
