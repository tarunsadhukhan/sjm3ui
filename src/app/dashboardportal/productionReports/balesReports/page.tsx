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
import { fetchBalesEntries } from "@/utils/balesReportService";
import type { BalesEntryRow } from "./types/balesReportTypes";
import BalesFilterDialog, {
	type BalesFilterValues,
	getDefaultFromDate,
	getDefaultToDate,
} from "./BalesFilterDialog";

type ViewKey = "entries";

const VIEW_TITLES: Record<ViewKey, string> = {
	entries: "Bales Report",
};

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

type EntryRow = BalesEntryRow & {
	id: string;
	isDateTotal?: boolean;
	isGrandTotal?: boolean;
};

// Build the inclusive [from, to] date range as dd-mm-yyyy strings (matches the
// report_date format emitted by the backend's DATE_FORMAT). `from` / `to` are
// passed in as 'YYYY-MM-DD'.
function buildPeriodDates(fromYmd: string, toYmd: string): string[] {
	if (!fromYmd || !toYmd) return [];
	const start = new Date(`${fromYmd}T00:00:00`);
	const end = new Date(`${toYmd}T00:00:00`);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
	const out: string[] = [];
	const cur = new Date(start);
	while (cur <= end) {
		const dd = String(cur.getDate()).padStart(2, "0");
		const mm = String(cur.getMonth() + 1).padStart(2, "0");
		const yyyy = cur.getFullYear();
		out.push(`${dd}-${mm}-${yyyy}`);
		cur.setDate(cur.getDate() + 1);
	}
	return out;
}

function buildRows(
	rows: BalesEntryRow[],
	fromYmd: string,
	toYmd: string,
): EntryRow[] {
	const periodDates = buildPeriodDates(fromYmd, toYmd);
	if (periodDates.length === 0 && rows.length === 0) return [];

	const byDate = new Map<string, BalesEntryRow[]>();
	rows.forEach((r) => {
		let bucket = byDate.get(r.report_date);
		if (!bucket) {
			bucket = [];
			byDate.set(r.report_date, bucket);
		}
		bucket.push(r);
	});

	// Union of explicit period dates + any data dates that fell outside the
	// period (shouldn't happen — SQL filters — but defensive).
	const dateOrder: string[] = [...periodDates];
	const seen = new Set(periodDates);
	byDate.forEach((_, d) => {
		if (!seen.has(d)) {
			seen.add(d);
			dateOrder.push(d);
		}
	});

	const out: EntryRow[] = [];
	const grand = { production: 0, issue: 0 };

	dateOrder.forEach((d) => {
		const bucket = byDate.get(d) ?? [];
		bucket.forEach((r, idx) =>
			out.push({
				...r,
				id: `${r.report_date}_${r.quality_id ?? "q"}_${r.customer_id ?? "c"}_${idx}`,
			}),
		);
		const sums = bucket.reduce(
			(acc, r) => {
				acc.opening += Number(r.opening) || 0;
				acc.production += Number(r.production) || 0;
				acc.issue += Number(r.issue) || 0;
				acc.closing += Number(r.closing) || 0;
				return acc;
			},
			{ opening: 0, production: 0, issue: 0, closing: 0 },
		);
		out.push({
			id: `__date_total__${d}`,
			report_date: d,
			quality_id: null,
			quality_name: "Total",
			customer_id: null,
			customer_name: "",
			opening: sums.opening,
			production: sums.production,
			issue: sums.issue,
			closing: sums.closing,
			isDateTotal: true,
		});
		grand.production += sums.production;
		grand.issue += sums.issue;
	});

	out.push({
		id: "__GRAND_TOTAL__",
		report_date: "Grand Total",
		quality_id: null,
		quality_name: "",
		customer_id: null,
		customer_name: "",
		opening: 0,
		production: grand.production,
		issue: grand.issue,
		closing: 0,
		isGrandTotal: true,
	});
	return out;
}

export default function BalesReportsPage() {
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
	const [rows, setRows] = useState<EntryRow[]>([]);
	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState<BalesFilterValues>(() => ({
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
			return;
		}
		if (!filter.fromDate || !filter.toDate) return;

		setLoading(true);
		try {
			const data = await fetchBalesEntries(
				branchId,
				filter.fromDate,
				filter.toDate,
			);
			setRows(buildRows(data, filter.fromDate, filter.toDate));
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching report";
			setSnackbar({ open: true, message, severity: "error" });
			setRows([]);
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
		<FormControl size="small" sx={{ minWidth: 220 }}>
			<InputLabel id="bales-report-view-label">Report</InputLabel>
			<Select<ViewKey>
				labelId="bales-report-view-label"
				label="Report"
				value={view}
				onChange={handleViewChange}
			>
				<MenuItem value="entries">Bales Report</MenuItem>
			</Select>
		</FormControl>
	);

	const handleApply = useCallback((values: BalesFilterValues) => {
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
			`<th>Date</th><th>Quality</th><th>Customer</th>` +
			`<th>Opening</th><th>Production</th><th>Issue</th><th>Closing</th>`;
		body += `</tr></thead><tbody>`;
		rows.forEach((r) => {
			const cls = r.isGrandTotal
				? ' class="grand-total"'
				: r.isDateTotal
					? ' class="date-total"'
					: "";
			body +=
				`<tr${cls}>` +
				`<td class="text">${escapeHtml(r.report_date)}</td>` +
				`<td class="text">${escapeHtml(r.quality_name ?? "")}</td>` +
				`<td class="text">${escapeHtml(r.customer_name ?? "")}</td>` +
				`<td>${r.isGrandTotal ? "" : fmtNum(r.opening)}</td>` +
				`<td>${fmtNum(r.production)}</td>` +
				`<td>${fmtNum(r.issue)}</td>` +
				`<td>${r.isGrandTotal ? "" : fmtNum(r.closing)}</td>` +
				`</tr>`;
		});
		body += `</tbody></table>`;
		openPrintWindow(title, body);
	}, [view, rows, buildMetaHtml]);

	const columns = useMemo<GridColDef<EntryRow>[]>(() => {
		const num = (
			field: keyof BalesEntryRow,
			header: string,
			minWidth = 100,
			flex = 1,
		): GridColDef<EntryRow> => ({
			field: field as string,
			headerName: header,
			type: "number",
			flex,
			minWidth,
			sortable: false,
			valueFormatter: (value: unknown, row: EntryRow) => {
				// Hide opening/closing on the grand-total row (running balances are
				// not summable in the same way as flows).
				if (
					row?.isGrandTotal &&
					(field === "opening" || field === "closing")
				) {
					return "";
				}
				return fmtNum(value);
			},
		});
		return [
			{
				field: "report_date",
				headerName: "Date",
				flex: 1,
				minWidth: 110,
				sortable: false,
			},
			{
				field: "quality_name",
				headerName: "Quality",
				flex: 2,
				minWidth: 180,
				sortable: false,
			},
			{
				field: "customer_name",
				headerName: "Customer",
				flex: 2,
				minWidth: 180,
				sortable: false,
			},
			num("opening", "Opening"),
			num("production", "Production", 110),
			num("issue", "Issue"),
			num("closing", "Closing"),
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
		<BalesFilterDialog
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
		"& .bales-row-date-total": { bgcolor: "#bbdefb", fontWeight: 700 },
		"& .bales-row-date-total:hover": { bgcolor: "#bbdefb" },
		"& .bales-row-grand-total": {
			bgcolor: "#0C3C60",
			color: "#fff",
			fontWeight: 700,
		},
		"& .bales-row-grand-total:hover": { bgcolor: "#0C3C60" },
		"& .bales-row-grand-total .MuiDataGrid-cell": { color: "#fff" },
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
					{printButton}
					{filterButton}
				</>
			}
			getRowClassName={(params) => {
				const r = params.row as EntryRow;
				if (r.isGrandTotal) return "bales-row-grand-total";
				if (r.isDateTotal) return "bales-row-date-total";
				return "";
			}}
			extraSx={totalRowSx}
		>
			{filterDialog}
			{snackbarEl}
		</IndexWrapper>
	);
}
