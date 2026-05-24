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
import { fetchJuteSummaryReport, fetchJuteDetailsReport } from "@/utils/juteReportService";
import type {
	JuteSummaryReportRow,
	JuteDetailsReportRow,
} from "@/app/dashboardportal/jutePurchase/reports/types/reportTypes";
import JuteSummaryFilterDialog, {
	type JuteSummaryFilterValues,
	getDefaultFromDate,
	getDefaultToDate,
} from "./JuteSummaryFilterDialog";

type Row = JuteSummaryReportRow & { id: string };

type DetailsRow = {
	id: string;
	report_date: string;
	quality_name: string;
	opening: number;
	purchase: number;
	issue: number;
	closing: number;
	isTotal: boolean;
};

// Day-wise pivot: one row per quality, columns pivot per date with Recvd/Issue
// sub-columns, plus Total and Average column-groups at the right.
type DayWiseRow = {
	id: string;
	quality_name: string;
	isGrandTotal?: boolean;
	[key: string]: string | number | boolean | undefined; // d{idx}_recvd, d{idx}_issue, total_*, avg_*
};

type ViewKey = "summary" | "details" | "daywise";

const VIEW_TITLES: Record<ViewKey, string> = {
	summary: "Jute Summary Report",
	details: "Jute Details Report",
	daywise: "Jute Day wise Report",
};

const fmtWeight = (value: unknown): string => {
	if (value == null) return "";
	const n = Number(value);
	return Number.isFinite(n) ? n.toFixed(3) : "";
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
  tr.subtotal td { background: #bbdefb; font-weight: 700; }
  tr.grand-total td { background: #0C3C60; color: #fff; font-weight: 700; }
  tr.avg td { background: #e1f5fe; font-weight: 700; }
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

// Day-wise pivot: rows are qualities, each date becomes a column-group of
// (Recvd, Issue). Plus Total and Average column-groups across all dates.
function pivotDayWise(rows: JuteDetailsReportRow[]): {
	dates: string[];
	rows: DayWiseRow[];
} {
	const dateOrder: string[] = [];
	const seenDate = new Set<string>();
	type Cell = { recvd: number; issue: number };
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
			recvd: Number(r.purchase) || 0,
			issue: Number(r.issue) || 0,
		});
	});

	const out: DayWiseRow[] = Array.from(qualities.entries())
		.sort((a, b) => a[1].quality_name.localeCompare(b[1].quality_name))
		.map(([quality_id, { quality_name, cells }]) => {
			const row: DayWiseRow = { id: String(quality_id), quality_name };
			let totalRecvd = 0;
			let totalIssue = 0;
			let nRecvd = 0;
			let nIssue = 0;
			dateOrder.forEach((d, idx) => {
				const c = cells.get(d) ?? { recvd: 0, issue: 0 };
				row[`d${idx}_recvd`] = c.recvd;
				row[`d${idx}_issue`] = c.issue;
				totalRecvd += c.recvd;
				totalIssue += c.issue;
				if (c.recvd > 0) nRecvd += 1;
				if (c.issue > 0) nIssue += 1;
			});
			row.total_recvd = totalRecvd;
			row.total_issue = totalIssue;
			// Average only over days where the corresponding value is > 0.
			row.avg_recvd = nRecvd > 0 ? totalRecvd / nRecvd : 0;
			row.avg_issue = nIssue > 0 ? totalIssue / nIssue : 0;
			return row;
		});

	// Grand-total row across all qualities, one set of totals per date column.
	if (out.length > 0 && dateOrder.length > 0) {
		const grand: DayWiseRow = { id: "__GRAND_TOTAL__", quality_name: "Grand Total", isGrandTotal: true };
		let gTotalRecvd = 0;
		let gTotalIssue = 0;
		let gNRecvd = 0;
		let gNIssue = 0;
		dateOrder.forEach((_, idx) => {
			const dRecvd = out.reduce(
				(s, r) => s + (Number(r[`d${idx}_recvd`]) || 0),
				0,
			);
			const dIssue = out.reduce(
				(s, r) => s + (Number(r[`d${idx}_issue`]) || 0),
				0,
			);
			grand[`d${idx}_recvd`] = dRecvd;
			grand[`d${idx}_issue`] = dIssue;
			gTotalRecvd += dRecvd;
			gTotalIssue += dIssue;
			if (dRecvd > 0) gNRecvd += 1;
			if (dIssue > 0) gNIssue += 1;
		});
		grand.total_recvd = gTotalRecvd;
		grand.total_issue = gTotalIssue;
		grand.avg_recvd = gNRecvd > 0 ? gTotalRecvd / gNRecvd : 0;
		grand.avg_issue = gNIssue > 0 ? gTotalIssue / gNIssue : 0;
		out.push(grand);
	}

	return { dates: dateOrder, rows: out };
}

// Group details rows by report_date and append a TOTAL row at the end of each group.
function buildDetailsRowsWithTotals(rows: JuteDetailsReportRow[]): DetailsRow[] {
	const out: DetailsRow[] = [];
	let currentDate: string | null = null;
	let groupStart = 0;
	const flushTotal = (date: string, fromIdx: number) => {
		let opening = 0,
			purchase = 0,
			issue = 0,
			closing = 0;
		for (let i = fromIdx; i < out.length; i++) {
			opening += Number(out[i].opening) || 0;
			purchase += Number(out[i].purchase) || 0;
			issue += Number(out[i].issue) || 0;
			closing += Number(out[i].closing) || 0;
		}
		out.push({
			id: `__TOTAL__${date}`,
			report_date: date,
			quality_name: "Total",
			opening,
			purchase,
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
			purchase: r.purchase,
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

export default function JuteSummaryReportPage() {
	const sidebar = useSidebarContextSafe();
	const selectedCompany = sidebar?.selectedCompany ?? null;
	const selectedBranches = sidebar?.selectedBranches ?? [];
	// sidebar state hydrates from localStorage on the client only — defer any
	// rendering that depends on it until after mount to avoid SSR hydration mismatch.
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

	const [view, setView] = useState<ViewKey>("summary");
	const [rows, setRows] = useState<Row[]>([]);
	const [detailsRows, setDetailsRows] = useState<DetailsRow[]>([]);
	const [dayWiseDates, setDayWiseDates] = useState<string[]>([]);
	const [dayWiseRows, setDayWiseRows] = useState<DayWiseRow[]>([]);
	const [chartOpen, setChartOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState<JuteSummaryFilterValues>(() => ({
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
			setRows([]);
			setDetailsRows([]);
			return;
		}
		if (!filter.fromDate || !filter.toDate) return;

		if (view === "summary") {
			setLoading(true);
			try {
				const data = await fetchJuteSummaryReport(branchId, filter.fromDate, filter.toDate);
				setRows(data.map((r) => ({ ...r, id: r.report_date })));
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "Error fetching report";
				setSnackbar({ open: true, message, severity: "error" });
				setRows([]);
			} finally {
				setLoading(false);
			}
			return;
		}

		if (view === "details") {
			setLoading(true);
			try {
				const data = await fetchJuteDetailsReport(branchId, filter.fromDate, filter.toDate);
				setDetailsRows(buildDetailsRowsWithTotals(data));
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "Error fetching report";
				setSnackbar({ open: true, message, severity: "error" });
				setDetailsRows([]);
			} finally {
				setLoading(false);
			}
			return;
		}

		if (view === "daywise") {
			setLoading(true);
			try {
				const data = await fetchJuteDetailsReport(branchId, filter.fromDate, filter.toDate);
				const pivot = pivotDayWise(data);
				setDayWiseDates(pivot.dates);
				setDayWiseRows(pivot.rows);
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "Error fetching report";
				setSnackbar({ open: true, message, severity: "error" });
				setDayWiseDates([]);
				setDayWiseRows([]);
			} finally {
				setLoading(false);
			}
			return;
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
		<FormControl size="small" sx={{ minWidth: 220 }}>
			<InputLabel id="jute-report-view-label">Report</InputLabel>
			<Select<ViewKey>
				labelId="jute-report-view-label"
				label="Report"
				value={view}
				onChange={handleViewChange}
			>
				<MenuItem value="summary">Jute Summary Report</MenuItem>
				<MenuItem value="details">Jute Details Report</MenuItem>
				<MenuItem value="daywise">Jute Day wise Report</MenuItem>
			</Select>
		</FormControl>
	);

	const handleApply = useCallback((values: JuteSummaryFilterValues) => {
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

	const totals = useMemo(() => {
		if (rows.length === 0) {
			return { opening: 0, purchase: 0, issue: 0, closing: 0, hasData: false };
		}
		const purchase = rows.reduce((acc, r) => acc + (Number(r.purchase) || 0), 0);
		const issue = rows.reduce((acc, r) => acc + (Number(r.issue) || 0), 0);
		return {
			opening: Number(rows[0].opening) || 0,
			purchase,
			issue,
			closing: Number(rows[rows.length - 1].closing) || 0,
			hasData: true,
		};
	}, [rows]);

	const handlePrint = useCallback(() => {
		const title = VIEW_TITLES[view];
		let body = `<h1>${escapeHtml(title)}</h1>` + buildMetaHtml();

		if (view === "summary") {
			body +=
				`<table><thead><tr>` +
				["Date", "Opening (kg)", "Purchase (kg)", "Issue (kg)", "Closing (kg)"]
					.map((h) => `<th>${h}</th>`)
					.join("") +
				`</tr></thead><tbody>`;
			rows.forEach((r) => {
				body +=
					`<tr><td class="text">${escapeHtml(r.report_date)}</td>` +
					`<td>${fmtWeight(r.opening)}</td>` +
					`<td>${fmtWeight(r.purchase)}</td>` +
					`<td>${fmtWeight(r.issue)}</td>` +
					`<td>${fmtWeight(r.closing)}</td></tr>`;
			});
			if (totals.hasData) {
				body +=
					`<tr class="grand-total"><td class="text">Grand Total</td>` +
					`<td>${fmtWeight(totals.opening)}</td>` +
					`<td>${fmtWeight(totals.purchase)}</td>` +
					`<td>${fmtWeight(totals.issue)}</td>` +
					`<td>${fmtWeight(totals.closing)}</td></tr>`;
			}
			body += `</tbody></table>`;
		} else if (view === "details") {
			body +=
				`<table><thead><tr>` +
				["Date", "Quality", "Opening (kg)", "Purchase (kg)", "Issue (kg)", "Closing (kg)"]
					.map((h) => `<th>${h}</th>`)
					.join("") +
				`</tr></thead><tbody>`;
			detailsRows.forEach((r) => {
				const cls = r.isTotal ? ' class="subtotal"' : "";
				body +=
					`<tr${cls}>` +
					`<td class="text">${escapeHtml(r.report_date)}</td>` +
					`<td class="text">${escapeHtml(r.quality_name)}</td>` +
					`<td>${fmtWeight(r.opening)}</td>` +
					`<td>${fmtWeight(r.purchase)}</td>` +
					`<td>${fmtWeight(r.issue)}</td>` +
					`<td>${fmtWeight(r.closing)}</td></tr>`;
			});
			body += `</tbody></table>`;
		} else {
			// daywise — two-row header, dynamic per-date columns + Total + Average.
			const dateGroups = dayWiseDates.map((d) => escapeHtml(d));
			body += `<table><thead>`;
			body +=
				`<tr><th rowspan="2">Quality</th>` +
				dateGroups.map((d) => `<th colspan="2">${d}</th>`).join("") +
				`<th colspan="2">Total</th><th colspan="2">Average</th></tr>`;
			const subHeaders = dateGroups
				.map(() => `<th>Recvd</th><th>Issue</th>`)
				.join("");
			body +=
				`<tr>${subHeaders}` +
				`<th>Recvd</th><th>Issue</th><th>Recvd</th><th>Issue</th></tr>`;
			body += `</thead><tbody>`;
			dayWiseRows.forEach((r) => {
				const cls = r.isGrandTotal ? ' class="grand-total"' : "";
				let tds = `<td class="text">${escapeHtml(r.quality_name)}</td>`;
				dayWiseDates.forEach((_, idx) => {
					tds += `<td>${fmtWeight(r[`d${idx}_recvd`])}</td>`;
					tds += `<td>${fmtWeight(r[`d${idx}_issue`])}</td>`;
				});
				tds +=
					`<td>${fmtWeight(r.total_recvd)}</td>` +
					`<td>${fmtWeight(r.total_issue)}</td>` +
					`<td>${fmtWeight(r.avg_recvd)}</td>` +
					`<td>${fmtWeight(r.avg_issue)}</td>`;
				body += `<tr${cls}>${tds}</tr>`;
			});
			body += `</tbody></table>`;
		}

		openPrintWindow(title, body);
	}, [view, rows, totals, detailsRows, dayWiseDates, dayWiseRows, buildMetaHtml]);

	const printButton = (
		<Button variant="outlined" onClick={handlePrint}>
			Print
		</Button>
	);

	const dayWiseColumns = useMemo<GridColDef<DayWiseRow>[]>(() => {
		const qualityCol: GridColDef<DayWiseRow> = {
			field: "quality_name",
			headerName: "Quality",
			width: 180,
			sortable: false,
		};
		const numCol = (field: string): GridColDef<DayWiseRow> => ({
			field,
			headerName: field.endsWith("_recvd") ? "Recvd" : "Issue",
			type: "number",
			width: 100,
			sortable: false,
			valueFormatter: (value: unknown) => fmtWeight(value),
		});
		const dateCols: GridColDef<DayWiseRow>[] = dayWiseDates.flatMap((_, idx) => [
			numCol(`d${idx}_recvd`),
			numCol(`d${idx}_issue`),
		]);
		const aggCols: GridColDef<DayWiseRow>[] = [
			numCol("total_recvd"),
			numCol("total_issue"),
			numCol("avg_recvd"),
			numCol("avg_issue"),
		];
		return [qualityCol, ...dateCols, ...aggCols];
	}, [dayWiseDates]);

	// Totals per date for the bar chart: sum Recvd / Issue across all qualities on each
	// date. Skip the Grand Total row so it isn't double-counted.
	const dayWiseChartTotals = useMemo(() => {
		const recvd: number[] = dayWiseDates.map(() => 0);
		const issue: number[] = dayWiseDates.map(() => 0);
		dayWiseRows.forEach((row) => {
			if (row.isGrandTotal) return;
			dayWiseDates.forEach((_, idx) => {
				recvd[idx] += Number(row[`d${idx}_recvd`]) || 0;
				issue[idx] += Number(row[`d${idx}_issue`]) || 0;
			});
		});
		return { recvd, issue };
	}, [dayWiseDates, dayWiseRows]);

	const dayWiseGroupingModel = useMemo<GridColumnGroupingModel>(() => {
		const dateGroups = dayWiseDates.map((d, idx) => ({
			groupId: `g_d${idx}`,
			headerName: d,
			children: [{ field: `d${idx}_recvd` }, { field: `d${idx}_issue` }],
		}));
		return [
			...dateGroups,
			{
				groupId: "g_total",
				headerName: "Total",
				children: [{ field: "total_recvd" }, { field: "total_issue" }],
			},
			{
				groupId: "g_avg",
				headerName: "Average",
				children: [{ field: "avg_recvd" }, { field: "avg_issue" }],
			},
		];
	}, [dayWiseDates]);

	const detailsColumns = useMemo<GridColDef<DetailsRow>[]>(
		() => [
			{ field: "report_date", headerName: "Date", flex: 0.8, minWidth: 120 },
			{ field: "quality_name", headerName: "Quality", flex: 1.2, minWidth: 160 },
			{
				field: "opening",
				headerName: "Opening (kg)",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtWeight(value),
			},
			{
				field: "purchase",
				headerName: "Purchase (kg)",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtWeight(value),
			},
			{
				field: "issue",
				headerName: "Issue (kg)",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtWeight(value),
			},
			{
				field: "closing",
				headerName: "Closing (kg)",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtWeight(value),
			},
		],
		[],
	);

	const columns = useMemo<GridColDef<Row>[]>(
		() => [
			{ field: "report_date", headerName: "Date", flex: 1, minWidth: 130 },
			{
				field: "opening",
				headerName: "Opening (kg)",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtWeight(value),
			},
			{
				field: "purchase",
				headerName: "Purchase (kg)",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtWeight(value),
			},
			{
				field: "issue",
				headerName: "Issue (kg)",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtWeight(value),
			},
			{
				field: "closing",
				headerName: "Closing (kg)",
				type: "number",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: unknown) => fmtWeight(value),
			},
		],
		[],
	);

	const subtitle =
		!mounted
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
		<JuteSummaryFilterDialog
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

	if (view === "summary") {
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
									opening: totals.opening,
									purchase: totals.purchase,
									issue: totals.issue,
									closing: totals.closing,
								},
							]}
							columns={columns}
							hideFooter
							disableColumnMenu
							disableColumnSorting
							disableRowSelectionOnClick
							columnHeaderHeight={0}
							rowHeight={48}
							sx={{
								"& .MuiDataGrid-columnHeaders": { display: "none" },
								"& .MuiDataGrid-row": {
									bgcolor: "#0C3C60",
								},
								"& .MuiDataGrid-cell": {
									color: "#fff",
									fontWeight: 700,
									borderBottom: "none",
								},
								"& .MuiDataGrid-row:hover": {
									bgcolor: "#0C3C60",
								},
							}}
						/>
					) : null}
				</Box>

				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	if (view === "details") {
		return (
			<IndexWrapper
				title={VIEW_TITLES[view]}
				subtitle={subtitle}
				rows={detailsRows}
				columns={detailsColumns}
				rowCount={detailsRows.length}
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
					(params.row as DetailsRow).isTotal ? "jute-row-total" : ""
				}
				extraSx={{
					"& .jute-row-total": {
						bgcolor: "#bbdefb",
						fontWeight: 700,
					},
					"& .jute-row-total:hover": {
						bgcolor: "#bbdefb",
					},
				}}
			>
				{filterDialog}
				{snackbarEl}
			</IndexWrapper>
		);
	}

	// view === "daywise"
	const chartButton = (
		<Button
			variant="outlined"
			color="primary"
			onClick={() => setChartOpen(true)}
			disabled={dayWiseDates.length === 0}
		>
			Bar Chart
		</Button>
	);

	const chartDialog = (
		<Dialog open={chartOpen} onClose={() => setChartOpen(false)} maxWidth="lg" fullWidth>
			<DialogTitle>Jute Day-wise — Recvd vs Issue</DialogTitle>
			<DialogContent dividers>
				{dayWiseDates.length === 0 ? (
					<Typography color="text.secondary" sx={{ p: 4, textAlign: "center" }}>
						No data to chart for the selected range.
					</Typography>
				) : (
					<Box sx={{ width: "100%" }}>
						<BarChart
							xAxis={[
								{
									data: dayWiseDates,
									scaleType: "band",
									label: "Date",
								},
							]}
							yAxis={[{ label: "Weight (kg)" }]}
							series={[
								{
									data: dayWiseChartTotals.recvd,
									label: "Recvd",
									color: "#1976d2",
									valueFormatter: (v) =>
										v == null ? "" : `${Number(v).toFixed(3)} kg`,
								},
								{
									data: dayWiseChartTotals.issue,
									label: "Issue",
									color: "#e53935",
									valueFormatter: (v) =>
										v == null ? "" : `${Number(v).toFixed(3)} kg`,
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
			rows={dayWiseRows}
			columns={dayWiseColumns}
			rowCount={dayWiseRows.length}
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
			columnGroupingModel={dayWiseGroupingModel}
			getRowClassName={(params) =>
				(params.row as DayWiseRow).isGrandTotal ? "jute-row-total" : ""
			}
			extraSx={{
				"& .jute-row-total": {
					bgcolor: "#bbdefb",
					fontWeight: 700,
				},
				"& .jute-row-total:hover": { bgcolor: "#bbdefb" },
			}}
		>
			{chartDialog}
			{filterDialog}
			{snackbarEl}
		</IndexWrapper>
	);
}
