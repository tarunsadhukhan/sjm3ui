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
	fetchSpinningProductionEff,
	fetchSpinningMcDate,
	fetchSpinningEmpDate,
	fetchSpinningFrameRunning,
	fetchSpinningRunningHoursEff,
} from "@/utils/spinningReportService";
import type {
	SpinningProductionEffRow,
	SpinningMcDateRow,
	SpinningEmpDateRow,
	SpinningFrameRunningRow,
	SpinningRunningHoursEffRow,
} from "./types/spinningReportTypes";
import SpinningFilterDialog, {
	type SpinningFilterValues,
	getDefaultFromDate,
	getDefaultToDate,
} from "./SpinningFilterDialog";

type ViewKey =
	| "productionEff"
	| "mcDate"
	| "empDate"
	| "frameRunning"
	| "runningHoursEff";

const VIEW_TITLES: Record<ViewKey, string> = {
	productionEff: "Spinning Production and Eff",
	mcDate: "Spinning Mc-wise Date-wise Production / Eff",
	empDate: "Spinning Employee-wise Date-wise Production / Eff",
	frameRunning: "Spinning Frame-wise Running Eff",
	runningHoursEff: "Spinning Production Eff (Running Hours basis)",
};

// Sort a list of dd-mm-yyyy date strings chronologically, in place. SQL emits
// dates in encounter order (per machine) so we re-order them here for display.
function sortDdMmYyyy(dates: string[]): void {
	dates.sort((a, b) => {
		const [da, ma, ya] = a.split("-").map(Number);
		const [db, mb, yb] = b.split("-").map(Number);
		return (ya || 0) - (yb || 0) || (ma || 0) - (mb || 0) || (da || 0) - (db || 0);
	});
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

// ─── View 1: Production / Eff (Date × Quality × Shift) ───────────────────────
// Fixed report header (always):
//   Date | Quality | Frame [A B C Total] | Production [A B C Total] | Eff | Avg/Frame
//
// The first three distinct spell_ids encountered in the data (sorted asc) are
// mapped to slots A / B / C in that order. Any 4th+ spell contributes only to
// the Total columns.  Per-date Total rows are injected at the end of each
// date group, aggregating raw frames / production / tarprod across qualities
// and recomputing eff = SUM(prod)/SUM(tarprod)*100 and avg = SUM(prod)/SUM(frames).

const SHIFT_SLOTS = ["A", "B", "C"] as const;
type ShiftSlot = (typeof SHIFT_SLOTS)[number];

type ProductionEffRow = {
	id: string;
	report_date: string;
	quality_id: number | null;
	quality_name: string;
	A_frames: number;
	B_frames: number;
	C_frames: number;
	frames_total: number;
	A_prod: number;
	B_prod: number;
	C_prod: number;
	prod_total: number;
	overall_eff: number;
	overall_avg: number;
	isDateTotal?: boolean;
};

function pivotProductionEff(rows: SpinningProductionEffRow[]): ProductionEffRow[] {
	// Collect distinct spell_ids in ascending order and map first 3 to A/B/C.
	const spellIds = Array.from(
		new Set(
			rows.filter((r) => r.spell_id != null).map((r) => r.spell_id as number),
		),
	).sort((a, b) => a - b);
	const slotForSpell = new Map<number, ShiftSlot>();
	spellIds.slice(0, 3).forEach((id, i) => slotForSpell.set(id, SHIFT_SLOTS[i]));

	type Cell = { frames: number; production: number; tarprod: number };
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
				quality_name: r.quality_name ?? "—",
				perSpell: new Map(),
			};
			dqMap.set(key, e);
		}
		if (r.spell_id != null) {
			e.perSpell.set(r.spell_id, {
				frames: Number(r.frames) || 0,
				production: Number(r.production) || 0,
				tarprod: Number(r.tarprod) || 0,
			});
		}
	});
	sortDdMmYyyy(dateOrder);

	// Aggregate an Entry's perSpell map into a ProductionEffRow.
	const aggregate = (
		perSpell: Map<number, Cell>,
	): {
		slotFrames: Record<ShiftSlot, number>;
		slotProd: Record<ShiftSlot, number>;
		framesTotal: number;
		prodTotal: number;
		tarTotal: number;
	} => {
		const slotFrames: Record<ShiftSlot, number> = { A: 0, B: 0, C: 0 };
		const slotProd: Record<ShiftSlot, number> = { A: 0, B: 0, C: 0 };
		let framesTotal = 0;
		let prodTotal = 0;
		let tarTotal = 0;
		perSpell.forEach((cell, spellId) => {
			const slot = slotForSpell.get(spellId);
			if (slot) {
				slotFrames[slot] += cell.frames;
				slotProd[slot] += cell.production;
			}
			framesTotal += cell.frames;
			prodTotal += cell.production;
			tarTotal += cell.tarprod;
		});
		return { slotFrames, slotProd, framesTotal, prodTotal, tarTotal };
	};

	const buildRow = (e: Entry): ProductionEffRow => {
		const a = aggregate(e.perSpell);
		return {
			id: `${e.report_date}__${e.quality_id ?? 0}`,
			report_date: e.report_date,
			quality_id: e.quality_id,
			quality_name: e.quality_name,
			A_frames: a.slotFrames.A,
			B_frames: a.slotFrames.B,
			C_frames: a.slotFrames.C,
			frames_total: a.framesTotal,
			A_prod: a.slotProd.A,
			B_prod: a.slotProd.B,
			C_prod: a.slotProd.C,
			prod_total: a.prodTotal,
			overall_eff: a.tarTotal > 0 ? (a.prodTotal / a.tarTotal) * 100 : 0,
			overall_avg: a.framesTotal > 0 ? a.prodTotal / a.framesTotal : 0,
		};
	};

	const out: ProductionEffRow[] = [];
	dateOrder.forEach((d) => {
		const dateEntries = Array.from(dqMap.values())
			.filter((e) => e.report_date === d)
			.sort((a, b) => a.quality_name.localeCompare(b.quality_name));
		out.push(...dateEntries.map(buildRow));

		// Per-date Total row — re-aggregate from the raw cells so eff and avg
		// are computed from the underlying sums (not averages of averages).
		const merged = new Map<number, Cell>();
		dateEntries.forEach((e) => {
			e.perSpell.forEach((cell, spellId) => {
				const prev = merged.get(spellId);
				if (prev) {
					prev.frames += cell.frames;
					prev.production += cell.production;
					prev.tarprod += cell.tarprod;
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
			A_frames: a.slotFrames.A,
			B_frames: a.slotFrames.B,
			C_frames: a.slotFrames.C,
			frames_total: a.framesTotal,
			A_prod: a.slotProd.A,
			B_prod: a.slotProd.B,
			C_prod: a.slotProd.C,
			prod_total: a.prodTotal,
			overall_eff: a.tarTotal > 0 ? (a.prodTotal / a.tarTotal) * 100 : 0,
			overall_avg: a.framesTotal > 0 ? a.prodTotal / a.framesTotal : 0,
			isDateTotal: true,
		});
	});

	return out;
}

// ─── View 2: Machine × Date pivot (Prod / Eff / Avg-per-Frame) ──────────────
// Rows = machines. Column groups: one per date with Prod / Eff% / Avg/Frame
// sub-columns, plus an Overall group on the right summing across dates. A
// Grand-Total row is appended at the bottom. Eff% and Avg/Frame are computed
// from the raw frames / production / tarprod sums (not averaged) so totals
// stay mathematically correct.

type McDateRow = {
	id: string;
	mc_name: string;
	overall_prod: number;
	overall_eff: number;
	overall_avg: number;
	isGrandTotal?: boolean;
	[key: string]: string | number | boolean | undefined;
};

function pivotMcDate(rows: SpinningMcDateRow[]): {
	dates: string[];
	rows: McDateRow[];
} {
	const dateOrder: string[] = [];
	const seenDate = new Set<string>();
	type Cell = { frames: number; production: number; tarprod: number };
	const machines = new Map<
		number,
		{ mc_name: string; cells: Map<string, Cell> }
	>();
	rows.forEach((r) => {
		if (!seenDate.has(r.report_date)) {
			seenDate.add(r.report_date);
			dateOrder.push(r.report_date);
		}
		const id = r.mc_id ?? 0;
		let m = machines.get(id);
		if (!m) {
			m = { mc_name: r.mc_name ?? "—", cells: new Map() };
			machines.set(id, m);
		}
		m.cells.set(r.report_date, {
			frames: Number(r.frames) || 0,
			production: Number(r.production) || 0,
			tarprod: Number(r.tarprod) || 0,
		});
	});
	sortDdMmYyyy(dateOrder);

	const out: McDateRow[] = Array.from(machines.entries())
		.sort((a, b) => a[1].mc_name.localeCompare(b[1].mc_name))
		.map(([mc_id, { mc_name, cells }]) => {
			const row: McDateRow = {
				id: String(mc_id),
				mc_name,
				overall_prod: 0,
				overall_eff: 0,
				overall_avg: 0,
			};
			let totalFrames = 0;
			let totalProd = 0;
			let totalTar = 0;
			dateOrder.forEach((d, idx) => {
				const c = cells.get(d) ?? { frames: 0, production: 0, tarprod: 0 };
				row[`d${idx}_prod`] = c.production;
				row[`d${idx}_eff`] = c.tarprod > 0 ? (c.production / c.tarprod) * 100 : 0;
				row[`d${idx}_avg`] = c.frames > 0 ? c.production / c.frames : 0;
				totalFrames += c.frames;
				totalProd += c.production;
				totalTar += c.tarprod;
			});
			row.overall_prod = totalProd;
			row.overall_eff = totalTar > 0 ? (totalProd / totalTar) * 100 : 0;
			row.overall_avg = totalFrames > 0 ? totalProd / totalFrames : 0;
			return row;
		});

	if (out.length > 0 && dateOrder.length > 0) {
		const grand: McDateRow = {
			id: "__GRAND_TOTAL__",
			mc_name: "Grand Total",
			overall_prod: 0,
			overall_eff: 0,
			overall_avg: 0,
			isGrandTotal: true,
		};
		let gFrames = 0;
		let gProd = 0;
		let gTar = 0;
		dateOrder.forEach((d, idx) => {
			let frames = 0;
			let prod = 0;
			let tar = 0;
			machines.forEach(({ cells }) => {
				const c = cells.get(d);
				if (!c) return;
				frames += c.frames;
				prod += c.production;
				tar += c.tarprod;
			});
			grand[`d${idx}_prod`] = prod;
			grand[`d${idx}_eff`] = tar > 0 ? (prod / tar) * 100 : 0;
			grand[`d${idx}_avg`] = frames > 0 ? prod / frames : 0;
			gFrames += frames;
			gProd += prod;
			gTar += tar;
		});
		grand.overall_prod = gProd;
		grand.overall_eff = gTar > 0 ? (gProd / gTar) * 100 : 0;
		grand.overall_avg = gFrames > 0 ? gProd / gFrames : 0;
		out.push(grand);
	}

	return { dates: dateOrder, rows: out };
}

// ─── View 3: Entity × Date pivot (emp-wise) ──────────────────────────────────
// Returns one row per entity with d{idx}_prod / d{idx}_eff columns per date,
// plus total_prod / total_eff / avg_prod / avg_eff groups. A Grand-Total row
// is appended at the end.

type EntityDateRow = {
	id: string;
	entity_name: string;
	isGrandTotal?: boolean;
	[key: string]: string | number | boolean | undefined;
};

function pivotEntityDate(
	rows: Array<{
		report_date: string;
		entity_id: number;
		entity_name: string;
		production: number;
		eff: number;
	}>,
): { dates: string[]; rows: EntityDateRow[] } {
	const dateOrder: string[] = [];
	const seenDate = new Set<string>();
	type Cell = { prod: number; eff: number };
	const entities = new Map<
		number,
		{ entity_name: string; cells: Map<string, Cell> }
	>();
	rows.forEach((r) => {
		if (!seenDate.has(r.report_date)) {
			seenDate.add(r.report_date);
			dateOrder.push(r.report_date);
		}
		let e = entities.get(r.entity_id);
		if (!e) {
			e = { entity_name: r.entity_name, cells: new Map() };
			entities.set(r.entity_id, e);
		}
		e.cells.set(r.report_date, {
			prod: Number(r.production) || 0,
			eff: Number(r.eff) || 0,
		});
	});
	sortDdMmYyyy(dateOrder);

	const out: EntityDateRow[] = Array.from(entities.entries())
		.sort((a, b) => a[1].entity_name.localeCompare(b[1].entity_name))
		.map(([entity_id, { entity_name, cells }]) => {
			const row: EntityDateRow = { id: String(entity_id), entity_name };
			let totalProd = 0;
			let effSum = 0;
			let effCount = 0;
			let prodCount = 0;
			dateOrder.forEach((d, idx) => {
				const c = cells.get(d) ?? { prod: 0, eff: 0 };
				row[`d${idx}_prod`] = c.prod;
				row[`d${idx}_eff`] = c.eff;
				totalProd += c.prod;
				if (c.prod > 0) prodCount += 1;
				if (c.eff > 0) {
					effSum += c.eff;
					effCount += 1;
				}
			});
			row.total_prod = totalProd;
			row.total_eff = effCount > 0 ? effSum / effCount : 0;
			row.avg_prod = prodCount > 0 ? totalProd / prodCount : 0;
			row.avg_eff = row.total_eff;
			return row;
		});

	if (out.length > 0 && dateOrder.length > 0) {
		const grand: EntityDateRow = {
			id: "__GRAND_TOTAL__",
			entity_name: "Grand Total",
			isGrandTotal: true,
		};
		let gTotal = 0;
		let gEffSum = 0;
		let gEffCount = 0;
		dateOrder.forEach((_, idx) => {
			let prod = 0;
			let effSum = 0;
			let effCount = 0;
			out.forEach((r) => {
				prod += Number(r[`d${idx}_prod`]) || 0;
				const e = Number(r[`d${idx}_eff`]) || 0;
				if (e > 0) {
					effSum += e;
					effCount += 1;
				}
			});
			grand[`d${idx}_prod`] = prod;
			grand[`d${idx}_eff`] = effCount > 0 ? effSum / effCount : 0;
			gTotal += prod;
			gEffSum += effSum;
			gEffCount += effCount;
		});
		grand.total_prod = gTotal;
		grand.total_eff = gEffCount > 0 ? gEffSum / gEffCount : 0;
		grand.avg_prod = dateOrder.length > 0 ? gTotal / dateOrder.length : 0;
		grand.avg_eff = grand.total_eff;
		out.push(grand);
	}

	return { dates: dateOrder, rows: out };
}

// ─── View 4: Frame Running (Machine × Date pivot — Hrs / Eff%) ───────────────
// Rows = machines. Column groups: one per date with Hrs + Eff% sub-columns,
// plus an Overall group summing across dates. A "Total" row is appended at
// the bottom that aggregates across machines for each date. Eff% is computed
// from the raw running_hours / total_hours sums.

type FrameRunningRow = {
	id: string;
	mc_name: string;
	overall_hrs: number;
	overall_eff: number;
	isTotal?: boolean;
	[key: string]: string | number | boolean | undefined;
};

function pivotFrameRunning(rows: SpinningFrameRunningRow[]): {
	dates: string[];
	rows: FrameRunningRow[];
} {
	const dateOrder: string[] = [];
	const seenDate = new Set<string>();
	type Cell = { running: number; total: number };
	const machines = new Map<
		number,
		{ mc_name: string; cells: Map<string, Cell> }
	>();
	rows.forEach((r) => {
		if (!seenDate.has(r.report_date)) {
			seenDate.add(r.report_date);
			dateOrder.push(r.report_date);
		}
		const id = r.mc_id ?? 0;
		let m = machines.get(id);
		if (!m) {
			m = { mc_name: r.mc_name ?? "—", cells: new Map() };
			machines.set(id, m);
		}
		m.cells.set(r.report_date, {
			running: Number(r.running_hours) || 0,
			total: Number(r.total_hours) || 0,
		});
	});
	sortDdMmYyyy(dateOrder);

	const out: FrameRunningRow[] = Array.from(machines.entries())
		.sort((a, b) => a[1].mc_name.localeCompare(b[1].mc_name))
		.map(([mc_id, { mc_name, cells }]) => {
			const row: FrameRunningRow = {
				id: String(mc_id),
				mc_name,
				overall_hrs: 0,
				overall_eff: 0,
			};
			let totalRunning = 0;
			let totalTotal = 0;
			dateOrder.forEach((d, idx) => {
				const c = cells.get(d) ?? { running: 0, total: 0 };
				row[`d${idx}_hrs`] = c.running;
				row[`d${idx}_eff`] =
					c.total > 0 ? (c.running / c.total) * 100 : 0;
				totalRunning += c.running;
				totalTotal += c.total;
			});
			row.overall_hrs = totalRunning;
			row.overall_eff = totalTotal > 0 ? (totalRunning / totalTotal) * 100 : 0;
			return row;
		});

	if (out.length > 0 && dateOrder.length > 0) {
		const totalRow: FrameRunningRow = {
			id: "__GRAND_TOTAL__",
			mc_name: "Total",
			overall_hrs: 0,
			overall_eff: 0,
			isTotal: true,
		};
		let gRunning = 0;
		let gTotal = 0;
		dateOrder.forEach((d, idx) => {
			let running = 0;
			let totalH = 0;
			machines.forEach(({ cells }) => {
				const c = cells.get(d);
				if (!c) return;
				running += c.running;
				totalH += c.total;
			});
			totalRow[`d${idx}_hrs`] = running;
			totalRow[`d${idx}_eff`] = totalH > 0 ? (running / totalH) * 100 : 0;
			gRunning += running;
			gTotal += totalH;
		});
		totalRow.overall_hrs = gRunning;
		totalRow.overall_eff = gTotal > 0 ? (gRunning / gTotal) * 100 : 0;
		out.push(totalRow);
	}

	return { dates: dateOrder, rows: out };
}

// ─── View 5: Running-Hours-based Eff ──────────────────────────────────────

type RunningHoursEffRow = {
	id: string;
	mc_name: string;
	quality_name: string;
	production: number;
	running_hours: number;
	eff: number;
	isGrandTotal?: boolean;
};

function buildRunningHoursEffRows(
	rows: SpinningRunningHoursEffRow[],
): RunningHoursEffRow[] {
	const out: RunningHoursEffRow[] = rows.map((r, idx) => ({
		id: `${r.mc_id ?? "m"}_${r.quality_id ?? "q"}_${idx}`,
		mc_name: r.mc_name ?? "—",
		quality_name: r.quality_name ?? "—",
		production: Number(r.production) || 0,
		running_hours: Number(r.running_hours) || 0,
		eff: Number(r.eff) || 0,
	}));
	if (out.length === 0) return out;
	const prod = out.reduce((s, r) => s + r.production, 0);
	const running = out.reduce((s, r) => s + r.running_hours, 0);
	const effSum = out.reduce((s, r) => s + (r.eff > 0 ? r.eff : 0), 0);
	const effCount = out.filter((r) => r.eff > 0).length;
	out.push({
		id: "__GRAND_TOTAL__",
		mc_name: "Grand Total",
		quality_name: "",
		production: prod,
		running_hours: running,
		eff: effCount > 0 ? effSum / effCount : 0,
		isGrandTotal: true,
	});
	return out;
}

// ────────────────────────────────────────────────────────────────────────────

export default function SpinningReportsPage() {
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

	const [view, setView] = useState<ViewKey>("productionEff");

	// View 1 state
	const [peRows, setPeRows] = useState<ProductionEffRow[]>([]);

	// View 2 state
	const [mcDates, setMcDates] = useState<string[]>([]);
	const [mcRows, setMcRows] = useState<McDateRow[]>([]);

	// View 3 state
	const [empDates, setEmpDates] = useState<string[]>([]);
	const [empRows, setEmpRows] = useState<EntityDateRow[]>([]);

	// View 4 state
	const [frameDates, setFrameDates] = useState<string[]>([]);
	const [frameRows, setFrameRows] = useState<FrameRunningRow[]>([]);

	// View 5 state
	const [rhEffRows, setRhEffRows] = useState<RunningHoursEffRow[]>([]);

	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState<SpinningFilterValues>(() => ({
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

	const resetAll = useCallback(() => {
		setPeRows([]);
		setMcDates([]);
		setMcRows([]);
		setEmpDates([]);
		setEmpRows([]);
		setFrameDates([]);
		setFrameRows([]);
		setRhEffRows([]);
	}, []);

	const loadReport = useCallback(async () => {
		if (!branchId) {
			resetAll();
			return;
		}
		if (!filter.fromDate || !filter.toDate) return;

		setLoading(true);
		try {
			if (view === "productionEff") {
				const data = await fetchSpinningProductionEff(
					branchId,
					filter.fromDate,
					filter.toDate,
				);
				setPeRows(pivotProductionEff(data));
			} else if (view === "mcDate") {
				const data = await fetchSpinningMcDate(
					branchId,
					filter.fromDate,
					filter.toDate,
				);
				const pivot = pivotMcDate(data);
				setMcDates(pivot.dates);
				setMcRows(pivot.rows);
			} else if (view === "empDate") {
				const data = await fetchSpinningEmpDate(
					branchId,
					filter.fromDate,
					filter.toDate,
				);
				const pivot = pivotEntityDate(
					data.map((r) => ({
						report_date: r.report_date,
						entity_id: r.emp_id ?? 0,
						entity_name: r.emp_name ?? "—",
						production: r.production,
						eff: r.eff,
					})),
				);
				setEmpDates(pivot.dates);
				setEmpRows(pivot.rows);
			} else if (view === "frameRunning") {
				const data = await fetchSpinningFrameRunning(
					branchId,
					filter.fromDate,
					filter.toDate,
				);
				const pivot = pivotFrameRunning(data);
				setFrameDates(pivot.dates);
				setFrameRows(pivot.rows);
			} else if (view === "runningHoursEff") {
				const data = await fetchSpinningRunningHoursEff(
					branchId,
					filter.fromDate,
					filter.toDate,
				);
				setRhEffRows(buildRunningHoursEffRows(data));
			}
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching report";
			setSnackbar({ open: true, message, severity: "error" });
			resetAll();
		} finally {
			setLoading(false);
		}
	}, [view, branchId, filter.fromDate, filter.toDate, resetAll]);

	useEffect(() => {
		loadReport();
	}, [loadReport]);

	const handleViewChange = useCallback((e: SelectChangeEvent<ViewKey>) => {
		setView(e.target.value as ViewKey);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, []);

	const viewSelect = (
		<FormControl size="small" sx={{ minWidth: 320 }}>
			<InputLabel id="spinning-report-view-label">Report</InputLabel>
			<Select<ViewKey>
				labelId="spinning-report-view-label"
				label="Report"
				value={view}
				onChange={handleViewChange}
			>
				<MenuItem value="productionEff">Spinning Production and Eff</MenuItem>
				<MenuItem value="mcDate">Spinning Mc-wise Date-wise Production / Eff</MenuItem>
				<MenuItem value="empDate">Spinning Employee-wise Date-wise Production / Eff</MenuItem>
				<MenuItem value="frameRunning">Spinning Frame-wise Running Eff</MenuItem>
				<MenuItem value="runningHoursEff">
					Spinning Production Eff (Running Hours basis)
				</MenuItem>
			</Select>
		</FormControl>
	);

	const handleApply = useCallback((values: SpinningFilterValues) => {
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

		if (view === "productionEff") {
			body += `<table><thead>`;
			body +=
				`<tr>` +
				`<th rowspan="2">Date</th>` +
				`<th rowspan="2">Quality</th>` +
				`<th colspan="4">Frame</th>` +
				`<th colspan="4">Production</th>` +
				`<th rowspan="2">Eff%</th>` +
				`<th rowspan="2">Avg/Frame</th>` +
				`</tr>`;
			body +=
				`<tr>` +
				`<th>A</th><th>B</th><th>C</th><th>Total</th>` +
				`<th>A</th><th>B</th><th>C</th><th>Total</th>` +
				`</tr>`;
			body += `</thead><tbody>`;
			peRows.forEach((r) => {
				const cls = r.isDateTotal ? ' class="date-total"' : "";
				body +=
					`<tr${cls}>` +
					`<td class="text">${escapeHtml(r.report_date)}</td>` +
					`<td class="text">${escapeHtml(r.quality_name)}</td>` +
					`<td>${fmtNum(r.A_frames)}</td>` +
					`<td>${fmtNum(r.B_frames)}</td>` +
					`<td>${fmtNum(r.C_frames)}</td>` +
					`<td>${fmtNum(r.frames_total)}</td>` +
					`<td>${fmtNum(r.A_prod)}</td>` +
					`<td>${fmtNum(r.B_prod)}</td>` +
					`<td>${fmtNum(r.C_prod)}</td>` +
					`<td>${fmtNum(r.prod_total)}</td>` +
					`<td>${fmtNum(r.overall_eff)}</td>` +
					`<td>${fmtNum(r.overall_avg)}</td>` +
					`</tr>`;
			});
			body += `</tbody></table>`;
		} else if (view === "mcDate") {
			const dateGroups = mcDates
				.map((d) => `<th colspan="3">${escapeHtml(d)}</th>`)
				.join("");
			const subPerDate = mcDates
				.map(() => `<th>Prod</th><th>Eff%</th><th>Avg/Frame</th>`)
				.join("");
			body += `<table><thead>`;
			body +=
				`<tr><th rowspan="2">Machine</th>${dateGroups}` +
				`<th colspan="3">Overall</th></tr>`;
			body +=
				`<tr>${subPerDate}<th>Prod</th><th>Eff%</th><th>Avg/Frame</th></tr>`;
			body += `</thead><tbody>`;
			mcRows.forEach((r) => {
				const cls = r.isGrandTotal ? ' class="grand-total"' : "";
				let tds = `<td class="text">${escapeHtml(r.mc_name)}</td>`;
				mcDates.forEach((_, idx) => {
					tds +=
						`<td>${fmtNum(r[`d${idx}_prod`])}</td>` +
						`<td>${fmtNum(r[`d${idx}_eff`])}</td>` +
						`<td>${fmtNum(r[`d${idx}_avg`])}</td>`;
				});
				tds +=
					`<td>${fmtNum(r.overall_prod)}</td>` +
					`<td>${fmtNum(r.overall_eff)}</td>` +
					`<td>${fmtNum(r.overall_avg)}</td>`;
				body += `<tr${cls}>${tds}</tr>`;
			});
			body += `</tbody></table>`;
		} else if (view === "empDate") {
			const dateGroups = empDates
				.map((d) => `<th colspan="2">${escapeHtml(d)}</th>`)
				.join("");
			const subPerDate = empDates
				.map(() => `<th>Prod</th><th>Eff%</th>`)
				.join("");
			body += `<table><thead>`;
			body +=
				`<tr><th rowspan="2">Employee</th>${dateGroups}` +
				`<th colspan="2">Total</th><th colspan="2">Average</th></tr>`;
			body +=
				`<tr>${subPerDate}<th>Prod</th><th>Eff%</th><th>Prod</th><th>Eff%</th></tr>`;
			body += `</thead><tbody>`;
			empRows.forEach((r) => {
				const cls = r.isGrandTotal ? ' class="grand-total"' : "";
				let tds = `<td class="text">${escapeHtml(r.entity_name)}</td>`;
				empDates.forEach((_, idx) => {
					tds += `<td>${fmtNum(r[`d${idx}_prod`])}</td>`;
					tds += `<td>${fmtNum(r[`d${idx}_eff`])}</td>`;
				});
				tds +=
					`<td>${fmtNum(r.total_prod)}</td>` +
					`<td>${fmtNum(r.total_eff)}</td>` +
					`<td>${fmtNum(r.avg_prod)}</td>` +
					`<td>${fmtNum(r.avg_eff)}</td>`;
				body += `<tr${cls}>${tds}</tr>`;
			});
			body += `</tbody></table>`;
		} else if (view === "frameRunning") {
			const dateGroups = frameDates
				.map((d) => `<th colspan="2">${escapeHtml(d)}</th>`)
				.join("");
			const subPerDate = frameDates
				.map(() => `<th>Hrs</th><th>Eff%</th>`)
				.join("");
			body += `<table><thead>`;
			body +=
				`<tr><th rowspan="2">Machine</th>${dateGroups}` +
				`<th colspan="2">Overall</th></tr>`;
			body += `<tr>${subPerDate}<th>Hrs</th><th>Eff%</th></tr>`;
			body += `</thead><tbody>`;
			frameRows.forEach((r) => {
				const cls = r.isTotal ? ' class="grand-total"' : "";
				let tds = `<td class="text">${escapeHtml(r.mc_name)}</td>`;
				frameDates.forEach((_, idx) => {
					tds +=
						`<td>${fmtNum(r[`d${idx}_hrs`])}</td>` +
						`<td>${fmtNum(r[`d${idx}_eff`])}</td>`;
				});
				tds +=
					`<td>${fmtNum(r.overall_hrs)}</td>` +
					`<td>${fmtNum(r.overall_eff)}</td>`;
				body += `<tr${cls}>${tds}</tr>`;
			});
			body += `</tbody></table>`;
		} else {
			body +=
				`<table><thead><tr>` +
				["Machine", "Quality", "Production", "Running Hrs", "Eff%"]
					.map((h) => `<th>${h}</th>`)
					.join("") +
				`</tr></thead><tbody>`;
			rhEffRows.forEach((r) => {
				const cls = r.isGrandTotal ? ' class="grand-total"' : "";
				body +=
					`<tr${cls}>` +
					`<td class="text">${escapeHtml(r.mc_name)}</td>` +
					`<td class="text">${escapeHtml(r.quality_name)}</td>` +
					`<td>${fmtNum(r.production)}</td>` +
					`<td>${fmtNum(r.running_hours)}</td>` +
					`<td>${fmtNum(r.eff)}</td></tr>`;
			});
			body += `</tbody></table>`;
		}

		openPrintWindow(title, body);
	}, [
		view,
		peRows,
		mcDates,
		mcRows,
		empDates,
		empRows,
		frameDates,
		frameRows,
		rhEffRows,
		buildMetaHtml,
	]);

	// ─── Columns and grouping models ────────────────────────────────────────

	const peColumns = useMemo<GridColDef<ProductionEffRow>[]>(() => {
		const num = (
			field: keyof ProductionEffRow,
			header: string,
			minWidth = 80,
			flex = 1,
		): GridColDef<ProductionEffRow> => ({
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
				minWidth: 220,
				sortable: false,
			},
			num("A_frames", "A", 65),
			num("B_frames", "B", 65),
			num("C_frames", "C", 65),
			num("frames_total", "Total", 85),
			num("A_prod", "A", 85),
			num("B_prod", "B", 85),
			num("C_prod", "C", 85),
			num("prod_total", "Total", 95),
			num("overall_eff", "Eff%", 85),
			num("overall_avg", "Avg/Frame", 105),
		];
	}, []);

	const peGroupingModel = useMemo<GridColumnGroupingModel>(
		() => [
			{
				groupId: "g_frames",
				headerName: "Frame",
				children: [
					{ field: "A_frames" },
					{ field: "B_frames" },
					{ field: "C_frames" },
					{ field: "frames_total" },
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

	const buildEntityDateColumns = useCallback(
		(label: string, dates: string[]): GridColDef<EntityDateRow>[] => {
			const entityCol: GridColDef<EntityDateRow> = {
				field: "entity_name",
				headerName: label,
				flex: 2,
				minWidth: 160,
				sortable: false,
			};
			const numCol = (
				field: string,
				header: "Prod" | "Eff%",
			): GridColDef<EntityDateRow> => ({
				field,
				headerName: header,
				type: "number",
				flex: 1,
				minWidth: 85,
				sortable: false,
				valueFormatter: (value: unknown) => fmtNum(value),
			});
			const dateCols: GridColDef<EntityDateRow>[] = dates.flatMap((_, idx) => [
				numCol(`d${idx}_prod`, "Prod"),
				numCol(`d${idx}_eff`, "Eff%"),
			]);
			const aggCols: GridColDef<EntityDateRow>[] = [
				numCol("total_prod", "Prod"),
				numCol("total_eff", "Eff%"),
				numCol("avg_prod", "Prod"),
				numCol("avg_eff", "Eff%"),
			];
			return [entityCol, ...dateCols, ...aggCols];
		},
		[],
	);

	const buildEntityDateGrouping = useCallback(
		(dates: string[]): GridColumnGroupingModel => {
			const dateGroups = dates.map((d, idx) => ({
				groupId: `g_d${idx}`,
				headerName: d,
				children: [{ field: `d${idx}_prod` }, { field: `d${idx}_eff` }],
			}));
			return [
				...dateGroups,
				{
					groupId: "g_total",
					headerName: "Total",
					children: [{ field: "total_prod" }, { field: "total_eff" }],
				},
				{
					groupId: "g_avg",
					headerName: "Average",
					children: [{ field: "avg_prod" }, { field: "avg_eff" }],
				},
			];
		},
		[],
	);

	const mcColumns = useMemo<GridColDef<McDateRow>[]>(() => {
		const num = (
			field: string,
			header: "Prod" | "Eff%" | "Avg/Frame",
			minWidth = 85,
			flex = 1,
		): GridColDef<McDateRow> => ({
			field,
			headerName: header,
			type: "number",
			flex,
			minWidth,
			sortable: false,
			valueFormatter: (value: unknown) => fmtNum(value),
		});
		const dateCols: GridColDef<McDateRow>[] = mcDates.flatMap((_, idx) => [
			num(`d${idx}_prod`, "Prod"),
			num(`d${idx}_eff`, "Eff%"),
			num(`d${idx}_avg`, "Avg/Frame", 95),
		]);
		return [
			{
				field: "mc_name",
				headerName: "Machine",
				flex: 2,
				minWidth: 160,
				sortable: false,
			},
			...dateCols,
			num("overall_prod", "Prod", 95),
			num("overall_eff", "Eff%"),
			num("overall_avg", "Avg/Frame", 100),
		];
	}, [mcDates]);

	const mcGrouping = useMemo<GridColumnGroupingModel>(() => {
		const dateGroups = mcDates.map((d, idx) => ({
			groupId: `g_d${idx}`,
			headerName: d,
			children: [
				{ field: `d${idx}_prod` },
				{ field: `d${idx}_eff` },
				{ field: `d${idx}_avg` },
			],
		}));
		return [
			...dateGroups,
			{
				groupId: "g_overall",
				headerName: "Overall",
				children: [
					{ field: "overall_prod" },
					{ field: "overall_eff" },
					{ field: "overall_avg" },
				],
			},
		];
	}, [mcDates]);
	const empColumns = useMemo(
		() => buildEntityDateColumns("Employee", empDates),
		[buildEntityDateColumns, empDates],
	);
	const empGrouping = useMemo(
		() => buildEntityDateGrouping(empDates),
		[buildEntityDateGrouping, empDates],
	);

	const frameColumns = useMemo<GridColDef<FrameRunningRow>[]>(() => {
		const num = (
			field: string,
			header: "Hrs" | "Eff%",
			minWidth = 80,
			flex = 1,
		): GridColDef<FrameRunningRow> => ({
			field,
			headerName: header,
			type: "number",
			flex,
			minWidth,
			sortable: false,
			valueFormatter: (value: unknown) => fmtNum(value),
		});
		const dateCols: GridColDef<FrameRunningRow>[] = frameDates.flatMap(
			(_, idx) => [num(`d${idx}_hrs`, "Hrs"), num(`d${idx}_eff`, "Eff%")],
		);
		return [
			{
				field: "mc_name",
				headerName: "Machine",
				flex: 2,
				minWidth: 160,
				sortable: false,
			},
			...dateCols,
			num("overall_hrs", "Hrs", 90),
			num("overall_eff", "Eff%", 85),
		];
	}, [frameDates]);

	const frameGrouping = useMemo<GridColumnGroupingModel>(() => {
		const dateGroups = frameDates.map((d, idx) => ({
			groupId: `g_d${idx}`,
			headerName: d,
			children: [{ field: `d${idx}_hrs` }, { field: `d${idx}_eff` }],
		}));
		return [
			...dateGroups,
			{
				groupId: "g_overall",
				headerName: "Overall",
				children: [{ field: "overall_hrs" }, { field: "overall_eff" }],
			},
		];
	}, [frameDates]);

	const rhEffColumns = useMemo<GridColDef<RunningHoursEffRow>[]>(
		() => [
			{ field: "mc_name", headerName: "Machine", flex: 1, minWidth: 160 },
			{ field: "quality_name", headerName: "Quality", flex: 1, minWidth: 160 },
			{
				field: "production",
				headerName: "Production",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtNum(value),
			},
			{
				field: "running_hours",
				headerName: "Running Hrs",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtNum(value),
			},
			{
				field: "eff",
				headerName: "Eff%",
				type: "number",
				flex: 1,
				minWidth: 110,
				valueFormatter: (value: unknown) => fmtNum(value),
			},
		],
		[],
	);

	// ─── Render ─────────────────────────────────────────────────────────────

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
		<SpinningFilterDialog
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
		"& .spinning-row-date-total": { bgcolor: "#bbdefb", fontWeight: 700 },
		"& .spinning-row-date-total:hover": { bgcolor: "#bbdefb" },
		"& .spinning-row-grand-total": {
			bgcolor: "#0C3C60",
			color: "#fff",
			fontWeight: 700,
		},
		"& .spinning-row-grand-total:hover": { bgcolor: "#0C3C60" },
		"& .spinning-row-grand-total .MuiDataGrid-cell": { color: "#fff" },
	};

	if (view === "productionEff") {
		return (
			<IndexWrapper
				title={VIEW_TITLES[view]}
				subtitle={subtitle}
				rows={peRows}
				columns={peColumns}
				rowCount={peRows.length}
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
				columnGroupingModel={peGroupingModel}
				getRowClassName={(params) =>
					(params.row as ProductionEffRow).isDateTotal
						? "spinning-row-date-total"
						: ""
				}
				extraSx={totalRowSx}
			>
				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	if (view === "mcDate") {
		return (
			<IndexWrapper
				title={VIEW_TITLES[view]}
				subtitle={subtitle}
				rows={mcRows}
				columns={mcColumns}
				rowCount={mcRows.length}
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
				columnGroupingModel={mcGrouping}
				getRowClassName={(params) =>
					(params.row as McDateRow).isGrandTotal
						? "spinning-row-grand-total"
						: ""
				}
				extraSx={totalRowSx}
			>
				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	if (view === "empDate") {
		return (
			<IndexWrapper
				title={VIEW_TITLES[view]}
				subtitle={subtitle}
				rows={empRows}
				columns={empColumns}
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
				columnGroupingModel={empGrouping}
				getRowClassName={(params) =>
					(params.row as EntityDateRow).isGrandTotal
						? "spinning-row-grand-total"
						: ""
				}
				extraSx={totalRowSx}
			>
				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	if (view === "frameRunning") {
		return (
			<IndexWrapper
				title={VIEW_TITLES[view]}
				subtitle={subtitle}
				rows={frameRows}
				columns={frameColumns}
				rowCount={frameRows.length}
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
				columnGroupingModel={frameGrouping}
				getRowClassName={(params) =>
					(params.row as FrameRunningRow).isTotal
						? "spinning-row-grand-total"
						: ""
				}
				extraSx={totalRowSx}
			>
				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	// runningHoursEff
	return (
		<IndexWrapper
			title={VIEW_TITLES[view]}
			subtitle={subtitle}
			rows={rhEffRows}
			columns={rhEffColumns}
			rowCount={rhEffRows.length}
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
				(params.row as RunningHoursEffRow).isGrandTotal
					? "spinning-row-grand-total"
					: ""
			}
			extraSx={totalRowSx}
		>
			{filterDialog}
			{snackbarEl}
		</IndexWrapper>
	);
}
