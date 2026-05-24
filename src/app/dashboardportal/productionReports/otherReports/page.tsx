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
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContextSafe } from "@/components/dashboard/sidebarContext";
import { fetchOtherEntries } from "@/utils/otherReportService";
import type { OtherEntriesRow } from "./types/otherReportTypes";
import OtherFilterDialog, {
	type OtherFilterValues,
	getDefaultFromDate,
	getDefaultToDate,
} from "./OtherFilterDialog";

type ViewKey = "entries";

const VIEW_TITLES: Record<ViewKey, string> = {
	entries: "Other Entries Report",
};

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

const NUMERIC_FIELDS = [
	"looms",
	"cuts",
	"cutting_hemming_bdl",
	"heracle_bdl",
	"branding",
	"h_sewer_bdl",
	"bales_production",
	"bales_issue",
] as const;

type EntryRow = OtherEntriesRow & { id: string; isGrandTotal?: boolean };

function buildEntryRows(rows: OtherEntriesRow[]): EntryRow[] {
	const out: EntryRow[] = rows
		.slice()
		.sort((a, b) => {
			const dates = [a.report_date, b.report_date];
			sortDdMmYyyy(dates);
			return dates[0] === a.report_date ? -1 : 1;
		})
		.map((r, idx) => ({ ...r, id: `${r.report_date}_${idx}` }));

	if (out.length === 0) return out;

	const totals: Record<string, number> = {};
	NUMERIC_FIELDS.forEach((f) => {
		totals[f] = out.reduce((s, r) => s + (Number(r[f]) || 0), 0);
	});
	out.push({
		id: "__GRAND_TOTAL__",
		report_date: "Grand Total",
		looms: totals.looms,
		cuts: totals.cuts,
		cutting_hemming_bdl: totals.cutting_hemming_bdl,
		heracle_bdl: totals.heracle_bdl,
		branding: totals.branding,
		h_sewer_bdl: totals.h_sewer_bdl,
		bales_production: totals.bales_production,
		bales_issue: totals.bales_issue,
		isGrandTotal: true,
	});
	return out;
}

export default function OtherReportsPage() {
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

	const [view, setView] = useState<ViewKey>("entries");
	const [entryRows, setEntryRows] = useState<EntryRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState<OtherFilterValues>(() => ({
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
			setEntryRows([]);
			return;
		}
		if (!filter.fromDate || !filter.toDate) return;

		setLoading(true);
		try {
			const data = await fetchOtherEntries(
				branchId,
				filter.fromDate,
				filter.toDate,
			);
			setEntryRows(buildEntryRows(data));
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching report";
			setSnackbar({ open: true, message, severity: "error" });
			setEntryRows([]);
		} finally {
			setLoading(false);
		}
	}, [branchId, filter.fromDate, filter.toDate]);

	useEffect(() => {
		loadReport();
	}, [loadReport]);

	const handleViewChange = useCallback((e: SelectChangeEvent<ViewKey>) => {
		setView(e.target.value as ViewKey);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, []);

	const viewSelect = (
		<FormControl size="small" sx={{ minWidth: 260 }}>
			<InputLabel id="other-report-view-label">Report</InputLabel>
			<Select<ViewKey>
				labelId="other-report-view-label"
				label="Report"
				value={view}
				onChange={handleViewChange}
			>
				<MenuItem value="entries">Other Entries Report</MenuItem>
			</Select>
		</FormControl>
	);

	const handleApply = useCallback((values: OtherFilterValues) => {
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
		body += `<table><thead><tr>`;
		body +=
			`<th>Date</th><th>Looms</th><th>Cuts</th>` +
			`<th>Cutting Hemming (Bdl)</th><th>Heracle (Bdl)</th>` +
			`<th>Branding</th><th>H/Sewer (Bdl)</th>` +
			`<th>Bales Production</th><th>Bales Issue</th>`;
		body += `</tr></thead><tbody>`;
		entryRows.forEach((r) => {
			const cls = r.isGrandTotal ? ' class="grand-total"' : "";
			body +=
				`<tr${cls}>` +
				`<td class="text">${escapeHtml(r.report_date)}</td>` +
				`<td>${fmtNum(r.looms)}</td>` +
				`<td>${fmtNum(r.cuts)}</td>` +
				`<td>${fmtNum(r.cutting_hemming_bdl)}</td>` +
				`<td>${fmtNum(r.heracle_bdl)}</td>` +
				`<td>${fmtNum(r.branding)}</td>` +
				`<td>${fmtNum(r.h_sewer_bdl)}</td>` +
				`<td>${fmtNum(r.bales_production)}</td>` +
				`<td>${fmtNum(r.bales_issue)}</td>` +
				`</tr>`;
		});
		body += `</tbody></table>`;
		openPrintWindow(title, body);
	}, [view, entryRows, buildMetaHtml]);

	const columns = useMemo<GridColDef<EntryRow>[]>(() => {
		const num = (
			field: keyof OtherEntriesRow,
			header: string,
			minWidth = 110,
			flex = 1,
		): GridColDef<EntryRow> => ({
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
				minWidth: 120,
				sortable: false,
			},
			num("looms", "Looms", 90),
			num("cuts", "Cuts", 90),
			num("cutting_hemming_bdl", "Cutting Hemming (Bdl)", 160),
			num("heracle_bdl", "Heracle (Bdl)", 120),
			num("branding", "Branding", 100),
			num("h_sewer_bdl", "H/Sewer (Bdl)", 120),
			num("bales_production", "Bales Production", 140),
			num("bales_issue", "Bales Issue", 120),
		];
	}, []);

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
		<OtherFilterDialog
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
		"& .other-row-grand-total": {
			bgcolor: "#0C3C60",
			color: "#fff",
			fontWeight: 700,
		},
		"& .other-row-grand-total:hover": { bgcolor: "#0C3C60" },
		"& .other-row-grand-total .MuiDataGrid-cell": { color: "#fff" },
	};

	return (
		<IndexWrapper
			title={VIEW_TITLES[view]}
			subtitle={subtitle}
			rows={entryRows}
			columns={columns}
			rowCount={entryRows.length}
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
				(params.row as EntryRow).isGrandTotal ? "other-row-grand-total" : ""
			}
			extraSx={totalRowSx}
		>
			{filterDialog}
			{snackbarEl}
		</IndexWrapper>
	);
}
