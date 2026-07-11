"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, Snackbar, TextField, Typography } from "@mui/material";
import { Printer, RefreshCw, FileSpreadsheet } from "lucide-react";
import type { Row as ExcelRow } from "exceljs";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

// One row of vw_hands_report as returned by /hrmsReports/hands_report.
interface HandsRow {
	dept_desc: string | null;
	particular: string | null;
	mh_a_os: number; hands_a_os: number; mh_a_ns: number; hands_a_ns: number;
	mh_b1_os: number; hands_b1_os: number; mh_b1_ns: number; hands_b1_ns: number;
	mh_b2_os: number; hands_b2_os: number; mh_b2_ns: number; hands_b2_ns: number;
	mh_c_os: number; hands_c_os: number; mh_c_ns: number; hands_c_ns: number;
	total_hands: number;
}

const SHIFTS = [
	{ key: "a", label: "Shift A" },
	{ key: "b1", label: "Shift B1" },
	{ key: "b2", label: "Shift B2" },
	{ key: "c", label: "Shift C" },
] as const;

const SHEDS = [
	{ key: "os", label: "Old Shed" },
	{ key: "ns", label: "New Shed" },
] as const;

// 16 measure fields in display order: shift -> shed -> [M/H, Hands].
const FIELDS_ORDERED = SHIFTS.flatMap((s) =>
	SHEDS.flatMap((sh) => [`mh_${s.key}_${sh.key}`, `hands_${s.key}_${sh.key}`] as (keyof HandsRow)[]),
);
const HANDS_FIELDS = FIELDS_ORDERED.filter((f) => f.startsWith("hands_"));

/** 0 -> "" (matches the sparse paper look); else trimmed number. */
function fmt(v: number | null | undefined): string {
	if (!v) return "";
	return String(Math.round(v * 100) / 100);
}

export default function HandsReportMatrix() {
	const { selectedBranches } = useSidebarContext();
	const [tranDate, setTranDate] = useState("");
	const [rows, setRows] = useState<HandsRow[]>([]);
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

				const { data, error } = await fetchWithCookie<{ tran_date: string; data: HandsRow[] }>(
					`${apiRoutesPortalMasters.HANDS_REPORT}?${qp}`,
					"GET",
				);
				if (error || !data) throw new Error(error || "Failed to load hands report");

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

	// Initial load (latest date) + refetch when branch changes.
	useEffect(() => {
		fetchReport();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedBranches]);

	// Group ordered rows into sections by dept_desc (data arrives pre-ordered),
	// accumulating a per-department column total as we go.
	const sections = useMemo(() => {
		const out: { dept: string; rows: HandsRow[]; totals: Record<string, number> }[] = [];
		for (const r of rows) {
			const dept = r.dept_desc || "—";
			let last = out[out.length - 1];
			if (!last || last.dept !== dept) {
				last = { dept, rows: [], totals: Object.fromEntries(FIELDS_ORDERED.map((f) => [f, 0])) };
				out.push(last);
			}
			last.rows.push(r);
			for (const f of FIELDS_ORDERED) last.totals[f] += Number(r[f]) || 0;
		}
		return out;
	}, [rows]);

	// Column sums + reconciliation figures for the footer.
	const totals = useMemo(() => {
		const sums = {} as Record<keyof HandsRow, number>;
		for (const f of FIELDS_ORDERED) sums[f] = 0;
		let dataHands = 0;
		for (const r of rows) {
			for (const f of FIELDS_ORDERED) sums[f] += Number(r[f]) || 0;
			dataHands += Number(r.total_hands) || 0;
		}
		const displayedHands = HANDS_FIELDS.reduce((a, f) => a + sums[f], 0);
		return { sums, dataHands, displayedHands, diff: displayedHands - dataHands };
	}, [rows]);

	const totalCols = 1 + SHIFTS.length * SHEDS.length * 2; // particular + 16 measures

	// ── Excel export — mirrors the on-screen matrix (merged Shift/Shed headers). ──
	const handleExportExcel = useCallback(async () => {
		if (!rows.length) return;
		const ExcelJS = (await import("exceljs")).default;
		const { saveAs } = await import("file-saver");

		const wb = new ExcelJS.Workbook();
		const ws = wb.addWorksheet("Hands Report");
		const thin = { style: "thin" as const };
		const border = { top: thin, left: thin, bottom: thin, right: thin };
		const bordered = (row: ExcelRow) =>
			row.eachCell({ includeEmpty: true }, (c) => (c.border = border));

		// Title
		ws.mergeCells(1, 1, 1, totalCols);
		const title = ws.getCell(1, 1);
		title.value = `HANDS REPORT — Date: ${tranDate || "—"}`;
		title.font = { bold: true, size: 14 };
		title.alignment = { horizontal: "center" };

		// 3-row header (rows 2,3,4)
		ws.mergeCells(2, 1, 4, 1);
		ws.getCell(2, 1).value = "Particular's";
		SHIFTS.forEach((s, si) => {
			const base = 2 + si * 4;
			ws.mergeCells(2, base, 2, base + 3);
			ws.getCell(2, base).value = s.label;
			SHEDS.forEach((sh, shi) => {
				const c = base + shi * 2;
				ws.mergeCells(3, c, 3, c + 1);
				ws.getCell(3, c).value = sh.label;
				ws.getCell(4, c).value = "M/H";
				ws.getCell(4, c + 1).value = "Hands";
			});
		});
		for (let r = 2; r <= 4; r++) {
			const row = ws.getRow(r);
			row.eachCell({ includeEmpty: true }, (c) => {
				c.font = { bold: true };
				c.alignment = { horizontal: "center", vertical: "middle" };
				c.border = border;
				c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } };
			});
		}

		const measureCells = (r: HandsRow) => FIELDS_ORDERED.map((f) => (Number(r[f]) || 0) || null);

		// Sections + rows
		for (const sec of sections) {
			const secRow = ws.addRow([sec.dept]);
			ws.mergeCells(secRow.number, 1, secRow.number, totalCols);
			secRow.getCell(1).font = { bold: true };
			secRow.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
			bordered(secRow);
			for (const r of sec.rows) {
				bordered(ws.addRow([r.particular || "—", ...measureCells(r)]));
			}
			const subRow = ws.addRow([`${sec.dept} Total`, ...FIELDS_ORDERED.map((f) => sec.totals[f] || null)]);
			subRow.font = { bold: true, italic: true };
			bordered(subRow);
		}

		// Footer
		const totalRow = ws.addRow(["Grand Total", ...FIELDS_ORDERED.map((f) => totals.sums[f] || null)]);
		totalRow.font = { bold: true };
		bordered(totalRow);
		const dataRow = ws.addRow(["Grand Total Hands (as per data)", totals.dataHands]);
		dataRow.font = { bold: true };
		const diffRow = ws.addRow(["Difference (B counted in B1 & B2)", totals.diff]);
		diffRow.font = { bold: true };

		// Widths
		ws.getColumn(1).width = 26;
		for (let i = 2; i <= totalCols; i++) ws.getColumn(i).width = 8;
		ws.views = [{ state: "frozen", xSplit: 1, ySplit: 4 }];

		const buf = await wb.xlsx.writeBuffer();
		saveAs(
			new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
			`HandsReport_${tranDate || "report"}.xlsx`,
		);
	}, [rows, sections, totals, tranDate, totalCols]);

	return (
		<Box>
			<style>{`@media print {
				.hands-report-noprint { display: none !important; }
				@page { size: landscape; margin: 8mm; }
			}`}</style>

			{/* Controls */}
			<Box
				className="hands-report-noprint"
				sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}
			>
				<TextField
					type="date"
					label="Date"
					size="small"
					value={tranDate}
					onChange={(e) => setTranDate(e.target.value)}
					InputLabelProps={{ shrink: true }}
				/>
				<Button variant="contained" startIcon={<RefreshCw size={16} />} onClick={() => fetchReport()}>
					Show
				</Button>
				<Button
					variant="outlined"
					color="success"
					startIcon={<FileSpreadsheet size={16} />}
					onClick={handleExportExcel}
					disabled={!rows.length}
				>
					Export Excel
				</Button>
				<Button
					variant="outlined"
					startIcon={<Printer size={16} />}
					onClick={() => window.print()}
					disabled={!rows.length}
				>
					Print
				</Button>
				{loading && <CircularProgress size={20} />}
			</Box>

			{/* Report */}
			<Box sx={{ textAlign: "center", mb: 1 }}>
				<Typography variant="h6" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
					Hands Report
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Date: {tranDate || "—"}
				</Typography>
			</Box>

			<Box
				sx={{
					overflowX: "auto",
					"& table": { borderCollapse: "collapse", width: "100%", fontSize: 12 },
					"& th, & td": {
						border: (t) => `1px solid ${t.palette.divider}`,
						px: 0.75,
						py: 0.4,
						whiteSpace: "nowrap",
					},
					"& thead th": {
						bgcolor: "action.hover",
						fontWeight: 700,
						textAlign: "center",
						position: "sticky",
						top: 0,
					},
					"& td.num": { textAlign: "right", fontVariantNumeric: "tabular-nums" },
					"& td.particular": { textAlign: "left", minWidth: 180, position: "sticky", left: 0, bgcolor: "background.paper" },
					"& tr.section td": { bgcolor: "action.selected", fontWeight: 700 },
					"& tr.subtotal td": { bgcolor: "action.hover", fontWeight: 700, fontStyle: "italic" },
					"& tr.foot td": { bgcolor: "action.selected", fontWeight: 700 },
				}}
			>
				<table>
					<thead>
						<tr>
							<th rowSpan={3} style={{ textAlign: "left" }}>
								Particular&apos;s
							</th>
							{SHIFTS.map((s) => (
								<th key={s.key} colSpan={4}>
									{s.label}
								</th>
							))}
						</tr>
						<tr>
							{SHIFTS.flatMap((s) =>
								SHEDS.map((sh) => (
									<th key={`${s.key}-${sh.key}`} colSpan={2}>
										{sh.label}
									</th>
								)),
							)}
						</tr>
						<tr>
							{SHIFTS.flatMap((s) =>
								SHEDS.map((sh) => (
									<React.Fragment key={`${s.key}-${sh.key}-mh`}>
										<th>M/H</th>
										<th>Hands</th>
									</React.Fragment>
								)),
							)}
						</tr>
					</thead>
					<tbody>
						{!loading && rows.length === 0 && (
							<tr>
								<td colSpan={totalCols} style={{ textAlign: "center", padding: 16 }}>
									No data for this date.
								</td>
							</tr>
						)}

						{sections.map((sec) => (
							<React.Fragment key={sec.dept}>
								<tr className="section">
									<td colSpan={totalCols}>{sec.dept}</td>
								</tr>
								{sec.rows.map((r, i) => (
									<tr key={`${sec.dept}-${r.particular}-${i}`}>
										<td className="particular">{r.particular || "—"}</td>
										{FIELDS_ORDERED.map((f) => (
											<td key={f} className="num">
												{fmt(r[f] as number)}
											</td>
										))}
									</tr>
								))}
								<tr className="subtotal">
									<td className="particular">{sec.dept} Total</td>
									{FIELDS_ORDERED.map((f) => (
										<td key={f} className="num">
											{fmt(sec.totals[f])}
										</td>
									))}
								</tr>
							</React.Fragment>
						))}

						{rows.length > 0 && (
							<>
								<tr className="foot">
									<td className="particular">Grand Total</td>
									{FIELDS_ORDERED.map((f) => (
										<td key={f} className="num">
											{fmt(totals.sums[f])}
										</td>
									))}
								</tr>
								<tr className="foot">
									<td className="particular">Grand Total Hands (as per data)</td>
									<td className="num" colSpan={totalCols - 1} style={{ textAlign: "right" }}>
										{fmt(totals.dataHands)}
									</td>
								</tr>
								<tr className="foot">
									<td className="particular">Difference (B counted in B1 &amp; B2)</td>
									<td className="num" colSpan={totalCols - 1} style={{ textAlign: "right" }}>
										{fmt(totals.diff)}
									</td>
								</tr>
							</>
						)}
					</tbody>
				</table>
			</Box>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar((p) => ({ ...p, open: false }))}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert severity="error" onClose={() => setSnackbar((p) => ({ ...p, open: false }))} sx={{ width: "100%" }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</Box>
	);
}
