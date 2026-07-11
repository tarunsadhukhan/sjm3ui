"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Snackbar, TextField, Typography } from "@mui/material";
import { Printer, RefreshCw, FileSpreadsheet } from "lucide-react";
import type { Row as ExcelRow } from "exceljs";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

// One row of vw_hands_std_report as returned by /hrmsReports/hands_std_report.
interface StdRow {
	dept_desc: string | null;
	particular: string | null;
	act_a: number; std_a: number;
	act_b: number; std_b: number;
	act_c: number; std_c: number;
}

// Column groups: Shift A/B/C then a computed Total; each with Act / Std / Excess-Short.
const GROUPS = [
	{ key: "a", label: "Shift A" },
	{ key: "b", label: "Shift B" },
	{ key: "c", label: "Shift C" },
	{ key: "t", label: "Total" },
] as const;
const SUBS = ["Act hands", "Std hands", "Excess/Short"] as const;
const SHIFT_KEYS = ["a", "b", "c"] as const;
const N_COLS = 1 + GROUPS.length * SUBS.length; // particular + 12

type ActStd = { act: number; std: number };

/** Sum act/std per shift + total from a set of rows (or a single row). */
function accumulate(src: { act_a?: number; std_a?: number; act_b?: number; std_b?: number; act_c?: number; std_c?: number }): Record<string, ActStd> {
	const g: Record<string, ActStd> = { a: { act: 0, std: 0 }, b: { act: 0, std: 0 }, c: { act: 0, std: 0 }, t: { act: 0, std: 0 } };
	for (const s of SHIFT_KEYS) {
		g[s].act += Number(src[`act_${s}` as keyof typeof src]) || 0;
		g[s].std += Number(src[`std_${s}` as keyof typeof src]) || 0;
	}
	g.t = { act: g.a.act + g.b.act + g.c.act, std: g.a.std + g.b.std + g.c.std };
	return g;
}

/** [act, std, excess/short] per group, flattened to 12 cells. */
function cells(g: Record<string, ActStd>): number[] {
	return GROUPS.flatMap((grp) => [g[grp.key].act, g[grp.key].std, g[grp.key].act - g[grp.key].std]);
}

/** 0 -> "" ; else trimmed number. */
function fmt(v: number | null | undefined): string {
	if (!v) return "";
	return String(Math.round(v * 100) / 100);
}

export default function ActualVsStdMatrix() {
	const { selectedBranches } = useSidebarContext();
	const [tranDate, setTranDate] = useState("");
	const [rows, setRows] = useState<StdRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: "" });

	const getCoId = useCallback((): string => {
		const c = localStorage.getItem("sidebar_selectedCompany");
		return c ? JSON.parse(c).co_id : "";
	}, []);

	const fetchReport = useCallback(
		async (dateOverride?: string) => {
			setLoading(true);
			try {
				const co_id = getCoId();
				if (!co_id) throw new Error("No company selected");

				const qp = new URLSearchParams({ co_id });
				const d = dateOverride ?? tranDate;
				if (d) qp.append("tran_date", d);
				if (selectedBranches.length) qp.append("branch_id", selectedBranches.join(","));

				const { data, error } = await fetchWithCookie<{ tran_date: string; data: StdRow[] }>(
					`${apiRoutesPortalMasters.HANDS_STD_REPORT}?${qp}`,
					"GET",
				);
				if (error || !data) throw new Error(error || "Failed to load report");

				setRows(data.data || []);
				if (!d && data.tran_date) setTranDate(data.tran_date);
			} catch (err) {
				setSnackbar({ open: true, message: err instanceof Error ? err.message : "Error loading report" });
				setRows([]);
			} finally {
				setLoading(false);
			}
		},
		[getCoId, tranDate, selectedBranches],
	);

	useEffect(() => {
		fetchReport();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedBranches]);

	// Sections with per-department act/std accumulators.
	const sections = useMemo(() => {
		const out: { dept: string; rows: StdRow[]; g: Record<string, ActStd> }[] = [];
		for (const r of rows) {
			const dept = r.dept_desc || "—";
			let last = out[out.length - 1];
			if (!last || last.dept !== dept) {
				last = { dept, rows: [], g: accumulate({}) };
				out.push(last);
			}
			last.rows.push(r);
			for (const s of SHIFT_KEYS) {
				last.g[s].act += Number(r[`act_${s}` as keyof StdRow]) || 0;
				last.g[s].std += Number(r[`std_${s}` as keyof StdRow]) || 0;
			}
		}
		for (const sec of out) sec.g.t = { act: sec.g.a.act + sec.g.b.act + sec.g.c.act, std: sec.g.a.std + sec.g.b.std + sec.g.c.std };
		return out;
	}, [rows]);

	const grand = useMemo(() => {
		const g = accumulate({});
		for (const r of rows) {
			for (const s of SHIFT_KEYS) {
				g[s].act += Number(r[`act_${s}` as keyof StdRow]) || 0;
				g[s].std += Number(r[`std_${s}` as keyof StdRow]) || 0;
			}
		}
		g.t = { act: g.a.act + g.b.act + g.c.act, std: g.a.std + g.b.std + g.c.std };
		return g;
	}, [rows]);

	// Render a value row of 12 cells; Excess/Short cells (every 3rd) get sign colour.
	const renderCells = (vals: number[]) =>
		vals.map((v, i) => (
			<td key={i} className={`num${i % 3 === 2 ? (v > 0 ? " pos" : v < 0 ? " neg" : "") : ""}`}>
				{fmt(v)}
			</td>
		));

	// ── Excel export (2-row header: group -> Act/Std/Excess). ──
	const handleExportExcel = useCallback(async () => {
		if (!rows.length) return;
		const ExcelJS = (await import("exceljs")).default;
		const { saveAs } = await import("file-saver");

		const wb = new ExcelJS.Workbook();
		const ws = wb.addWorksheet("Actual vs Std");
		const thin = { style: "thin" as const };
		const border = { top: thin, left: thin, bottom: thin, right: thin };
		const bordered = (row: ExcelRow) => row.eachCell({ includeEmpty: true }, (c) => (c.border = border));

		ws.mergeCells(1, 1, 1, N_COLS);
		const title = ws.getCell(1, 1);
		title.value = `ACTUAL vs STD HANDS — Date: ${tranDate || "—"}`;
		title.font = { bold: true, size: 14 };
		title.alignment = { horizontal: "center" };

		// header rows 2,3
		ws.mergeCells(2, 1, 3, 1);
		ws.getCell(2, 1).value = "Particular's";
		GROUPS.forEach((grp, gi) => {
			const base = 2 + gi * 3;
			ws.mergeCells(2, base, 2, base + 2);
			ws.getCell(2, base).value = grp.label;
			SUBS.forEach((sub, si) => (ws.getCell(3, base + si).value = sub));
		});
		for (let r = 2; r <= 3; r++) {
			ws.getRow(r).eachCell({ includeEmpty: true }, (c) => {
				c.font = { bold: true };
				c.alignment = { horizontal: "center", vertical: "middle" };
				c.border = border;
				c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
			});
		}

		const cellVals = (vals: number[]) => vals.map((v) => v || null);

		for (const sec of sections) {
			const secRow = ws.addRow([sec.dept]);
			ws.mergeCells(secRow.number, 1, secRow.number, N_COLS);
			secRow.getCell(1).font = { bold: true };
			secRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
			bordered(secRow);
			for (const r of sec.rows) {
				bordered(ws.addRow([r.particular || "—", ...cellVals(cells(accumulate(r)))]));
			}
			const subRow = ws.addRow([`${sec.dept} Total`, ...cellVals(cells(sec.g))]);
			subRow.font = { bold: true, italic: true };
			bordered(subRow);
		}

		const totalRow = ws.addRow(["Grand Total", ...cellVals(cells(grand))]);
		totalRow.font = { bold: true };
		bordered(totalRow);

		ws.getColumn(1).width = 26;
		for (let i = 2; i <= N_COLS; i++) ws.getColumn(i).width = 11;
		ws.views = [{ state: "frozen", xSplit: 1, ySplit: 3 }];

		const buf = await wb.xlsx.writeBuffer();
		saveAs(
			new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
			`ActualVsStdHands_${tranDate || "report"}.xlsx`,
		);
	}, [rows, sections, grand, tranDate]);

	return (
		<Box>
			<style>{`@media print {
				.hands-report-noprint { display: none !important; }
				@page { size: landscape; margin: 8mm; }
			}`}</style>

			<Box className="hands-report-noprint" sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
				<TextField type="date" label="Date" size="small" value={tranDate}
					onChange={(e) => setTranDate(e.target.value)} InputLabelProps={{ shrink: true }} />
				<Button variant="contained" startIcon={<RefreshCw size={16} />} onClick={() => fetchReport()}>Show</Button>
				<Button variant="outlined" color="success" startIcon={<FileSpreadsheet size={16} />}
					onClick={handleExportExcel} disabled={!rows.length}>Export Excel</Button>
				<Button variant="outlined" startIcon={<Printer size={16} />} onClick={() => window.print()} disabled={!rows.length}>Print</Button>
				{loading && <CircularProgress size={20} />}
			</Box>

			<Box sx={{ textAlign: "center", mb: 1 }}>
				<Typography variant="h6" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
					Actual vs Std Hands
				</Typography>
				<Typography variant="body2" color="text.secondary">Date: {tranDate || "—"}</Typography>
			</Box>

			<Box
				sx={{
					overflowX: "auto",
					"& table": { borderCollapse: "collapse", width: "100%", fontSize: 12 },
					"& th, & td": { border: (t) => `1px solid ${t.palette.divider}`, px: 0.75, py: 0.4, whiteSpace: "nowrap" },
					"& thead th": { bgcolor: "action.hover", fontWeight: 700, textAlign: "center", position: "sticky", top: 0 },
					"& td.num": { textAlign: "right", fontVariantNumeric: "tabular-nums" },
					"& td.pos": { color: "success.main" },
					"& td.neg": { color: "error.main" },
					"& td.particular": { textAlign: "left", minWidth: 200, position: "sticky", left: 0, bgcolor: "background.paper" },
					"& tr.section td": { bgcolor: "action.selected", fontWeight: 700 },
					"& tr.subtotal td": { bgcolor: "action.hover", fontWeight: 700, fontStyle: "italic" },
					"& tr.foot td": { bgcolor: "action.selected", fontWeight: 700 },
				}}
			>
				<table>
					<thead>
						<tr>
							<th rowSpan={2} style={{ textAlign: "left" }}>Particular&apos;s</th>
							{GROUPS.map((g) => (
								<th key={g.key} colSpan={3}>{g.label}</th>
							))}
						</tr>
						<tr>
							{GROUPS.flatMap((g) => SUBS.map((sub) => <th key={`${g.key}-${sub}`}>{sub}</th>))}
						</tr>
					</thead>
					<tbody>
						{!loading && rows.length === 0 && (
							<tr>
								<td colSpan={N_COLS} style={{ textAlign: "center", padding: 16 }}>No data for this date.</td>
							</tr>
						)}

						{sections.map((sec) => (
							<React.Fragment key={sec.dept}>
								<tr className="section">
									<td colSpan={N_COLS}>{sec.dept}</td>
								</tr>
								{sec.rows.map((r, i) => (
									<tr key={`${sec.dept}-${r.particular}-${i}`}>
										<td className="particular">{r.particular || "—"}</td>
										{renderCells(cells(accumulate(r)))}
									</tr>
								))}
								<tr className="subtotal">
									<td className="particular">{sec.dept} Total</td>
									{renderCells(cells(sec.g))}
								</tr>
							</React.Fragment>
						))}

						{rows.length > 0 && (
							<tr className="foot">
								<td className="particular">Grand Total</td>
								{renderCells(cells(grand))}
							</tr>
						)}
					</tbody>
				</table>
			</Box>

			<Snackbar open={snackbar.open} autoHideDuration={4000}
				onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}>
				<Alert severity="error" onClose={() => setSnackbar((p) => ({ ...p, open: false }))} sx={{ width: "100%" }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	);
}
