"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Snackbar, Alert, Button } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import MisReportFilterDialog, {
	type MisReportFilterValues,
	getDefaultAsOfDate,
} from "./MisReportFilterDialog";

type Period = { label: string; sub: string };

type ReportRow = {
	sl_no: number | string;
	label: string;
	values: number[];
};

type Section = {
	title: string;
	rows: ReportRow[];
	page_break_before?: boolean;
};

type ReportResponse = {
	company_name: string;
	as_of_date: string;
	periods: Period[];
	sections: Section[];
};

type GridRow = {
	id: string;
	is_section: boolean;
	sl_no: string | number;
	label: string;
	[key: string]: unknown;
};

function getCoId(): string {
	if (typeof window === "undefined") return "";
	const raw = localStorage.getItem("sidebar_selectedCompany");
	if (!raw) return "";
	try {
		return JSON.parse(raw).co_id?.toString() ?? "";
	} catch {
		return "";
	}
}

function getBranchIds(): string {
	if (typeof window === "undefined") return "";
	const raw = localStorage.getItem("sidebar_selectedBranches");
	if (!raw) return "";
	try {
		const branches = JSON.parse(raw) as number[];
		return Array.isArray(branches) && branches.length > 0
			? branches.join(",")
			: "";
	} catch {
		return "";
	}
}

function formatNum(v: unknown): string {
	const n = typeof v === "number" ? v : Number(v);
	if (!isFinite(n) || n === 0) return "";
	return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function MisReportPage() {
	const [filterValues, setFilterValues] = useState<MisReportFilterValues>(() => ({
		asOfDate: getDefaultAsOfDate(),
	}));
	const [filterDialogOpen, setFilterDialogOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [downloading, setDownloading] = useState<"" | "pdf" | "excel">("");
	const [report, setReport] = useState<ReportResponse | null>(null);
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		pageSize: 100,
		page: 0,
	});
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const handleSnackbarClose = useCallback(
		() => setSnackbar((p) => ({ ...p, open: false })),
		[]
	);

	const buildQuery = useCallback((): URLSearchParams | null => {
		const co_id = getCoId();
		if (!co_id) {
			setSnackbar({ open: true, message: "No company selected", severity: "error" });
			return null;
		}
		if (!filterValues.asOfDate) {
			setSnackbar({ open: true, message: "As-of date is required", severity: "error" });
			return null;
		}
		const params = new URLSearchParams({
			co_id,
			as_of_date: filterValues.asOfDate,
		});
		const branch_id = getBranchIds();
		if (branch_id) params.append("branch_id", branch_id);
		return params;
	}, [filterValues.asOfDate]);

	const loadReport = useCallback(async () => {
		const params = buildQuery();
		if (!params) return;

		setLoading(true);
		setReport(null);
		try {
			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.MIS_REPORT}?${params}`,
				"GET"
			);
			if (error || !data) throw new Error(error || "Failed to load report");
			setReport(data as ReportResponse);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error loading report";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [buildQuery]);

	useEffect(() => {
		loadReport();
	}, [loadReport]);

	const gridRows = useMemo<GridRow[]>(() => {
		if (!report) return [];
		const out: GridRow[] = [];
		report.sections.forEach((section, sIdx) => {
			out.push({
				id: `section-${sIdx}`,
				is_section: true,
				sl_no: "",
				label: section.title,
			});
			section.rows.forEach((row, rIdx) => {
				const r: GridRow = {
					id: `row-${sIdx}-${rIdx}`,
					is_section: false,
					sl_no: row.sl_no ?? "",
					label: row.label,
				};
				row.values.forEach((v, vIdx) => {
					r[`p${vIdx}`] = v;
				});
				out.push(r);
			});
		});
		return out;
	}, [report]);

	const gridColumns = useMemo<GridColDef<GridRow>[]>(() => {
		if (!report) return [];
		const fixed: GridColDef<GridRow>[] = [
			{
				field: "sl_no",
				headerName: "Sl.No",
				width: 70,
				sortable: false,
				disableColumnMenu: true,
			},
			{
				field: "label",
				headerName: "Particulars",
				width: 280,
				sortable: false,
				disableColumnMenu: true,
			},
		];
		const periodCols: GridColDef<GridRow>[] = report.periods.map((p, i) => ({
			field: `p${i}`,
			headerName: p.sub,
			minWidth: 120,
			flex: 1,
			align: "right",
			headerAlign: "center",
			sortable: false,
			disableColumnMenu: true,
			type: "number",
			valueFormatter: (v: unknown) => formatNum(v),
		}));
		return [...fixed, ...periodCols];
	}, [report]);

	const handleApplyFilter = useCallback((values: MisReportFilterValues) => {
		setFilterValues(values);
	}, []);

	const handleDownloadPdf = useCallback(async () => {
		const params = buildQuery();
		if (!params) return;
		setDownloading("pdf");
		try {
			const res = await fetch(
				`${apiRoutesPortalMasters.MIS_REPORT_PDF}?${params}`,
				{ method: "GET", credentials: "include" }
			);
			if (!res.ok) throw new Error(`Download failed (${res.status})`);
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `mis_report_${filterValues.asOfDate}.pdf`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (err: unknown) {
			setSnackbar({
				open: true,
				message: err instanceof Error ? err.message : "PDF download failed",
				severity: "error",
			});
		} finally {
			setDownloading("");
		}
	}, [buildQuery, filterValues.asOfDate]);

	const handleDownloadExcel = useCallback(async () => {
		if (!report) {
			setSnackbar({
				open: true,
				message: "Run the report first",
				severity: "error",
			});
			return;
		}
		setDownloading("excel");
		try {
			const ExcelJS = (await import("exceljs")).default;
			const { saveAs } = await import("file-saver");

			const wb = new ExcelJS.Workbook();
			const ws = wb.addWorksheet("MIS Report");

			const numPeriods = report.periods.length;
			const totalCols = 2 + numPeriods;

			// Title
			ws.mergeCells(1, 1, 1, totalCols);
			const title = ws.getCell(1, 1);
			title.value = report.company_name;
			title.font = { bold: true, size: 14, color: { argb: "FF0C3C60" } };
			title.alignment = { horizontal: "center", vertical: "middle" };
			ws.getRow(1).height = 22;

			ws.mergeCells(2, 1, 2, totalCols);
			const sub = ws.getCell(2, 1);
			sub.value = `MIS Report — As of ${report.as_of_date}`;
			sub.font = { italic: true, size: 11 };
			sub.alignment = { horizontal: "center" };

			// Header row
			const headers = ["Sl.No", "Particulars", ...report.periods.map((p) => p.sub)];
			const headerRow = ws.addRow(headers);
			headerRow.eachCell((cell) => {
				cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FF3EA6DA" },
				};
				cell.alignment = {
					horizontal: "center",
					vertical: "middle",
					wrapText: true,
				};
				cell.border = {
					top: { style: "thin" },
					left: { style: "thin" },
					bottom: { style: "thin" },
					right: { style: "thin" },
				};
			});
			headerRow.height = 36;

			const border = {
				top: { style: "thin" as const },
				left: { style: "thin" as const },
				bottom: { style: "thin" as const },
				right: { style: "thin" as const },
			};

			for (const section of report.sections) {
				if (section.page_break_before && ws.rowCount > 3) {
					ws.getRow(ws.rowCount).addPageBreak();
				}
				const secRow = ws.addRow([section.title, ...Array(totalCols - 1).fill("")]);
				ws.mergeCells(secRow.number, 1, secRow.number, totalCols);
				const secCell = ws.getCell(secRow.number, 1);
				secCell.value = section.title;
				secCell.font = { bold: true };
				secCell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FFFCE5CD" },
				};
				secCell.border = border;

				for (const row of section.rows) {
					const dataRow = ws.addRow([
						row.sl_no ?? "",
						row.label,
						...row.values.map((v) => (v === 0 ? "" : v)),
					]);
					dataRow.eachCell({ includeEmpty: true }, (cell, colNo) => {
						cell.border = border;
						if (colNo >= 3) {
							cell.alignment = { horizontal: "right" };
							cell.numFmt = "#,##0.##";
						}
					});
				}
			}

			ws.getColumn(1).width = 8;
			ws.getColumn(2).width = 38;
			for (let i = 0; i < numPeriods; i++) {
				ws.getColumn(3 + i).width = 16;
			}
			ws.views = [{ state: "frozen", ySplit: 3 }];
			// A4 landscape, fit to one page wide, repeat header on every printed page
			ws.pageSetup.paperSize = 9; // A4
			ws.pageSetup.orientation = "landscape";
			ws.pageSetup.fitToPage = true;
			ws.pageSetup.fitToWidth = 1;
			ws.pageSetup.fitToHeight = 0;
			ws.pageSetup.horizontalCentered = true;
			ws.pageSetup.printTitlesRow = "1:3";

			const buf = await wb.xlsx.writeBuffer();
			const blob = new Blob([buf], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});
			saveAs(blob, `mis_report_${report.as_of_date}.xlsx`);
		} catch (err: unknown) {
			setSnackbar({
				open: true,
				message: err instanceof Error ? err.message : "Excel download failed",
				severity: "error",
			});
		} finally {
			setDownloading("");
		}
	}, [report]);

	return (
		<IndexWrapper
			title="MIS Report"
			subtitle={
				report
					? `${report.company_name} — As of ${report.as_of_date}`
					: undefined
			}
			rows={gridRows}
			columns={gridColumns}
			rowCount={gridRows.length}
			paginationModel={paginationModel}
			onPaginationModelChange={setPaginationModel}
			loading={loading}
			showLoadingUntilLoaded
			getRowClassName={(params) =>
				params.row.is_section ? "mis-section-row" : ""
			}
			extraSx={{
				"& .MuiDataGrid-columnHeaderTitle": {
					whiteSpace: "pre-line",
					lineHeight: 1.2,
					fontWeight: 600,
				},
				"& .MuiDataGrid-columnHeaders": {
					backgroundColor: "#B7E1CD",
				},
				"& .mis-section-row, & .mis-section-row .MuiDataGrid-cell": {
					backgroundColor: "#FCE5CD",
					fontWeight: "bold",
				},
			}}
			extraActions={
				<>
					<Button variant="outlined" onClick={() => setFilterDialogOpen(true)}>
						Filter
					</Button>
					<Button
						variant="contained"
						onClick={loadReport}
						disabled={loading}
					>
						{loading ? "Loading..." : "Submit"}
					</Button>
					<Button
						variant="outlined"
						color="primary"
						onClick={handleDownloadExcel}
						disabled={downloading !== "" || !report}
					>
						{downloading === "excel" ? "Generating..." : "Download Excel"}
					</Button>
					<Button
						variant="outlined"
						color="primary"
						onClick={handleDownloadPdf}
						disabled={downloading !== "" || !report}
					>
						{downloading === "pdf" ? "Generating..." : "Download PDF"}
					</Button>
				</>
			}
		>
			<MisReportFilterDialog
				open={filterDialogOpen}
				onClose={() => setFilterDialogOpen(false)}
				onApply={handleApplyFilter}
				initial={filterValues}
				title="Filter — MIS Report"
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
