"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
	Snackbar,
	Alert,
	Box,
	Button,
	Checkbox,
	FormControl,
	InputLabel,
	ListItemText,
	MenuItem,
	Select,
	type SelectChangeEvent,
} from "@mui/material";
import {
	GridColDef,
	GridColumnGroupingModel,
	GridPaginationModel,
	type GridValidRowModel,
} from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import MachineDateHeatmapDialog from "@/components/ui/MachineDateHeatmapDialog";
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

/**
 * Metric (sub-column) definitions per view for the "Columns" filter.
 * Metric columns are recognised by their field naming convention; columns
 * matching no metric (Date, Quality, Machine, Employee) are always shown.
 */
type MetricDef = {
	key: string;
	label: string;
	match: (field: string) => boolean;
};

const VIEW_METRICS: Record<ViewKey, MetricDef[]> = {
	productionEff: [
		{ key: "frames", label: "Frame", match: (f) => f.endsWith("_frames") || f === "frames_total" },
		{ key: "prod", label: "Production", match: (f) => f.endsWith("_prod") || f === "prod_total" },
		{ key: "eff", label: "Eff%", match: (f) => f === "overall_eff" },
		{ key: "avg", label: "Avg/Frame", match: (f) => f === "overall_avg" },
	],
	mcDate: [
		{ key: "prod", label: "Prod", match: (f) => f.endsWith("_prod") },
		{ key: "eff", label: "Eff%", match: (f) => f.endsWith("_eff") },
		{ key: "avg", label: "Avg/Frame", match: (f) => f.endsWith("_avg") },
	],
	empDate: [
		{ key: "prod", label: "Prod", match: (f) => f.endsWith("_prod") },
		{ key: "eff", label: "Eff%", match: (f) => f.endsWith("_eff") },
	],
	frameRunning: [
		{ key: "hrs", label: "Hrs", match: (f) => f.endsWith("_hrs") },
		{ key: "eff", label: "Eff%", match: (f) => f.endsWith("_eff") },
	],
	runningHoursEff: [
		{ key: "prod", label: "Prod", match: (f) => f.endsWith("_prod") },
		{ key: "hrs", label: "Hrs", match: (f) => f.endsWith("_hrs") },
		{ key: "eff", label: "Eff%", match: (f) => f.endsWith("_eff") },
	],
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
	overall_prod: number;
	overall_hrs: number;
	overall_eff: number;
	isGrandTotal?: boolean;
	[key: string]: string | number | boolean | undefined;
};

/**
 * Pivot per-(date, machine, quality) rows into one row per (machine, quality)
 * with d{idx}_prod / d{idx}_hrs / d{idx}_eff date columns + Overall group.
 * Overall eff is production-weighted: SUM(prod) / SUM(expected) where
 * expected = prod * 100 / eff for dates with a computed eff.
 */
function pivotRunningHoursEff(rows: SpinningRunningHoursEffRow[]): {
	dates: string[];
	rows: RunningHoursEffRow[];
} {
	const dates: string[] = [];
	const seenDate = new Set<string>();
	type Cell = { prod: number; hrs: number; eff: number };
	const entities = new Map<
		string,
		{ mc_name: string; quality_name: string; cells: Map<string, Cell> }
	>();
	rows.forEach((r) => {
		if (!seenDate.has(r.report_date)) {
			seenDate.add(r.report_date);
			dates.push(r.report_date);
		}
		const key = `${r.mc_id ?? "m"}_${r.quality_id ?? "q"}`;
		let e = entities.get(key);
		if (!e) {
			e = {
				mc_name: r.mc_name ?? "—",
				quality_name: r.quality_name ?? "—",
				cells: new Map(),
			};
			entities.set(key, e);
		}
		e.cells.set(r.report_date, {
			prod: Number(r.production) || 0,
			hrs: Number(r.running_hours) || 0,
			eff: Number(r.eff) || 0,
		});
	});
	sortDdMmYyyy(dates);

	const out: RunningHoursEffRow[] = [];
	entities.forEach((e, key) => {
		const row: RunningHoursEffRow = {
			id: key,
			mc_name: e.mc_name,
			quality_name: e.quality_name,
			overall_prod: 0,
			overall_hrs: 0,
			overall_eff: 0,
		};
		let prodSum = 0;
		let hrsSum = 0;
		let expectedSum = 0;
		dates.forEach((d, idx) => {
			const c = e.cells.get(d);
			row[`d${idx}_prod`] = c?.prod ?? 0;
			row[`d${idx}_hrs`] = c?.hrs ?? 0;
			row[`d${idx}_eff`] = c?.eff ?? 0;
			if (c) {
				prodSum += c.prod;
				hrsSum += c.hrs;
				if (c.eff > 0) expectedSum += (c.prod * 100) / c.eff;
			}
		});
		row.overall_prod = prodSum;
		row.overall_hrs = hrsSum;
		row.overall_eff = expectedSum > 0 ? (prodSum / expectedSum) * 100 : 0;
		out.push(row);
	});
	out.sort(
		(a, b) =>
			a.mc_name.localeCompare(b.mc_name) ||
			a.quality_name.localeCompare(b.quality_name),
	);

	if (out.length > 0) {
		const totalRow: RunningHoursEffRow = {
			id: "__GRAND_TOTAL__",
			mc_name: "Grand Total",
			quality_name: "",
			overall_prod: 0,
			overall_hrs: 0,
			overall_eff: 0,
			isGrandTotal: true,
		};
		let gProd = 0;
		let gHrs = 0;
		let gExpected = 0;
		dates.forEach((d, idx) => {
			let prod = 0;
			let hrs = 0;
			let expected = 0;
			entities.forEach((e) => {
				const c = e.cells.get(d);
				if (!c) return;
				prod += c.prod;
				hrs += c.hrs;
				if (c.eff > 0) expected += (c.prod * 100) / c.eff;
			});
			totalRow[`d${idx}_prod`] = prod;
			totalRow[`d${idx}_hrs`] = hrs;
			totalRow[`d${idx}_eff`] = expected > 0 ? (prod / expected) * 100 : 0;
			gProd += prod;
			gHrs += hrs;
			gExpected += expected;
		});
		totalRow.overall_prod = gProd;
		totalRow.overall_hrs = gHrs;
		totalRow.overall_eff = gExpected > 0 ? (gProd / gExpected) * 100 : 0;
		out.push(totalRow);
	}

	return { dates, rows: out };
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
	const [rhEffDates, setRhEffDates] = useState<string[]>([]);
	const [rhEffRows, setRhEffRows] = useState<RunningHoursEffRow[]>([]);

	const [chartOpen, setChartOpen] = useState(false);
	// Machine drilled into from the heatmap (dbl-click) — null = full heatmap
	const [chartMachine, setChartMachine] = useState<string | null>(null);
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
		setRhEffDates([]);
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
				const pivot = pivotRunningHoursEff(data);
				setRhEffDates(pivot.dates);
				setRhEffRows(pivot.rows);
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

	// Metric keys currently hidden via the "Columns" filter (reset per view)
	const [hiddenMetrics, setHiddenMetrics] = useState<string[]>([]);

	const handleViewChange = useCallback((e: SelectChangeEvent<ViewKey>) => {
		setView(e.target.value as ViewKey);
		setHiddenMetrics([]);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, []);

	// ─── Column (metric) visibility filter ─────────────────────────────────

	const metricDefs = VIEW_METRICS[view];

	const keepField = useCallback(
		(field: string): boolean => {
			const owner = VIEW_METRICS[view].find((m) => m.match(field));
			return !owner || !hiddenMetrics.includes(owner.key);
		},
		[view, hiddenMetrics],
	);

	const filterCols = useCallback(
		<T extends GridValidRowModel>(cols: GridColDef<T>[]): GridColDef<T>[] =>
			cols.filter((c) => keepField(c.field)),
		[keepField],
	);

	const filterGrouping = useCallback(
		(model: GridColumnGroupingModel): GridColumnGroupingModel =>
			model
				.map((group) => ({
					...group,
					children: group.children.filter(
						(child) => !("field" in child) || keepField(child.field),
					),
				}))
				.filter((group) => group.children.length > 0),
		[keepField],
	);

	const handleMetricsChange = useCallback(
		(e: SelectChangeEvent<string[]>) => {
			const visible =
				typeof e.target.value === "string"
					? e.target.value.split(",")
					: e.target.value;
			setHiddenMetrics(
				VIEW_METRICS[view]
					.map((m) => m.key)
					.filter((key) => !visible.includes(key)),
			);
		},
		[view],
	);

	const visibleMetricKeys = useMemo(
		() => metricDefs.filter((m) => !hiddenMetrics.includes(m.key)).map((m) => m.key),
		[metricDefs, hiddenMetrics],
	);

	// Chart metric for Mc-wise Date-wise: Eff% whenever it's selected in the
	// Columns filter, then Prod, then Avg/Frame (mirrors the drawing report).
	const mcChartMetric = visibleMetricKeys.includes("eff")
		? ("eff" as const)
		: visibleMetricKeys.includes("prod")
			? ("prod" as const)
			: visibleMetricKeys.includes("avg")
				? ("avg" as const)
				: null;

	// Machine × date heatmap data for the Mc-wise Date-wise chart, on the
	// selected metric. Grand-Total row excluded.
	const mcHeatmapRows = useMemo(() => {
		const metric = mcChartMetric ?? "eff";
		return mcRows
			.filter((r) => !r.isGrandTotal)
			.map((r) => ({
				name: r.mc_name,
				values: mcDates.map((_, idx) => Number(r[`d${idx}_${metric}`]) || 0),
			}));
	}, [mcRows, mcDates, mcChartMetric]);

	// Chart metric for Employee-wise Date-wise: Eff% whenever selected, else Prod.
	const empChartMetric = visibleMetricKeys.includes("eff")
		? ("eff" as const)
		: visibleMetricKeys.includes("prod")
			? ("prod" as const)
			: null;

	// Employee × date heatmap data. Grand-Total row excluded.
	const empHeatmapRows = useMemo(() => {
		const metric = empChartMetric ?? "eff";
		return empRows
			.filter((r) => !r.isGrandTotal)
			.map((r) => ({
				name: r.entity_name,
				values: empDates.map((_, idx) => Number(r[`d${idx}_${metric}`]) || 0),
			}));
	}, [empRows, empDates, empChartMetric]);

	// Chart metric for Frame-wise Running: Eff% whenever selected, else Hrs.
	const frameChartMetric = visibleMetricKeys.includes("eff")
		? ("eff" as const)
		: visibleMetricKeys.includes("hrs")
			? ("hrs" as const)
			: null;

	// Machine × date heatmap data for Frame-wise Running. Total row excluded.
	const frameHeatmapRows = useMemo(() => {
		const metric = frameChartMetric ?? "eff";
		return frameRows
			.filter((r) => !r.isTotal)
			.map((r) => ({
				name: r.mc_name,
				values: frameDates.map((_, idx) => Number(r[`d${idx}_${metric}`]) || 0),
			}));
	}, [frameRows, frameDates, frameChartMetric]);

	// Chart metric for Running-Hours-basis Eff: Eff% → Prod → Hrs.
	const rhEffChartMetric = visibleMetricKeys.includes("eff")
		? ("eff" as const)
		: visibleMetricKeys.includes("prod")
			? ("prod" as const)
			: visibleMetricKeys.includes("hrs")
				? ("hrs" as const)
				: null;

	// (Machine — Quality) × date heatmap data. Grand-Total row excluded.
	const rhEffHeatmapRows = useMemo(() => {
		const metric = rhEffChartMetric ?? "eff";
		return rhEffRows
			.filter((r) => !r.isGrandTotal)
			.map((r) => ({
				name: `${r.mc_name} — ${r.quality_name}`,
				values: rhEffDates.map((_, idx) => Number(r[`d${idx}_${metric}`]) || 0),
			}));
	}, [rhEffRows, rhEffDates, rhEffChartMetric]);

	const viewSelect = (
		<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
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
			<FormControl size="small" sx={{ minWidth: 170 }}>
				<InputLabel id="spinning-metric-filter-label">Columns</InputLabel>
				<Select<string[]>
					labelId="spinning-metric-filter-label"
					label="Columns"
					multiple
					value={visibleMetricKeys}
					onChange={handleMetricsChange}
					renderValue={(selected) =>
						selected.length === metricDefs.length
							? "All"
							: metricDefs
									.filter((m) => selected.includes(m.key))
									.map((m) => m.label)
									.join(", ") || "None"
					}
				>
					{metricDefs.map((m) => (
						<MenuItem key={m.key} value={m.key}>
							<Checkbox
								size="small"
								checked={!hiddenMetrics.includes(m.key)}
								sx={{ p: 0.5, mr: 1 }}
							/>
							<ListItemText primary={m.label} />
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</Box>
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
			const dateGroups = rhEffDates
				.map((d) => `<th colspan="3">${escapeHtml(d)}</th>`)
				.join("");
			const subPerDate = rhEffDates
				.map(() => `<th>Prod</th><th>Hrs</th><th>Eff%</th>`)
				.join("");
			body +=
				`<table><thead>` +
				`<tr><th rowspan="2">Machine</th><th rowspan="2">Quality</th>${dateGroups}<th colspan="3">Overall</th></tr>` +
				`<tr>${subPerDate}<th>Prod</th><th>Hrs</th><th>Eff%</th></tr>` +
				`</thead><tbody>`;
			rhEffRows.forEach((r) => {
				const cls = r.isGrandTotal ? ' class="grand-total"' : "";
				let tds =
					`<td class="text">${escapeHtml(r.mc_name)}</td>` +
					`<td class="text">${escapeHtml(r.quality_name)}</td>`;
				rhEffDates.forEach((_, idx) => {
					tds +=
						`<td>${fmtNum(r[`d${idx}_prod`])}</td>` +
						`<td>${fmtNum(r[`d${idx}_hrs`])}</td>` +
						`<td>${fmtNum(r[`d${idx}_eff`])}</td>`;
				});
				tds +=
					`<td>${fmtNum(r.overall_prod)}</td>` +
					`<td>${fmtNum(r.overall_hrs)}</td>` +
					`<td>${fmtNum(r.overall_eff)}</td>`;
				body += `<tr${cls}>${tds}</tr>`;
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
		rhEffDates,
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

	const rhEffColumns = useMemo<GridColDef<RunningHoursEffRow>[]>(() => {
		const num = (
			field: string,
			header: "Prod" | "Hrs" | "Eff%",
			minWidth = 80,
			flex = 1,
		): GridColDef<RunningHoursEffRow> => ({
			field,
			headerName: header,
			type: "number",
			flex,
			minWidth,
			sortable: false,
			valueFormatter: (value: unknown) => fmtNum(value),
		});
		const dateCols: GridColDef<RunningHoursEffRow>[] = rhEffDates.flatMap(
			(_, idx) => [
				num(`d${idx}_prod`, "Prod", 85),
				num(`d${idx}_hrs`, "Hrs"),
				num(`d${idx}_eff`, "Eff%"),
			],
		);
		return [
			{
				field: "mc_name",
				headerName: "Machine",
				flex: 1.4,
				minWidth: 130,
				sortable: false,
			},
			{
				field: "quality_name",
				headerName: "Quality",
				flex: 2,
				minWidth: 180,
				sortable: false,
			},
			...dateCols,
			num("overall_prod", "Prod", 95),
			num("overall_hrs", "Hrs", 90),
			num("overall_eff", "Eff%", 85),
		];
	}, [rhEffDates]);

	const rhEffGrouping = useMemo<GridColumnGroupingModel>(() => {
		const dateGroups = rhEffDates.map((d, idx) => ({
			groupId: `g_d${idx}`,
			headerName: d,
			children: [
				{ field: `d${idx}_prod` },
				{ field: `d${idx}_hrs` },
				{ field: `d${idx}_eff` },
			],
		}));
		return [
			...dateGroups,
			{
				groupId: "g_overall",
				headerName: "Overall",
				children: [
					{ field: "overall_prod" },
					{ field: "overall_hrs" },
					{ field: "overall_eff" },
				],
			},
		];
	}, [rhEffDates]);

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
				columns={filterCols(peColumns)}
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
				columnGroupingModel={filterGrouping(peGroupingModel)}
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
		const metricLabel =
			mcChartMetric === "prod"
				? "Prod"
				: mcChartMetric === "avg"
					? "Avg/Frame"
					: "Eff%";
		const chartButton = (
			<Button
				variant="outlined"
				color="primary"
				onClick={() => setChartOpen(true)}
				disabled={mcDates.length === 0 || !mcChartMetric}
			>
				Heat Map
			</Button>
		);
		const chartDialog = (
			<MachineDateHeatmapDialog
				open={chartOpen}
				onClose={() => {
					setChartOpen(false);
					setChartMachine(null);
				}}
				title={`Spinning Mc-wise Date-wise — ${metricLabel} (Machine × Date)`}
				dates={mcDates}
				rows={mcHeatmapRows}
				metricLabel={metricLabel}
				yLabel={mcChartMetric === "eff" ? "Eff %" : "Kg"}
				unitSuffix={mcChartMetric === "eff" ? "%" : "kg"}
				drilledName={chartMachine}
				onDrilledChange={setChartMachine}
			/>
		);
		return (
			<IndexWrapper
				title={VIEW_TITLES[view]}
				subtitle={subtitle}
				rows={mcRows}
				columns={filterCols(mcColumns)}
				rowCount={mcRows.length}
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
				columnGroupingModel={filterGrouping(mcGrouping)}
				onRowDoubleClick={(row) => {
					if (row.isGrandTotal) return;
					setChartMachine(row.mc_name);
					setChartOpen(true);
				}}
				getRowClassName={(params) =>
					(params.row as McDateRow).isGrandTotal
						? "spinning-row-grand-total"
						: ""
				}
				extraSx={totalRowSx}
			>
				{chartDialog}
				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	if (view === "empDate") {
		const metricLabel = empChartMetric === "prod" ? "Prod" : "Eff%";
		const chartButton = (
			<Button
				variant="outlined"
				color="primary"
				onClick={() => setChartOpen(true)}
				disabled={empDates.length === 0 || !empChartMetric}
			>
				Heat Map
			</Button>
		);
		const chartDialog = (
			<MachineDateHeatmapDialog
				open={chartOpen}
				onClose={() => {
					setChartOpen(false);
					setChartMachine(null);
				}}
				title={`Spinning Employee-wise Date-wise — ${metricLabel} (Employee × Date)`}
				dates={empDates}
				rows={empHeatmapRows}
				metricLabel={metricLabel}
				yLabel={empChartMetric === "prod" ? "Kg" : "Eff %"}
				unitSuffix={empChartMetric === "prod" ? "kg" : "%"}
				entityLabel="Employee"
				drilledName={chartMachine}
				onDrilledChange={setChartMachine}
			/>
		);
		return (
			<IndexWrapper
				title={VIEW_TITLES[view]}
				subtitle={subtitle}
				rows={empRows}
				columns={filterCols(empColumns)}
				rowCount={empRows.length}
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
				columnGroupingModel={filterGrouping(empGrouping)}
				onRowDoubleClick={(row) => {
					if (row.isGrandTotal) return;
					setChartMachine(row.entity_name);
					setChartOpen(true);
				}}
				getRowClassName={(params) =>
					(params.row as EntityDateRow).isGrandTotal
						? "spinning-row-grand-total"
						: ""
				}
				extraSx={totalRowSx}
			>
				{chartDialog}
				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	if (view === "frameRunning") {
		const metricLabel = frameChartMetric === "hrs" ? "Hrs" : "Eff%";
		const chartButton = (
			<Button
				variant="outlined"
				color="primary"
				onClick={() => setChartOpen(true)}
				disabled={frameDates.length === 0 || !frameChartMetric}
			>
				Heat Map
			</Button>
		);
		const chartDialog = (
			<MachineDateHeatmapDialog
				open={chartOpen}
				onClose={() => {
					setChartOpen(false);
					setChartMachine(null);
				}}
				title={`Spinning Frame-wise Running — ${metricLabel} (Machine × Date)`}
				dates={frameDates}
				rows={frameHeatmapRows}
				metricLabel={metricLabel}
				yLabel={frameChartMetric === "hrs" ? "Hours" : "Eff %"}
				unitSuffix={frameChartMetric === "hrs" ? "hrs" : "%"}
				drilledName={chartMachine}
				onDrilledChange={setChartMachine}
			/>
		);
		return (
			<IndexWrapper
				title={VIEW_TITLES[view]}
				subtitle={subtitle}
				rows={frameRows}
				columns={filterCols(frameColumns)}
				rowCount={frameRows.length}
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
				columnGroupingModel={filterGrouping(frameGrouping)}
				onRowDoubleClick={(row) => {
					if (row.isTotal) return;
					setChartMachine(row.mc_name);
					setChartOpen(true);
				}}
				getRowClassName={(params) =>
					(params.row as FrameRunningRow).isTotal
						? "spinning-row-grand-total"
						: ""
				}
				extraSx={totalRowSx}
			>
				{chartDialog}
				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	// runningHoursEff
	const rhEffMetricLabel =
		rhEffChartMetric === "prod"
			? "Prod"
			: rhEffChartMetric === "hrs"
				? "Hrs"
				: "Eff%";
	const rhEffChartButton = (
		<Button
			variant="outlined"
			color="primary"
			onClick={() => setChartOpen(true)}
			disabled={rhEffDates.length === 0 || !rhEffChartMetric}
		>
			Heat Map
		</Button>
	);
	const rhEffChartDialog = (
		<MachineDateHeatmapDialog
			open={chartOpen}
			onClose={() => {
				setChartOpen(false);
				setChartMachine(null);
			}}
			title={`Spinning Production Eff (Running Hours) — ${rhEffMetricLabel} (Machine × Date)`}
			dates={rhEffDates}
			rows={rhEffHeatmapRows}
			metricLabel={rhEffMetricLabel}
			yLabel={
				rhEffChartMetric === "prod"
					? "Kg"
					: rhEffChartMetric === "hrs"
						? "Hours"
						: "Eff %"
			}
			unitSuffix={
				rhEffChartMetric === "prod"
					? "kg"
					: rhEffChartMetric === "hrs"
						? "hrs"
						: "%"
			}
			entityLabel="Machine / Quality"
			drilledName={chartMachine}
			onDrilledChange={setChartMachine}
		/>
	);
	return (
		<IndexWrapper
			title={VIEW_TITLES[view]}
			subtitle={subtitle}
			rows={rhEffRows}
			columns={filterCols(rhEffColumns)}
			rowCount={rhEffRows.length}
			columnGroupingModel={filterGrouping(rhEffGrouping)}
			paginationModel={paginationModel}
			onPaginationModelChange={setPaginationModel}
			loading={loading}
			showLoadingUntilLoaded
			toolbarContent={viewSelect}
			extraActions={
				<>
					{rhEffChartButton}
					{printButton}
					{filterButton}
				</>
			}
			onRowDoubleClick={(row) => {
				if (row.isGrandTotal) return;
				setChartMachine(`${row.mc_name} — ${row.quality_name}`);
				setChartOpen(true);
			}}
			getRowClassName={(params) =>
				(params.row as RunningHoursEffRow).isGrandTotal
					? "spinning-row-grand-total"
					: ""
			}
			extraSx={totalRowSx}
		>
			{rhEffChartDialog}
			{filterDialog}
			{snackbarEl}
		</IndexWrapper>
	);
}
