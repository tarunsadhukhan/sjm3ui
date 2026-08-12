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
import { fetchAssortingEntries } from "@/utils/assortingReportService";
import { exportReportExcel } from "@/utils/excelReportExport";
import type { AssortingEntryRow } from "./types/assortingReportTypes";
import {
	buildEntryRows,
	buildPivotRows,
	buildSummaryRows,
	dayLabel,
	type ReportRow,
	type TextField,
} from "./assortingRows";
import AssortingFilterDialog, {
	type AssortingFilterValues,
	getDefaultFromDate,
	getDefaultToDate,
} from "./AssortingFilterDialog";

type ViewKey = "entries" | "dayPivot" | "worker" | "quality";

const VIEW_TITLES: Record<ViewKey, string> = {
	entries: "Assorting Report",
	dayPivot: "Day wise — Worker & Quality",
	worker: "Worker wise",
	quality: "Quality wise",
};

const VIEW_KEYS = Object.keys(VIEW_TITLES) as ViewKey[];

/** One output column, shared by the grid, the print sheet and the Excel export. */
type OutCol = {
	field: string;
	header: string;
	/** Left-aligned string column; otherwise right-aligned numeric. */
	text?: boolean;
	/** Excel column width (characters). */
	width: number;
	minWidth: number;
	flex: number;
	value: (r: ReportRow) => unknown;
};

const txtCol = (
	field: TextField,
	header: string,
	width: number,
	minWidth: number,
	flex: number,
): OutCol => ({
	field,
	header,
	text: true,
	width,
	minWidth,
	flex,
	value: (r) => r[field] ?? "",
});

const measureCol = (
	field: "gross_wt" | "tare_wt" | "net_wt",
	header: string,
): OutCol => ({
	field,
	header,
	width: 12,
	minWidth: 100,
	flex: 1,
	value: (r) => r[field],
});

const MEASURE_COLS: OutCol[] = [
	measureCol("gross_wt", "Gross Wt"),
	measureCol("tare_wt", "Tare Wt"),
	measureCol("net_wt", "Net Wt"),
];

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

function openPrintWindow(title: string, bodyHtml: string, landscape = false) {
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
  tr.sub-total td { background: #bbdefb; font-weight: 700; }
  @page { size: ${landscape ? "landscape" : "portrait"}; }
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

export default function AssortingReportsPage() {
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
	const [entries, setEntries] = useState<AssortingEntryRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState<AssortingFilterValues>(() => ({
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
			setEntries([]);
			return;
		}
		if (!filter.fromDate || !filter.toDate) return;

		setLoading(true);
		try {
			const data = await fetchAssortingEntries(
				branchId,
				filter.fromDate,
				filter.toDate,
			);
			setEntries(data);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching report";
			setSnackbar({ open: true, message, severity: "error" });
			setEntries([]);
		} finally {
			setLoading(false);
		}
	}, [branchId, filter.fromDate, filter.toDate]);

	useEffect(() => {
		loadReport();
	}, [loadReport]);

	// Every view derives from the same fetched entries — switching never refetches.
	// `dates` is only populated for the pivot, where it drives the day columns.
	const { rows, dates } = useMemo<{ rows: ReportRow[]; dates: string[] }>(() => {
		switch (view) {
			case "dayPivot":
				return buildPivotRows(entries);
			case "worker":
				return { rows: buildSummaryRows(entries, "selector_name"), dates: [] };
			case "quality":
				return { rows: buildSummaryRows(entries, "quality_name"), dates: [] };
			default:
				return { rows: buildEntryRows(entries), dates: [] };
		}
	}, [view, entries]);

	const outCols = useMemo<OutCol[]>(() => {
		switch (view) {
			case "dayPivot":
				return [
					txtCol("selector_name", "Worker", 20, 150, 1.5),
					txtCol("quality_name", "Quality", 18, 130, 1.2),
					...dates.map<OutCol>((d) => ({
						field: `day_${d}`,
						header: dayLabel(d),
						width: 10,
						minWidth: 82,
						flex: 0.6,
						value: (r) => r.days?.[d] ?? null,
					})),
					{
						field: "total",
						header: "Total",
						width: 12,
						minWidth: 100,
						flex: 1,
						value: (r) => r.total,
					},
				];
			case "worker":
				return [txtCol("selector_name", "Worker", 20, 150, 1.5), ...MEASURE_COLS];
			case "quality":
				return [txtCol("quality_name", "Quality", 18, 150, 1.5), ...MEASURE_COLS];
			default:
				return [
					txtCol("report_date", "Date", 12, 110, 1),
					txtCol("shed_type", "Shed", 12, 100, 1),
					txtCol("mc_name", "Machine", 18, 140, 1.5),
					txtCol("selector_name", "Selector", 20, 150, 1.5),
					txtCol("quality_name", "Quality", 18, 140, 1.5),
					txtCol("trolly_no", "Trolly No", 10, 90, 1),
					...MEASURE_COLS,
				];
		}
	}, [view, dates]);

	const handleViewChange = useCallback((e: SelectChangeEvent<ViewKey>) => {
		setView(e.target.value as ViewKey);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, []);

	const viewSelect = (
		<FormControl size="small" sx={{ minWidth: 240 }}>
			<InputLabel id="assorting-report-view-label">Report</InputLabel>
			<Select<ViewKey>
				labelId="assorting-report-view-label"
				label="Report"
				value={view}
				onChange={handleViewChange}
			>
				{VIEW_KEYS.map((k) => (
					<MenuItem key={k} value={k}>
						{VIEW_TITLES[k]}
					</MenuItem>
				))}
			</Select>
		</FormControl>
	);

	const handleApply = useCallback((values: AssortingFilterValues) => {
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

	const handlePrint = useCallback(() => {
		const title = VIEW_TITLES[view];
		const branchPart = branchLabel ? `Branch: ${escapeHtml(branchLabel)} | ` : "";
		let body =
			`<h1>${escapeHtml(title)}</h1>` +
			`<div class="meta">${branchPart}From ${escapeHtml(filter.fromDate)} to ${escapeHtml(filter.toDate)}</div>`;
		body += `<table><thead><tr>`;
		outCols.forEach((c) => {
			body += `<th>${escapeHtml(c.header)}</th>`;
		});
		body += `</tr></thead><tbody>`;
		rows.forEach((r) => {
			const cls = r.isGrandTotal
				? ' class="grand-total"'
				: r.isDateTotal || r.isWorkerTotal
					? ' class="sub-total"'
					: "";
			body += `<tr${cls}>`;
			outCols.forEach((c) => {
				const v = c.value(r);
				body += c.text
					? `<td class="text">${escapeHtml(String(v ?? ""))}</td>`
					: `<td>${fmtNum(v)}</td>`;
			});
			body += `</tr>`;
		});
		body += `</tbody></table>`;
		// The pivot grows a column per day — portrait clips it past ~8 days.
		openPrintWindow(title, body, view === "dayPivot");
	}, [view, rows, outCols, branchLabel, filter.fromDate, filter.toDate]);

	const handleExcel = useCallback(() => {
		const branchPart = branchLabel ? `Branch: ${branchLabel} | ` : "";
		exportReportExcel<ReportRow>({
			title: `${VIEW_TITLES[view]} — ${branchPart}${filter.fromDate} to ${filter.toDate}`,
			sheetName: "Assorting Report",
			fileName: `assorting_${view}_${filter.fromDate}_${filter.toDate}.xlsx`,
			cols: outCols.map((c) => ({
				header: c.header,
				width: c.width,
				text: c.text,
				fmt: c.text ? undefined : "0.00",
				value: c.value,
			})),
			rows,
			rowKind: (r) =>
				r.isGrandTotal
					? "grand"
					: r.isDateTotal || r.isWorkerTotal
						? "total"
						: "normal",
		}).catch((err: unknown) => {
			const message =
				err instanceof Error ? err.message : "Error exporting Excel";
			setSnackbar({ open: true, message, severity: "error" });
		});
	}, [view, rows, outCols, branchLabel, filter.fromDate, filter.toDate]);

	const columns = useMemo<GridColDef<ReportRow>[]>(
		() =>
			outCols.map<GridColDef<ReportRow>>((c) => ({
				field: c.field,
				headerName: c.header,
				type: c.text ? "string" : "number",
				flex: c.flex,
				minWidth: c.minWidth,
				sortable: false,
				valueGetter: (_value, row: ReportRow) => c.value(row),
				...(c.text ? {} : { valueFormatter: (v: unknown) => fmtNum(v) }),
			})),
		[outCols],
	);

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

	const excelButton = (
		<Button variant="outlined" onClick={handleExcel} disabled={rows.length === 0}>
			Excel
		</Button>
	);

	const filterDialog = (
		<AssortingFilterDialog
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
		"& .assorting-row-subtotal": { bgcolor: "#bbdefb", fontWeight: 700 },
		"& .assorting-row-subtotal:hover": { bgcolor: "#bbdefb" },
		"& .assorting-row-grand-total": {
			bgcolor: "#0C3C60",
			color: "#fff",
			fontWeight: 700,
		},
		"& .assorting-row-grand-total:hover": { bgcolor: "#0C3C60" },
		"& .assorting-row-grand-total .MuiDataGrid-cell": { color: "#fff" },
	};

	return (
		<IndexWrapper
			title={VIEW_TITLES[view]}
			subtitle={subtitle}
			rows={rows}
			columns={columns}
			rowCount={rows.length}
			paginationModel={paginationModel}
			onPaginationModelChange={setPaginationModel}
			loading={loading}
			showLoadingUntilLoaded
			toolbarContent={viewSelect}
			extraActions={
				<>
					{excelButton}
					{printButton}
					{filterButton}
				</>
			}
			getRowClassName={(params) => {
				const r = params.row as ReportRow;
				if (r.isGrandTotal) return "assorting-row-grand-total";
				if (r.isDateTotal || r.isWorkerTotal) return "assorting-row-subtotal";
				return "";
			}}
			extraSx={totalRowSx}
		>
			{filterDialog}
			{snackbarEl}
		</IndexWrapper>
	);
}
