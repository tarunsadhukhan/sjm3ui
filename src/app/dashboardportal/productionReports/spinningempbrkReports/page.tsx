"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Snackbar, Alert, Button } from "@mui/material";
import {
	GridColDef,
	GridColumnGroupingModel,
	GridPaginationModel,
} from "@mui/x-data-grid";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContextSafe } from "@/components/dashboard/sidebarContext";
import {
	fetchSpinningEmpBrkDetail,
	fetchShiftOptions,
} from "@/utils/spinningEmpBrkReportService";
import type {
	SpinningEmpBrkRow,
	ShiftOption,
} from "./types/spinningEmpBrkReportTypes";
import {
	exportReportExcel,
	type ExcelReportCol,
} from "@/utils/excelReportExport";
import SpinningEmpBrkFilterDialog, {
	type SpinningEmpBrkFilterValues,
	getDefaultFromDate,
	getDefaultToDate,
} from "./SpinningEmpBrkFilterDialog";

const TITLE = "Spinning Efficiency (Employee / Frame Break-up)";

type Row = SpinningEmpBrkRow & { id: string };

const NA = "#N/A";

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
  table { border-collapse: collapse; width: 100%; font-size: 11px; }
  th, td { border: 1px solid #999; padding: 3px 5px; text-align: right; }
  th { background: #3ea6da; color: #fff; font-weight: 700; text-align: center; }
  td.text { text-align: left; }
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

export default function SpinningEmpBrkReportsPage() {
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

	const [rows, setRows] = useState<Row[]>([]);
	const [shiftOptions, setShiftOptions] = useState<ShiftOption[]>([]);
	const [loading, setLoading] = useState(false);
	const [filter, setFilter] = useState<SpinningEmpBrkFilterValues>(() => ({
		fromDate: getDefaultFromDate(),
		toDate: getDefaultToDate(),
		shiftId: null,
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
			const data = await fetchSpinningEmpBrkDetail(
				branchId,
				filter.fromDate,
				filter.toDate,
				filter.shiftId,
			);
			setRows(
				data.map((r, idx) => ({
					...r,
					id: `${r.report_date}_${r.spell_id ?? "s"}_${r.frame_no ?? "f"}_${idx}`,
				})),
			);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching report";
			setSnackbar({ open: true, message, severity: "error" });
			setRows([]);
		} finally {
			setLoading(false);
		}
	}, [branchId, filter.fromDate, filter.toDate, filter.shiftId]);

	useEffect(() => {
		loadReport();
	}, [loadReport]);

	useEffect(() => {
		if (!branchId) {
			setShiftOptions([]);
			return;
		}
		let cancelled = false;
		fetchShiftOptions(branchId)
			.then((opts) => {
				if (!cancelled) setShiftOptions(opts);
			})
			.catch(() => {
				if (!cancelled) setShiftOptions([]);
			});
		return () => {
			cancelled = true;
		};
	}, [branchId]);

	const handleApply = useCallback((values: SpinningEmpBrkFilterValues) => {
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

	const shiftLabel = useMemo(() => {
		if (filter.shiftId == null) return "All Shifts";
		return (
			shiftOptions.find((s) => s.shift_id === filter.shiftId)?.shift_name ??
			String(filter.shiftId)
		);
	}, [filter.shiftId, shiftOptions]);

	const handlePrint = useCallback(() => {
		const branchPart = branchLabel ? `Branch: ${escapeHtml(branchLabel)} | ` : "";
		let body = `<h1>${escapeHtml(TITLE)}</h1>`;
		body += `<div class="meta">${branchPart}Shift: ${escapeHtml(shiftLabel)} | From ${escapeHtml(filter.fromDate)} to ${escapeHtml(filter.toDate)}</div>`;
		body += `<table><thead>`;
		body +=
			`<tr>` +
			`<th rowspan="2">Date</th>` +
			`<th rowspan="2">Shift</th>` +
			`<th rowspan="2">Emp Id</th>` +
			`<th rowspan="2">Employee's Name</th>` +
			`<th rowspan="2">Frame No</th>` +
			`<th rowspan="2">Count</th>` +
			`<th rowspan="2">W.Hours</th>` +
			`<th rowspan="2">As per VVFD Hrs</th>` +
			`<th colspan="5">Loss Hrs</th>` +
			`<th rowspan="2">Total Loss Hrs</th>` +
			`<th rowspan="2">Actual Run Hrs</th>` +
			`<th rowspan="2">No of Doff</th>` +
			`<th rowspan="2">Doff Wt</th>` +
			`<th rowspan="2">RPM</th>` +
			`<th rowspan="2">Effcy 100%</th>` +
			`<th rowspan="2">Actual Effcy</th>` +
			`<th rowspan="2">Running Effcy</th>` +
			`<th rowspan="2">Emp Eff (15D)</th>` +
			`<th rowspan="2">Frame Eff (15D)</th>` +
			`</tr>`;
		body += `<tr><th>D</th><th>M</th><th>E</th><th>O</th><th>IDLE</th></tr>`;
		body += `</thead><tbody>`;
		rows.forEach((r) => {
			body +=
				`<tr>` +
				`<td class="text">${escapeHtml(r.report_date)}</td>` +
				`<td class="text">${escapeHtml(r.shift_name ?? "")}</td>` +
				`<td class="text">${escapeHtml(r.emp_code ?? NA)}</td>` +
				`<td class="text">${escapeHtml(r.emp_name ?? "")}</td>` +
				`<td class="text">${escapeHtml(r.frame_no ?? "")}</td>` +
				`<td>${fmtNum(r.count)}</td>` +
				`<td>${fmtNum(r.power_min)}</td>` +
				`<td>${fmtNum(r.As_per_VVfd)}</td>` +
				`<td>${fmtNum(r.loss_d)}</td>` +
				`<td>${fmtNum(r.loss_m)}</td>` +
				`<td>${fmtNum(r.loss_e)}</td>` +
				`<td>${fmtNum(r.loss_i)}</td>` +
				`<td>${fmtNum(r.loss_idle)}</td>` +
				`<td>${fmtNum(r.total_loss)}</td>` +
				`<td>${fmtNum(r.actual_run)}</td>` +
				`<td>${fmtNum(r.machine_doff)}</td>` +
				`<td>${fmtNum(r.doff_wt)}</td>` +
				`<td>${fmtNum(r.rpm)}</td>` +
				`<td>${fmtNum(r.eff_100)}</td>` +
				`<td>${fmtNum(r.actual_eff)}</td>` +
				`<td>${fmtNum(r.run_eff)}</td>` +
				`<td>${fmtNum(r.emp_eff_15d)}</td>` +
				`<td>${fmtNum(r.frame_eff_15d)}</td>` +
				`</tr>`;
		});
		body += `</tbody></table>`;
		openPrintWindow(TITLE, body);
	}, [rows, branchLabel, shiftLabel, filter.fromDate, filter.toDate]);

	const handleExportExcel = useCallback(async () => {
		const num =
			(key: keyof Row) =>
			(r: Row): unknown =>
				r[key];
		const cols: Array<ExcelReportCol<Row>> = [
			{ header: "Date", value: (r) => r.report_date, text: true, width: 12 },
			{ header: "Shift", value: (r) => r.shift_name, text: true, width: 9 },
			{ header: "Emp Id", value: (r) => r.emp_code ?? NA, text: true, width: 10 },
			{ header: "Employee's Name", value: (r) => r.emp_name, text: true, width: 24 },
			{ header: "Frame No", value: (r) => r.frame_no, text: true, width: 11 },
			{ header: "Count", value: num("count"), fmt: "0.00", width: 9 },
			{ header: "W. Hours", value: num("power_min"), width: 10 },
			{ header: "As per VVFD Hrs", value: num("As_per_VVfd"), width: 12 },
			{ header: "D", value: num("loss_d"), width: 7, group: "Loss Min" },
			{ header: "M", value: num("loss_m"), width: 7, group: "Loss Min" },
			{ header: "E", value: num("loss_e"), width: 7, group: "Loss Min" },
			{ header: "O", value: num("loss_i"), width: 7, group: "Loss Min" },
			{ header: "IDLE", value: num("loss_idle"), width: 8, group: "Loss Min" },
			{ header: "Total Loss Hrs", value: num("total_loss"), width: 13 },
			{ header: "Actual Run Hrs", value: num("actual_run"), width: 13 },
			{ header: "No of Doff", value: num("machine_doff"), width: 12 },
			{ header: "Doff Wt", value: num("doff_wt"), fmt: "0.00", width: 10 },
			{ header: "RPM", value: num("rpm"), width: 9 },
			{ header: "Effcy 100%", value: num("eff_100"), width: 11 },
			{ header: "Actual Effcy", value: num("actual_eff"), fmt: "0.00", width: 11 },
			{ header: "Running Effcy", value: num("run_eff"), fmt: "0.00", width: 12 },
			{ header: "Emp Eff (15D)", value: num("emp_eff_15d"), fmt: "0.00", width: 12 },
			{
				header: "Frame Eff (15D)",
				value: num("frame_eff_15d"),
				fmt: "0.00",
				width: 13,
			},
		];

		// Shift-major: one section per shift name in A, B1, B2, C order.
		const shiftKey = (r: Row) => r.shift_name ?? String(r.spell_id ?? "");
		const exportRows = [...rows].sort(
			(a, b) =>
				shiftKey(a).localeCompare(shiftKey(b), undefined, { numeric: true }) ||
				a.report_date.localeCompare(b.report_date) ||
				(a.frame_no ?? "").localeCompare(b.frame_no ?? "", undefined, {
					numeric: true,
				}),
		);

		const branchPart = branchLabel ? `Branch: ${branchLabel} | ` : "";
		await exportReportExcel<Row>({
			// Each repeated header names its own section's shift.
			title: (r) =>
				`${TITLE} — ${branchPart}Shift: ${r.shift_name ?? shiftLabel} | ${filter.fromDate} to ${filter.toDate}`,
			sheetName: "Spinning Eff",
			fileName: `SpinningEff_${filter.fromDate}_to_${filter.toDate}.xlsx`,
			cols,
			rows: exportRows,
			// New section (3 blank rows + repeated header) on each shift change.
			groupBy: shiftKey,
		});
	}, [rows, branchLabel, shiftLabel, filter.fromDate, filter.toDate]);

	const columns = useMemo<GridColDef<Row>[]>(() => {
		const num = (
			field: keyof Row,
			header: string,
			minWidth = 80,
		): GridColDef<Row> => ({
			field: field as string,
			headerName: header,
			type: "number",
			flex: 1,
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
				field: "shift_name",
				headerName: "Shift",
				flex: 1,
				minWidth: 70,
				sortable: false,
			},
			{
				field: "emp_code",
				headerName: "Emp Id",
				flex: 1,
				minWidth: 80,
				sortable: false,
				valueFormatter: (value: unknown) => (value == null ? NA : String(value)),
			},
			{
				field: "emp_name",
				headerName: "Employee's Name",
				flex: 2,
				minWidth: 170,
				sortable: false,
			},
			{
				field: "frame_no",
				headerName: "Frame No",
				flex: 1,
				minWidth: 80,
				sortable: false,
			},
			num("count", "Count", 75),
			num("power_min", "Work Hours", 90),
			num("As_per_VVfd", "As per VVFD Hrs", 100),
			num("loss_d", "D", 60),
			num("loss_m", "M", 60),
			num("loss_e", "E", 60),
			num("loss_i", "O", 60),
			num("loss_idle", "IDLE", 70),
			num("total_loss", "Total Loss Hrs", 110),
			num("actual_run", "Actual Run Hrs", 110),
			num("machine_doff", "No of Doff", 100),
			num("doff_wt", "Doff Wt", 85),
			num("rpm", "RPM", 80),
			num("eff_100", "Effcy 100%", 95),
			num("actual_eff", "Actual Effcy", 100),
			num("run_eff", "Running Effcy", 105),
			num("emp_eff_15d", "Emp Eff (15D)", 105),
			num("frame_eff_15d", "Frame Eff (15D)", 115),
		];
	}, []);

	const groupingModel = useMemo<GridColumnGroupingModel>(
		() => [
			{
				groupId: "g_loss",
				headerName: "Loss Min",
				children: [
					{ field: "loss_d" },
					{ field: "loss_m" },
					{ field: "loss_e" },
					{ field: "loss_i" },
					{ field: "loss_idle" },
				],
			},
		],
		[],
	);

	const subtitle = !mounted
		? " "
		: branchId
			? `Branch: ${branchLabel} | Shift: ${shiftLabel} | ${filter.fromDate} to ${filter.toDate}`
			: "Select a company / branch from the sidebar";

	return (
		<IndexWrapper
			title={TITLE}
			subtitle={subtitle}
			rows={rows}
			columns={columns}
			rowCount={rows.length}
			paginationModel={paginationModel}
			onPaginationModelChange={setPaginationModel}
			loading={loading}
			showLoadingUntilLoaded
			columnGroupingModel={groupingModel}
			extraActions={
				<>
					<Button variant="outlined" onClick={handleExportExcel}>
						Excel
					</Button>
					<Button variant="outlined" onClick={handlePrint}>
						Print
					</Button>
					<Button variant="outlined" onClick={() => setFilterDialogOpen(true)}>
						Filter
					</Button>
				</>
			}
		>
			<SpinningEmpBrkFilterDialog
				open={filterDialogOpen}
				onClose={() => setFilterDialogOpen(false)}
				onApply={handleApply}
				initial={filter}
				shiftOptions={shiftOptions}
				title={`Filter — ${TITLE}`}
			/>
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
		</IndexWrapper>
	);
}
