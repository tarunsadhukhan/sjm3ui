"use client";
import React, { useCallback, useMemo, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Snackbar,
	Typography,
} from "@mui/material";
import {
	DataGrid,
	GridColDef,
	GridColumnGroupingModel,
} from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import BioAttFilterDialog, { type BioAttFilterValues } from "./BioAttFilterDialog";

type WagesColumn = { key: string; label: string };

type WagesRow = {
	eb_id: number;
	emp_code: string;
	emp_name: string;
	department: string;
	designation: string;
	rate: number;
	shifts: Record<string, string>;
	ot_shifts: Record<string, string>;
	wages: Record<string, number>;
	working_hours: Record<string, number>;
	ot_hours: Record<string, number>;
	total_working_hours: number;
	total_ot_hours: number;
	total_wages: number;
	count_p_days: number;
	count_ot_days: number;
};

type WagesResponse = { columns: WagesColumn[]; data: WagesRow[] };

type GridRow = WagesRow & {
	id: number;
	[k: string]: unknown;
};

function getCoId(): string {
	if (typeof window === "undefined") return "";
	const sel = localStorage.getItem("sidebar_selectedCompany");
	return sel ? JSON.parse(sel).co_id : "";
}

function todayIso(): string {
	return new Date().toISOString().slice(0, 10);
}

function firstOfMonthIso(): string {
	const d = new Date();
	return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

type Props = {
	toolbarContent?: React.ReactNode;
};

export default function WagesRegisterTab({ toolbarContent }: Props) {
	const { selectedBranches } = useSidebarContext();

	const [filter, setFilter] = useState<BioAttFilterValues>({
		fromDate: firstOfMonthIso(),
		toDate: todayIso(),
		ebNo: "",
	});
	const [filterDialogOpen, setFilterDialogOpen] = useState(true);
	const [loading, setLoading] = useState(false);
	const [columns, setColumns] = useState<WagesColumn[]>([]);
	const [rows, setRows] = useState<GridRow[]>([]);
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const fromDate = filter.fromDate;
	const toDate = filter.toDate;

	const handleSnackbarClose = useCallback(
		() => setSnackbar((s) => ({ ...s, open: false })),
		[],
	);

	const fetchReport = useCallback(async (f: BioAttFilterValues) => {
		const co_id = getCoId();
		if (!co_id) {
			setSnackbar({ open: true, message: "No company selected", severity: "error" });
			return;
		}
		if (!f.fromDate || !f.toDate) {
			setSnackbar({ open: true, message: "From and To dates are required", severity: "error" });
			return;
		}
		const branchId = selectedBranches?.[0] ? Number(selectedBranches[0]) : 0;
		setLoading(true);
		try {
			const qs = new URLSearchParams({
				co_id,
				from_date: f.fromDate,
				to_date: f.toDate,
				branch_id: String(branchId),
			});
			if (f.ebNo) qs.append("emp_code", f.ebNo);
			const { data, error } = await fetchWithCookie<WagesResponse>(
				`${apiRoutesPortalMasters.BIO_ATT_WAGES_REGISTER}?${qs}`,
				"GET",
			);
			if (error || !data) {
				setSnackbar({
					open: true,
					message: error ?? "Failed to load wages register",
					severity: "error",
				});
				return;
			}
			setColumns(data.columns);
			setRows(data.data.map((r) => ({ ...r, id: r.eb_id })));
		} catch (e) {
			setSnackbar({
				open: true,
				message: e instanceof Error ? e.message : String(e),
				severity: "error",
			});
		} finally {
			setLoading(false);
		}
	}, [selectedBranches]);

	const handleApplyFilter = useCallback((values: BioAttFilterValues) => {
		const next: BioAttFilterValues = {
			fromDate: values.fromDate || firstOfMonthIso(),
			toDate: values.toDate || todayIso(),
			ebNo: values.ebNo,
		};
		setFilter(next);
		void fetchReport(next);
	}, [fetchReport]);

	const gridColumns = useMemo<GridColDef<GridRow>[]>(() => {
		const fixed: GridColDef<GridRow>[] = [
			{ field: "emp_code",    headerName: "Emp Id",        width: 80 },
			{ field: "emp_name",    headerName: "Employee's Name", width: 180 },
			{ field: "rate",        headerName: "Wages/Day",     width: 90, type: "number" },
			{ field: "department",  headerName: "Department",    width: 120 },
			{ field: "designation", headerName: "Desig.",        width: 140 },
		];

		// Per date: Shift + OT (2 sub-cols, both text — OT shows the OT shift token)
		const dateCols: GridColDef<GridRow>[] = [];
		for (const c of columns) {
			dateCols.push({
				field: `shift_${c.key}`,
				headerName: "Shift",
				width: 60,
				sortable: false,
				valueGetter: (_v, row) => row.shifts?.[c.key] ?? "",
			});
			dateCols.push({
				field: `ot_${c.key}`,
				headerName: "OT",
				width: 50,
				sortable: false,
				valueGetter: (_v, row) => row.ot_shifts?.[c.key] ?? "",
			});
		}

		const totals: GridColDef<GridRow>[] = [
			// Software
			{ field: "total_working_hours", headerName: "Regular", width: 70, type: "number" },
			{ field: "total_ot_hours",      headerName: "OT",      width: 60, type: "number" },
			// Count breakdown
			{ field: "cnt_p",   headerName: "P",   width: 50, type: "number",
			  valueGetter: (_v, row) => row.count_p_days ?? 0 },
			{ field: "cnt_ot",  headerName: "OT",  width: 50, type: "number",
			  valueGetter: (_v, row) => row.count_ot_days ?? 0 },
			{ field: "cnt_a",   headerName: "A",   width: 50, type: "number",
			  valueGetter: () => 0 },
			{ field: "cnt_b",   headerName: "B",   width: 50, type: "number",
			  valueGetter: () => 0 },
			{ field: "cnt_pts", headerName: "Pts", width: 50, type: "number",
			  valueGetter: () => 0 },
			// Incentives
			{ field: "inc_yn",  headerName: "Incentives (Yes/No)", width: 100,
			  valueGetter: (_v, row) => ((row.count_p_days ?? 0) > 0 ? "Yes" : "No") },
			{ field: "inc_pts", headerName: "Incentives Point",    width: 100, type: "number",
			  valueGetter: () => 0 },
			// Count (working days)
			{ field: "count_total", headerName: "Count", width: 70, type: "number",
			  valueGetter: (_v, row) => row.count_p_days ?? 0 },
		];

		// Per date: daily wages
		const wagesCols: GridColDef<GridRow>[] = columns.map((c) => ({
			field: `w_${c.key}`,
			headerName: c.label,
			width: 90,
			sortable: false,
			type: "number",
			valueGetter: (_v, row) => row.wages?.[c.key] ?? 0,
		}));

		const totalWagesCol: GridColDef<GridRow> = {
			field: "total_wages",
			headerName: "Total Wages",
			width: 110,
			type: "number",
		};

		return [...fixed, ...dateCols, ...totals, ...wagesCols, totalWagesCol];
	}, [columns]);

	// Build grand-total row mirroring `gridColumns`.
	// Shift / OT cols: count of cells whose first token starts with A/B/C.
	// Software hour cols: Σ/8 (man-days). Others: plain Σ.
	const grandTotalRow = useMemo<GridRow | null>(() => {
		if (!rows.length) return null;
		const totals: Record<string, number | string> = {};
		const isABCToken = (s: string) => /^[ABC]/i.test(s.trim());
		const hasABC = (s: string) =>
			s.trim().length > 0 && s.trim().split(/\s+/).some(isABCToken);
		for (const c of columns) {
			let shiftCount = 0;
			let otCount = 0;
			let wageSum = 0;
			for (const r of rows) {
				const sh = (r.shifts?.[c.key] ?? "").toString();
				const ot = (r.ot_shifts?.[c.key] ?? "").toString();
				if (hasABC(sh)) shiftCount += 1;
				if (hasABC(ot)) otCount += 1;
				wageSum += Number(r.wages?.[c.key] ?? 0);
			}
			totals[`shift_${c.key}`] = shiftCount;
			totals[`ot_${c.key}`]    = otCount;
			totals[`w_${c.key}`]     = Number(wageSum.toFixed(2));
		}
		// Software hour totals (Σ/8 -> man-days)
		const sumWh  = rows.reduce((a, r) => a + (r.total_working_hours ?? 0), 0);
		const sumOt  = rows.reduce((a, r) => a + (r.total_ot_hours      ?? 0), 0);
		const sumP   = rows.reduce((a, r) => a + (r.count_p_days        ?? 0), 0);
		const sumOtD = rows.reduce((a, r) => a + (r.count_ot_days       ?? 0), 0);
		const sumWg  = rows.reduce((a, r) => a + (r.total_wages         ?? 0), 0);
		totals.total_working_hours = Number((sumWh / 8).toFixed(2));
		totals.total_ot_hours      = Number((sumOt / 8).toFixed(2));
		totals.cnt_p   = sumP;
		totals.cnt_ot  = sumOtD;
		totals.cnt_a   = 0;
		totals.cnt_b   = 0;
		totals.cnt_pts = 0;
		totals.inc_pts = 0;
		totals.count_total = sumP;
		totals.total_wages = Number(sumWg.toFixed(2));

		return {
			id: -1,
			eb_id: -1,
			emp_code: "Grand Total",
			emp_name: "",
			department: "",
			designation: "",
			rate: 0,
			shifts: {},
			ot_shifts: {},
			wages: {},
			working_hours: {},
			ot_hours: {},
			total_working_hours: 0,
			total_ot_hours: 0,
			total_wages: 0,
			count_p_days: 0,
			count_ot_days: 0,
			...totals,
		} as unknown as GridRow;
	}, [rows, columns]);

	const grandTotalGridColumns = useMemo<GridColDef<GridRow>[]>(
		() => gridColumns.map((c) => ({ ...c, valueGetter: undefined })),
		[gridColumns],
	);

	const columnGroupingModel = useMemo<GridColumnGroupingModel>(() => {
		const groups: GridColumnGroupingModel = [
			...columns.map((c) => ({
				groupId: `g_date_${c.key}`,
				headerName: c.label,
				children: [{ field: `shift_${c.key}` }, { field: `ot_${c.key}` }],
			})),
			{
				groupId: "g_sw",
				headerName: "Total as per Software",
				children: [{ field: "total_working_hours" }, { field: "total_ot_hours" }],
			},
			{
				groupId: "g_count",
				headerName: "Count",
				children: [
					{ field: "cnt_p" },
					{ field: "cnt_ot" },
					{ field: "cnt_a" },
					{ field: "cnt_b" },
					{ field: "cnt_pts" },
				],
			},
			{
				groupId: "g_wages",
				headerName: "Daily Wages (₹)",
				children: columns.map((c) => ({ field: `w_${c.key}` })),
			},
		];
		return groups;
	}, [columns]);

	const handleDownload = useCallback(async () => {
		if (!rows.length) {
			setSnackbar({ open: true, message: "No data to export", severity: "error" });
			return;
		}
		const ExcelJS = (await import("exceljs")).default;
		const { saveAs } = await import("file-saver");

		const wb = new ExcelJS.Workbook();
		const ws = wb.addWorksheet("Wages Register");

		const N = columns.length;
		const fixedCount = 5;
		const datePairCount = N * 2;
		const summaryCount = 2 + 5 + 1 + 1 + 1;
		const wageDailyCount = N;
		const totalWagesCount = 1;
		const totalCols = fixedCount + datePairCount + summaryCount + wageDailyCount + totalWagesCount;

		ws.mergeCells(1, 1, 1, totalCols);
		const title = ws.getCell(1, 1);
		title.value = `Wages Register: ${fromDate} to ${toDate}`;
		title.font = { bold: true, size: 14, color: { argb: "FF0C3C60" } };
		title.alignment = { horizontal: "center", vertical: "middle" };
		ws.getRow(1).height = 24;

		const headerFill = {
			type: "pattern" as const,
			pattern: "solid" as const,
			fgColor: { argb: "FF3EA6DA" },
		};
		const headerFont = { bold: true, color: { argb: "FFFFFFFF" } };
		const thin = { style: "thin" as const };
		const border = { top: thin, left: thin, bottom: thin, right: thin };

		const setHeader = (
			r1: number, c1: number, r2: number, c2: number, text: string,
		) => {
			if (r1 !== r2 || c1 !== c2) ws.mergeCells(r1, c1, r2, c2);
			const cell = ws.getCell(r1, c1);
			cell.value = text;
			cell.font = headerFont;
			cell.fill = headerFill;
			cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
			cell.border = border;
			for (let rr = r1; rr <= r2; rr++) {
				for (let cc = c1; cc <= c2; cc++) {
					const inner = ws.getCell(rr, cc);
					inner.border = border;
					inner.fill = headerFill;
				}
			}
		};

		const fixedHeaders = ["Emp Id", "Employee's Name", "Wages Per Day (in Rs.)", "Department", "Desig."];
		fixedHeaders.forEach((h, i) => setHeader(2, i + 1, 3, i + 1, h));

		let col = fixedCount + 1;
		for (const c of columns) {
			setHeader(2, col, 2, col + 1, c.label);
			setHeader(3, col,     3, col,     "Shift");
			setHeader(3, col + 1, 3, col + 1, "OT");
			col += 2;
		}

		setHeader(2, col, 2, col + 1, "Total as per Software");
		setHeader(3, col,     3, col,     "Regular");
		setHeader(3, col + 1, 3, col + 1, "OT");
		const colSw = col;
		col += 2;

		setHeader(2, col, 2, col + 4, "Count");
		setHeader(3, col,     3, col,     "P");
		setHeader(3, col + 1, 3, col + 1, "OT");
		setHeader(3, col + 2, 3, col + 2, "A");
		setHeader(3, col + 3, 3, col + 3, "B");
		setHeader(3, col + 4, 3, col + 4, "Pts");
		const colCnt = col;
		col += 5;

		setHeader(2, col, 3, col, "Incentives (Yes/No)");
		const colIncYN = col;
		col += 1;

		setHeader(2, col, 3, col, "Incentives Point");
		const colIncPts = col;
		col += 1;

		setHeader(2, col, 3, col, "Count");
		const colCountTotal = col;
		col += 1;

		const colWageStart = col;
		for (const c of columns) {
			setHeader(2, col, 3, col, c.label);
			col += 1;
		}

		setHeader(2, col, 3, col, "Total Wages");
		const colTotalWages = col;
		col += 1;

		ws.getRow(2).height = 22;
		ws.getRow(3).height = 22;

		const colSums: Record<number, number> = {};
		const isHourCol = new Set<number>();
		const isShiftCountCol = new Set<number>();

		const accumulate = (colIdx: number, val: number, hours = false) => {
			colSums[colIdx] = (colSums[colIdx] ?? 0) + (Number.isFinite(val) ? val : 0);
			if (hours) isHourCol.add(colIdx);
		};
		const isABCToken = (s: string) => /^[ABC]/i.test(s.trim());
		const hasABC = (s: string) =>
			s.trim().length > 0 && s.trim().split(/\s+/).some(isABCToken);

		for (const r of rows) {
			const cells: (string | number)[] = [
				r.emp_code,
				r.emp_name,
				r.rate,
				r.department,
				r.designation,
			];
			let cIdx = fixedCount;

			for (const c of columns) {
				const shiftText = (r.shifts?.[c.key] ?? "").toString().trim();
				cells.push(shiftText);
				cIdx += 1;
				isShiftCountCol.add(cIdx);
				if (hasABC(shiftText)) {
					colSums[cIdx] = (colSums[cIdx] ?? 0) + 1;
				}

				const otText = (r.ot_shifts?.[c.key] ?? "").toString().trim();
				cells.push(otText);
				cIdx += 1;
				isShiftCountCol.add(cIdx);
				if (hasABC(otText)) {
					colSums[cIdx] = (colSums[cIdx] ?? 0) + 1;
				}
			}
			cells.push(r.total_working_hours, r.total_ot_hours);
			cIdx += 1; accumulate(cIdx, r.total_working_hours, true);
			cIdx += 1; accumulate(cIdx, r.total_ot_hours,      true);
			cells.push(r.count_p_days, r.count_ot_days, 0, 0, 0);
			cIdx += 1; accumulate(cIdx, r.count_p_days);
			cIdx += 1; accumulate(cIdx, r.count_ot_days);
			cIdx += 1; accumulate(cIdx, 0);
			cIdx += 1; accumulate(cIdx, 0);
			cIdx += 1; accumulate(cIdx, 0);
			cells.push(r.count_p_days > 0 ? "Yes" : "No");
			cIdx += 1;
			cells.push(0);
			cIdx += 1; accumulate(cIdx, 0);
			cells.push(r.count_p_days);
			cIdx += 1; accumulate(cIdx, r.count_p_days);
			for (const c of columns) {
				const w = Number(r.wages?.[c.key] ?? 0);
				cells.push(w);
				cIdx += 1; accumulate(cIdx, w);
			}
			cells.push(r.total_wages);
			cIdx += 1; accumulate(cIdx, r.total_wages);

			const row = ws.addRow(cells);
			row.eachCell({ includeEmpty: true }, (cell) => {
				cell.border = border;
			});
		}

		const grandRowCells: (string | number)[] = new Array(totalCols).fill("");
		grandRowCells[0] = "Grand Total";
		for (const c of isHourCol) {
			const sum = colSums[c] ?? 0;
			grandRowCells[c - 1] = Number((sum / 8).toFixed(2));
		}
		for (const c of isShiftCountCol) {
			grandRowCells[c - 1] = colSums[c] ?? 0;
		}
		const grandRow = ws.addRow(grandRowCells);
		grandRow.eachCell({ includeEmpty: true }, (cell) => {
			cell.font = { bold: true };
			cell.fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "FFEAF6FB" },
			};
			cell.border = border;
		});

		ws.getColumn(1).width = 9;
		ws.getColumn(2).width = 24;
		ws.getColumn(3).width = 11;
		ws.getColumn(4).width = 14;
		ws.getColumn(5).width = 18;
		for (let i = fixedCount + 1; i <= fixedCount + datePairCount; i++) {
			ws.getColumn(i).width = 7;
		}
		ws.getColumn(colSw).width       = 9;
		ws.getColumn(colSw + 1).width   = 7;
		for (let i = 0; i < 5; i++) ws.getColumn(colCnt + i).width = 6;
		ws.getColumn(colIncYN).width = 8;
		ws.getColumn(colIncPts).width = 8;
		ws.getColumn(colCountTotal).width = 7;
		for (let i = colWageStart; i < colWageStart + N; i++) ws.getColumn(i).width = 9;
		ws.getColumn(colTotalWages).width = 12;

		ws.views = [{ state: "frozen", xSplit: 5, ySplit: 3 }];

		// ───────────────────────────────────────────────────────────────────
		// Helper: extract leading shift letter (A/B/C) from a shift token string.
		// ───────────────────────────────────────────────────────────────────
		const firstShiftLetter = (s: string): "A" | "B" | "C" | null => {
			const t = s.trim();
			if (!t) return null;
			const ch = t.charAt(0).toUpperCase();
			return ch === "A" || ch === "B" || ch === "C" ? ch : null;
		};

		// Aggregate hours per (shift, date), per (dept, date), per (dept, desig, date).
		const SHIFTS: ("A" | "B" | "C")[] = ["A", "B", "C"];
		const shiftHrs: Record<string, Record<string, number>> = {
			A: {}, B: {}, C: {},
		};
		const deptHrs:    Record<string, Record<string, number>> = {};
		const desigHrs:   Record<string, Record<string, Record<string, number>>> = {};

		for (const r of rows) {
			const dept  = r.department || "(Unassigned)";
			const desig = r.designation || "(Unassigned)";
			deptHrs[dept]   ??= {};
			desigHrs[dept]  ??= {};
			desigHrs[dept][desig] ??= {};

			for (const c of columns) {
				const wh  = Number(r.working_hours?.[c.key] ?? 0);
				const oth = Number(r.ot_hours?.[c.key] ?? 0);
				const total = wh + oth;
				if (total <= 0) continue;

				const shWH = firstShiftLetter(String(r.shifts?.[c.key] ?? ""));
				const shOT = firstShiftLetter(String(r.ot_shifts?.[c.key] ?? ""));
				if (shWH && wh > 0)  shiftHrs[shWH][c.key] = (shiftHrs[shWH][c.key] ?? 0) + wh;
				if (shOT && oth > 0) shiftHrs[shOT][c.key] = (shiftHrs[shOT][c.key] ?? 0) + oth;

				deptHrs[dept][c.key]            = (deptHrs[dept][c.key] ?? 0) + total;
				desigHrs[dept][desig][c.key]    = (desigHrs[dept][desig][c.key] ?? 0) + total;
			}
		}

		const handsRound = (h: number) => Number((h / 8).toFixed(3));

		// ───────────────────────────────────────────────────────────────────
		// Sheet: Shift Wise Summary
		// ───────────────────────────────────────────────────────────────────
		const wsShift = wb.addWorksheet("Shift Wise Summary");
		const shiftTotalCols = 1 + columns.length + 1;
		wsShift.mergeCells(1, 1, 1, shiftTotalCols);
		const shiftTitle = wsShift.getCell(1, 1);
		shiftTitle.value = `Shift Wise Summary: ${fromDate} to ${toDate}`;
		shiftTitle.font = { bold: true, size: 14, color: { argb: "FF0C3C60" } };
		shiftTitle.alignment = { horizontal: "center", vertical: "middle" };
		wsShift.getRow(1).height = 24;
		{
			const headers = ["Shift", ...columns.map((c) => c.label), "Total"];
			const r = wsShift.addRow(headers);
			r.eachCell((cell) => {
				cell.font = headerFont;
				cell.fill = headerFill;
				cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
				cell.border = border;
			});
			r.height = 22;
		}

		const shiftDateTotals: Record<string, number> = {};
		for (const sh of SHIFTS) {
			let rowTotal = 0;
			const cells: (string | number)[] = [sh];
			for (const c of columns) {
				const h = shiftHrs[sh][c.key] ?? 0;
				rowTotal += h;
				shiftDateTotals[c.key] = (shiftDateTotals[c.key] ?? 0) + h;
				cells.push(handsRound(h));
			}
			cells.push(handsRound(rowTotal));
			const r = wsShift.addRow(cells);
			r.getCell(1).font = { bold: true };
			r.eachCell({ includeEmpty: true }, (cell) => { cell.border = border; });
		}
		// Grand Total
		{
			let grand = 0;
			const cells: (string | number)[] = ["Grand Total"];
			for (const c of columns) {
				const h = shiftDateTotals[c.key] ?? 0;
				grand += h;
				cells.push(handsRound(h));
			}
			cells.push(handsRound(grand));
			const r = wsShift.addRow(cells);
			r.eachCell({ includeEmpty: true }, (cell) => {
				cell.font = { bold: true };
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FFEAF6FB" },
				};
				cell.border = border;
			});
		}
		wsShift.getColumn(1).width = 12;
		for (let i = 2; i <= 1 + columns.length; i++) wsShift.getColumn(i).width = 11;
		wsShift.getColumn(shiftTotalCols).width = 12;
		wsShift.views = [{ state: "frozen", xSplit: 1, ySplit: 2 }];

		// ───────────────────────────────────────────────────────────────────
		// Sheet: Designation Wise Summary (built first so we know dept anchors
		// for hyperlinks from the Dept Summary sheet)
		// ───────────────────────────────────────────────────────────────────
		const wsDesig = wb.addWorksheet("Designation Summary");
		// Title
		const desigTotalCols = 2 + columns.length + 1; // Dept | Desig | dates… | Total
		wsDesig.mergeCells(1, 1, 1, desigTotalCols);
		const desigTitle = wsDesig.getCell(1, 1);
		desigTitle.value = `Designation Wise Summary: ${fromDate} to ${toDate}`;
		desigTitle.font = { bold: true, size: 14, color: { argb: "FF0C3C60" } };
		desigTitle.alignment = { horizontal: "center", vertical: "middle" };
		wsDesig.getRow(1).height = 24;
		// Header row
		{
			const headers = ["Department", "Designation", ...columns.map((c) => c.label), "Total"];
			const r = wsDesig.addRow(headers);
			r.eachCell((cell) => {
				cell.font = headerFont;
				cell.fill = headerFill;
				cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
				cell.border = border;
			});
			r.height = 22;
		}

		const deptAnchorRow: Record<string, number> = {};
		const deptDateGrandTotals: Record<string, number> = {};
		const sortedDepts = Object.keys(desigHrs).sort();

		for (const dept of sortedDepts) {
			deptAnchorRow[dept] = wsDesig.lastRow ? wsDesig.lastRow.number + 1 : 3;
			const designations = Object.keys(desigHrs[dept]).sort();
			const deptDateTotals: Record<string, number> = {};
			let deptRowTotal = 0;

			for (const desig of designations) {
				let rowTotal = 0;
				const cells: (string | number)[] = [dept, desig];
				for (const c of columns) {
					const h = desigHrs[dept][desig][c.key] ?? 0;
					rowTotal += h;
					deptDateTotals[c.key] = (deptDateTotals[c.key] ?? 0) + h;
					cells.push(handsRound(h));
				}
				cells.push(handsRound(rowTotal));
				const r = wsDesig.addRow(cells);
				r.eachCell({ includeEmpty: true }, (cell) => { cell.border = border; });
			}

			// Dept Total row (different colour)
			{
				const cells: (string | number)[] = [`${dept} Total`, ""];
				for (const c of columns) {
					const h = deptDateTotals[c.key] ?? 0;
					deptRowTotal += h;
					deptDateGrandTotals[c.key] = (deptDateGrandTotals[c.key] ?? 0) + h;
					cells.push(handsRound(h));
				}
				cells.push(handsRound(deptRowTotal));
				const r = wsDesig.addRow(cells);
				r.eachCell({ includeEmpty: true }, (cell) => {
					cell.font = { bold: true };
					cell.fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: "FFFFE699" }, // soft amber
					};
					cell.border = border;
				});
			}
		}
		// Grand Total
		{
			let grand = 0;
			const cells: (string | number)[] = ["Grand Total", ""];
			for (const c of columns) {
				const h = deptDateGrandTotals[c.key] ?? 0;
				grand += h;
				cells.push(handsRound(h));
			}
			cells.push(handsRound(grand));
			const r = wsDesig.addRow(cells);
			r.eachCell({ includeEmpty: true }, (cell) => {
				cell.font = { bold: true };
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FFEAF6FB" },
				};
				cell.border = border;
			});
		}
		wsDesig.getColumn(1).width = 22;
		wsDesig.getColumn(2).width = 22;
		for (let i = 3; i <= 2 + columns.length; i++) wsDesig.getColumn(i).width = 11;
		wsDesig.getColumn(desigTotalCols).width = 12;
		wsDesig.views = [{ state: "frozen", xSplit: 2, ySplit: 2 }];

		// ───────────────────────────────────────────────────────────────────
		// Sheet: Dept Summary  (department rows hyperlinked to Designation sheet)
		// ───────────────────────────────────────────────────────────────────
		const wsDept = wb.addWorksheet("Dept Summary");
		const deptTotalCols = 1 + columns.length + 1;
		wsDept.mergeCells(1, 1, 1, deptTotalCols);
		const deptTitle = wsDept.getCell(1, 1);
		deptTitle.value = `Dept Wise Summary: ${fromDate} to ${toDate}`;
		deptTitle.font = { bold: true, size: 14, color: { argb: "FF0C3C60" } };
		deptTitle.alignment = { horizontal: "center", vertical: "middle" };
		wsDept.getRow(1).height = 24;
		{
			const headers = ["Department", ...columns.map((c) => c.label), "Total"];
			const r = wsDept.addRow(headers);
			r.eachCell((cell) => {
				cell.font = headerFont;
				cell.fill = headerFill;
				cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
				cell.border = border;
			});
			r.height = 22;
		}

		const deptDateGrand2: Record<string, number> = {};
		for (const dept of sortedDepts) {
			let rowTotal = 0;
			const cells: (string | number)[] = [dept];
			for (const c of columns) {
				const h = deptHrs[dept]?.[c.key] ?? 0;
				rowTotal += h;
				deptDateGrand2[c.key] = (deptDateGrand2[c.key] ?? 0) + h;
				cells.push(handsRound(h));
			}
			cells.push(handsRound(rowTotal));
			const r = wsDept.addRow(cells);
			r.eachCell({ includeEmpty: true }, (cell) => { cell.border = border; });
			// Hyperlink the dept name to the corresponding row in Designation Summary
			const anchor = deptAnchorRow[dept];
			if (anchor) {
				const cell = r.getCell(1);
				cell.value = {
					text: dept,
					hyperlink: `#'Designation Summary'!A${anchor}`,
				};
				cell.font = { color: { argb: "FF0563C1" }, underline: true };
			}
		}
		// Grand Total
		{
			let grand = 0;
			const cells: (string | number)[] = ["Grand Total"];
			for (const c of columns) {
				const h = deptDateGrand2[c.key] ?? 0;
				grand += h;
				cells.push(handsRound(h));
			}
			cells.push(handsRound(grand));
			const r = wsDept.addRow(cells);
			r.eachCell({ includeEmpty: true }, (cell) => {
				cell.font = { bold: true };
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FFEAF6FB" },
				};
				cell.border = border;
			});
		}
		wsDept.getColumn(1).width = 24;
		for (let i = 2; i <= 1 + columns.length; i++) wsDept.getColumn(i).width = 11;
		wsDept.getColumn(deptTotalCols).width = 12;
		wsDept.views = [{ state: "frozen", xSplit: 1, ySplit: 2 }];

		const buf = await wb.xlsx.writeBuffer();
		const blob = new Blob([buf], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});
		saveAs(blob, `WagesRegister_${fromDate}_to_${toDate}.xlsx`);
	}, [rows, columns, fromDate, toDate]);

	return (
		<div className="min-h-screen bg-gray-50 p-8">
			<div className="mx-auto max-w-7xl">
				<div className="mb-6 flex flex-col gap-2">
					<Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
						Wages Register
					</Typography>
				</div>

				<Box className="mb-6 flex flex-col-reverse gap-3 md:flex-row md:items-center md:justify-between">
					<Box className="flex flex-wrap items-center gap-3">{toolbarContent}</Box>
					<Box className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<Button variant="outlined" onClick={() => setFilterDialogOpen(true)}>
							Filter
						</Button>
						<Button
							variant="outlined"
							color="success"
							onClick={handleDownload}
							disabled={!rows.length}
						>
							Download Excel
						</Button>
					</Box>
				</Box>

				<BioAttFilterDialog
					open={filterDialogOpen}
					onClose={() => setFilterDialogOpen(false)}
					onApply={handleApplyFilter}
					initial={filter}
					title="Filter — Wages Register"
				/>

				<DataGrid
					rows={rows}
					columns={gridColumns}
					columnGroupingModel={columnGroupingModel}
					loading={loading}
					disableRowSelectionOnClick
					density="compact"
					autoHeight
					pageSizeOptions={[10, 20, 25, 50, 100]}
					initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
					sx={{
						"& .MuiDataGrid-columnHeader": {
							backgroundColor: "#3ea6da",
							color: "white",
							fontWeight: "bold",
						},
						"& .MuiDataGrid-columnHeaderTitle": { fontSize: 11, fontWeight: "bold" },
						"& .MuiDataGrid-cell": { fontSize: 12 },
					}}
				/>

				{grandTotalRow && (
					<Box sx={{ mt: 2 }}>
						<Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
							Grand Total
						</Typography>
						<DataGrid
							rows={[grandTotalRow]}
							columns={grandTotalGridColumns}
							columnGroupingModel={columnGroupingModel}
							hideFooter
							disableRowSelectionOnClick
							density="compact"
							autoHeight
							sx={{
								"& .MuiDataGrid-columnHeaderTitle": { fontSize: 11, fontWeight: 600 },
								"& .MuiDataGrid-cell": { fontSize: 12, fontWeight: 700 },
								"& .MuiDataGrid-row": {
									backgroundColor: "rgba(62, 166, 218, 0.08)",
								},
							}}
						/>
					</Box>
				)}

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
			</div>
		</div>
	);
}
