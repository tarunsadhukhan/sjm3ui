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
import { GridColDef, GridFilterModel, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import BioAttUploadDialog from "./BioAttUploadDialog";
import BioAttProcessDialog from "./BioAttProcessDialog";
import BioAttFinalProcessDialog from "./BioAttFinalProcessDialog";
import BioAttEtrackDialog from "./BioAttEtrackDialog";
import BioAttEtrackProcessDialog from "./BioAttEtrackProcessDialog";
import BioAttEtrackProcessDDialog from "./BioAttEtrackProcessDDialog";
import BioAttBprocessDialog from "./BioAttBprocessDialog";
import BioAttBAttenDialog from "./BioAttBAttenDialog";
import BioAttFilterDialog, {
	type BioAttFilterValues,
	getDefaultFromDate,
	getDefaultToDate,
} from "./BioAttFilterDialog";
import BioAttSqlCreateDialog from "./BioAttSqlCreateDialog";
import WagesRegisterTab from "./WagesRegisterTab";

type BioAttRow = {
	id: number;
	bio_att_id: number;
	emp_code: string;
	emp_anme: string;
	bio_id: number | null;
	log_date: string;
	company_name: string;
	department: string;
	designation: string;
	employement_type: string;
	device_direction: string;
	device_name: string;
	[key: string]: unknown;
};

type DailyAttRow = {
	id: number;
	daily_att_proc_id: number;
	eb_id: number | null;
	bio_id: number | null;
	emp_code: string;
	emp_name: string;
	department: string;
	designation: string;
	attendance_date: string;
	spell_name: string;
	attendance_type: string;
	attendance_source: string;
	check_in: string;
	check_out: string;
	Time_duration: number | null;
	Working_hours: number | null;
	Ot_hours: number | null;
	spell_start_time: string;
	spell_end_time: string;
	spell_hours: number | null;
	processed: number | null;
	device_name: string;
	[key: string]: unknown;
};

type TabKey = "bio" | "daily" | "wages";

export default function BioAttUpdationListPage() {
	const [activeTab, setActiveTab] = useState<TabKey>("bio");
	const [rows, setRows] = useState<BioAttRow[]>([]);
	const [dailyRows, setDailyRows] = useState<DailyAttRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalRows, setTotalRows] = useState(0);
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		pageSize: 10,
		page: 0,
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [] });
	const [dateFilter, setDateFilter] = useState<BioAttFilterValues>(() => ({
		fromDate: getDefaultFromDate(),
		toDate: getDefaultToDate(),
		ebNo: "",
	}));
	const [filterDialogOpen, setFilterDialogOpen] = useState(false);

	// Per-column filter params: each non-empty filter item becomes f_<field>=<value>.
	// Plus from_date/to_date and f_eb_id from the popup filter dialog.
	// Backend ANDs them together; orthogonal to the global `search` (search box).
	const appendFilterParams = useCallback(
		(qs: URLSearchParams) => {
			for (const item of filterModel.items ?? []) {
				if (!item.field || item.value == null) continue;
				const v = String(item.value).trim();
				if (!v) continue;
				qs.append(`f_${item.field}`, v);
			}
			if (dateFilter.fromDate) qs.append("from_date",   dateFilter.fromDate);
			if (dateFilter.toDate)   qs.append("to_date",     dateFilter.toDate);
			if (dateFilter.ebNo)     qs.append("emp_code_eq", dateFilter.ebNo);
		},
		[filterModel, dateFilter],
	);

	// Stable string representation for fetch dependency tracking.
	const filterKey = useMemo(
		() =>
			JSON.stringify({
				items: (filterModel.items ?? [])
					.filter((i) => i.field && i.value != null && String(i.value).trim() !== "")
					.map((i) => [i.field, String(i.value).trim()])
					.sort(),
				date: [dateFilter.fromDate, dateFilter.toDate, dateFilter.ebNo],
			}),
		[filterModel, dateFilter],
	);
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const [uploadOpen, setUploadOpen] = useState(false);
	const [sqlCreateOpen, setSqlCreateOpen] = useState(false);
	const [processOpen, setProcessOpen] = useState(false);
	const [finalProcessOpen, setFinalProcessOpen] = useState(false);
	const [etrackOpen, setEtrackOpen] = useState(false);
	const [etrackProcessOpen, setEtrackProcessOpen] = useState(false);
	const [etrackProcessDOpen, setEtrackProcessDOpen] = useState(false);
	const [bprocessOpen, setBprocessOpen] = useState(false);
	const [bAttenOpen, setBAttenOpen] = useState(false);

	const getCoId = useCallback((): string => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
	}, []);

	const fetchBioAtt = useCallback(async () => {
		setLoading(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const queryParams = new URLSearchParams({
				co_id,
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
			});
			if (searchQuery) queryParams.append("search", searchQuery);
			appendFilterParams(queryParams);

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.BIO_ATT_LIST}?${queryParams}`,
				"GET",
			);
			if (error || !data) throw new Error(error || "Failed to fetch bio attendance");

			const mapped: BioAttRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.bio_att_id as number,
					bio_att_id: r.bio_att_id as number,
					emp_code: (r.emp_code as string) ?? "",
					emp_anme: (r.emp_anme as string) ?? "",
					bio_id: (r.bio_id as number | null) ?? null,
					log_date: (r.log_date as string) ?? "",
					company_name: (r.company_name as string) ?? "",
					department: (r.department as string) ?? "",
					designation: (r.designation as string) ?? "",
					employement_type: (r.employement_type as string) ?? "",
					device_direction: (r.device_direction as string) ?? "",
					device_name: (r.device_name as string) ?? "",
				}),
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error fetching bio attendance";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, filterKey, appendFilterParams, getCoId]);

	const fetchDailyAtt = useCallback(async () => {
		setLoading(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const queryParams = new URLSearchParams({
				co_id,
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
			});
			if (searchQuery) queryParams.append("search", searchQuery);
			appendFilterParams(queryParams);

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.DAILY_ATT_LIST}?${queryParams}`,
				"GET",
			);
			if (error || !data) throw new Error(error || "Failed to fetch daily attendance");

			const mapped: DailyAttRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...(r as Record<string, unknown>),
					id: r.daily_att_proc_id as number,
					daily_att_proc_id: r.daily_att_proc_id as number,
					eb_id: (r.eb_id as number | null) ?? null,
					bio_id: (r.bio_id as number | null) ?? null,
					emp_code: (r.emp_code as string) ?? "",
					emp_name: (r.emp_name as string) ?? "",
					department: (r.department as string) ?? "",
					designation: (r.designation as string) ?? "",
					attendance_date: (r.attendance_date as string) ?? "",
					spell_name: (r.spell_name as string) ?? "",
					attendance_type: (r.attendance_type as string) ?? "",
					attendance_source: (r.attendance_source as string) ?? "",
					check_in: (r.check_in as string) ?? "",
					check_out: (r.check_out as string) ?? "",
					Time_duration: (r.Time_duration as number | null) ?? null,
					Working_hours: (r.Working_hours as number | null) ?? null,
					Ot_hours: (r.Ot_hours as number | null) ?? null,
					spell_start_time: (r.spell_start_time as string) ?? "",
					spell_end_time: (r.spell_end_time as string) ?? "",
					spell_hours: (r.spell_hours as number | null) ?? null,
					processed: (r.processed as number | null) ?? null,
					device_name: (r.device_name as string) ?? "",
				}),
			);

			setDailyRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error fetching daily attendance";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, filterKey, appendFilterParams, getCoId]);

	useEffect(() => {
		if (activeTab === "bio") {
			fetchBioAtt();
		} else if (activeTab === "daily") {
			fetchDailyAtt();
		}
	}, [activeTab, fetchBioAtt, fetchDailyAtt]);

	const handlePaginationModelChange = (newModel: GridPaginationModel) => {
		setPaginationModel(newModel);
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	};

	const handleSnackbarClose = () => {
		setSnackbar((prev) => ({ ...prev, open: false }));
	};

	const handleUploadClose = useCallback(() => setUploadOpen(false), []);
	const handleSqlCreateClose = useCallback(() => setSqlCreateOpen(false), []);
	// Action dropdown: one-shot trigger — value is never persisted, each
	// selection just opens the matching dialog.
	const handleActionSelect = useCallback((e: SelectChangeEvent<string>) => {
		const action = e.target.value;
		if (action === "sql_create") setSqlCreateOpen(true);
		else if (action === "excel_upload") setUploadOpen(true);
	}, []);
	const handleProcessClick = useCallback(() => setProcessOpen(true), []);
	const handleFinalProcessClick = useCallback(() => setFinalProcessOpen(true), []);
	const handleFinalProcessClose = useCallback(() => setFinalProcessOpen(false), []);
	const handleProcessClose = useCallback(() => setProcessOpen(false), []);
	const handleEtrackClick = useCallback(() => setEtrackOpen(true), []);
	const handleEtrackClose = useCallback(() => setEtrackOpen(false), []);
	const handleEtrackProcessClick = useCallback(() => setEtrackProcessOpen(true), []);
	const handleEtrackProcessClose = useCallback(() => setEtrackProcessOpen(false), []);
	const handleEtrackProcessDClick = useCallback(() => setEtrackProcessDOpen(true), []);
	const handleEtrackProcessDClose = useCallback(() => setEtrackProcessDOpen(false), []);
	const handleBprocessClick = useCallback(() => setBprocessOpen(true), []);
	const handleBprocessClose = useCallback(() => setBprocessOpen(false), []);
	const handleBAttenClick = useCallback(() => setBAttenOpen(true), []);
	const handleBAttenClose = useCallback(() => setBAttenOpen(false), []);
	const handleProcessSuccess = useCallback(
		(message: string) => {
			setSnackbar({ open: true, message, severity: "success" });
			if (activeTab === "bio") fetchBioAtt();
			else fetchDailyAtt();
		},
		[activeTab, fetchBioAtt, fetchDailyAtt],
	);

	const handleClearClick = useCallback(async () => {
		const co_id = getCoId();
		if (!co_id) {
			setSnackbar({ open: true, message: "No company selected", severity: "error" });
			return;
		}
		if (!window.confirm("Clear all rows from the staging (temp) table?")) return;
		try {
			const url = `${apiRoutesPortalMasters.BIO_ATT_CLEAR}?co_id=${encodeURIComponent(co_id)}`;
			const { data, error } = await fetchWithCookie<{ deleted: number }>(url, "POST");
			if (error || !data) {
				setSnackbar({ open: true, message: error ?? "Clear failed", severity: "error" });
				return;
			}
			setSnackbar({
				open: true,
				message: `Staging table cleared (${data.deleted} row(s) removed).`,
				severity: "success",
			});
		} catch (e) {
			setSnackbar({
				open: true,
				message: e instanceof Error ? e.message : String(e),
				severity: "error",
			});
		}
	}, [getCoId]);

	const columns = useMemo<GridColDef<BioAttRow>[]>(
		() => [
			{ field: "emp_code", headerName: "Emp Code", flex: 1, minWidth: 110 },
			{ field: "emp_anme", headerName: "Employee Name", flex: 1.5, minWidth: 160 },
			{ field: "bio_id", headerName: "Bio ID", flex: 0.8, minWidth: 90 },
			{ field: "log_date", headerName: "Log Date", flex: 1.4, minWidth: 160 },
			{ field: "department", headerName: "Department", flex: 1, minWidth: 120 },
			{ field: "designation", headerName: "Designation", flex: 1.2, minWidth: 140 },
			{ field: "device_direction", headerName: "Direction", flex: 0.7, minWidth: 90 },
			{ field: "device_name", headerName: "Device", flex: 1.2, minWidth: 140 },
		],
		[],
	);

	const dailyColumns = useMemo<GridColDef<DailyAttRow>[]>(
		() => [
			{ field: "daily_att_proc_id", headerName: "ID", flex: 0.6, minWidth: 80 },
			{ field: "emp_code", headerName: "Emp Code", flex: 0.9, minWidth: 110 },
			{ field: "emp_name", headerName: "Employee Name", flex: 1.4, minWidth: 160 },
			{ field: "department", headerName: "Department", flex: 1, minWidth: 120 },
			{ field: "designation", headerName: "Designation", flex: 1.2, minWidth: 140 },
			{ field: "eb_id", headerName: "Emp ID", flex: 0.7, minWidth: 90 },
			{ field: "bio_id", headerName: "Bio ID", flex: 0.7, minWidth: 90 },
			{ field: "attendance_date", headerName: "Date", flex: 1, minWidth: 110 },
			{ field: "spell_name", headerName: "Spell", flex: 0.6, minWidth: 80 },
			{ field: "attendance_type", headerName: "Type", flex: 0.6, minWidth: 80 },
			{ field: "check_in", headerName: "Check In", flex: 0.9, minWidth: 100 },
			{ field: "check_out", headerName: "Check Out", flex: 0.9, minWidth: 100 },
			{ field: "Time_duration", headerName: "Duration", flex: 0.8, minWidth: 100 },
			{ field: "Working_hours", headerName: "Working Hrs", flex: 0.9, minWidth: 110 },
			{ field: "Ot_hours", headerName: "OT Hrs", flex: 0.7, minWidth: 90 },
			{ field: "device_name", headerName: "Device", flex: 1, minWidth: 120 },
		],
		[],
	);

	const handleDownloadExcel = useCallback(async () => {
		const co_id = getCoId();
		if (!co_id) {
			setSnackbar({ open: true, message: "No company selected", severity: "error" });
			return;
		}
		try {
			const url =
				activeTab === "bio"
					? apiRoutesPortalMasters.BIO_ATT_LIST
					: apiRoutesPortalMasters.DAILY_ATT_LIST;
			const qs = new URLSearchParams({ co_id, page: "1", limit: "100000" });
			if (searchQuery) qs.append("search", searchQuery);
			appendFilterParams(qs);
			const { data, error } = await fetchWithCookie<{
				data: Record<string, unknown>[];
			}>(`${url}?${qs}`, "GET");
			if (error || !data) {
				setSnackbar({
					open: true,
					message: error ?? "Failed to fetch data for export",
					severity: "error",
				});
				return;
			}
			const records = data.data ?? [];
			if (!records.length) {
				setSnackbar({ open: true, message: "No data to export", severity: "error" });
				return;
			}

			const ExcelJS = (await import("exceljs")).default;
			const { saveAs } = await import("file-saver");

			const cols: GridColDef<Record<string, unknown>>[] =
				activeTab === "bio"
					? (columns as unknown as GridColDef<Record<string, unknown>>[])
					: (dailyColumns as unknown as GridColDef<Record<string, unknown>>[]);
			const wb = new ExcelJS.Workbook();
			const sheetName = activeTab === "bio" ? "BIO Metric" : "Daily Attendance";
			const ws = wb.addWorksheet(sheetName);

			const headers = cols.map((c) => c.headerName ?? c.field);
			ws.mergeCells(1, 1, 1, headers.length);
			const title = ws.getCell(1, 1);
			title.value = sheetName;
			title.font = { bold: true, size: 14, color: { argb: "FF0C3C60" } };
			title.alignment = { horizontal: "center", vertical: "middle" };
			ws.getRow(1).height = 24;

			const headerRow = ws.addRow(headers);
			headerRow.eachCell((cell) => {
				cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FF3EA6DA" },
				};
				cell.alignment = { horizontal: "center", vertical: "middle" };
				cell.border = {
					top: { style: "thin" },
					left: { style: "thin" },
					bottom: { style: "thin" },
					right: { style: "thin" },
				};
			});
			headerRow.height = 22;

			for (const rec of records) {
				const row = ws.addRow(
					cols.map((c) => (rec[c.field] ?? "") as string | number),
				);
				row.eachCell({ includeEmpty: true }, (cell) => {
					cell.border = {
						top: { style: "thin" },
						left: { style: "thin" },
						bottom: { style: "thin" },
						right: { style: "thin" },
					};
				});
			}
			cols.forEach((c, idx) => {
				ws.getColumn(idx + 1).width = Math.max(12, (c.minWidth ?? 100) / 8);
			});
			ws.views = [{ state: "frozen", ySplit: 2 }];

			const buf = await wb.xlsx.writeBuffer();
			const blob = new Blob([buf], {
				type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			});
			const stamp = new Date().toISOString().slice(0, 10);
			saveAs(blob, `${sheetName.replace(/\s+/g, "_")}_${stamp}.xlsx`);
		} catch (e) {
			setSnackbar({
				open: true,
				message: e instanceof Error ? e.message : String(e),
				severity: "error",
			});
		}
	}, [activeTab, searchQuery, filterKey, appendFilterParams, getCoId, columns, dailyColumns]);

	const handleViewChange = useCallback((value: TabKey) => {
		setActiveTab(value);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
		// Open the date / eb-no filter popup when entering BIO Metric or Attendance.
		// Wages tab opens its own dialog on mount.
		if (value === "bio" || value === "daily") {
			setFilterDialogOpen(true);
		}
	}, []);

	const handleSelectChange = useCallback(
		(e: SelectChangeEvent<TabKey>) => handleViewChange(e.target.value as TabKey),
		[handleViewChange],
	);

	const handleApplyDateFilter = useCallback((values: BioAttFilterValues) => {
		setDateFilter(values);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, []);

	const tabsContent = (
		<FormControl size="small" sx={{ minWidth: 200 }}>
			<InputLabel id="bioatt-view-label">View</InputLabel>
			<Select<TabKey>
				labelId="bioatt-view-label"
				label="View"
				value={activeTab}
				onChange={handleSelectChange}
			>
				<MenuItem value="bio">BIO Metric</MenuItem>
				<MenuItem value="daily">Attendance</MenuItem>
				<MenuItem value="wages">Wages Register</MenuItem>
			</Select>
		</FormControl>
	);

	return (
		<>
			{activeTab === "bio" ? (
				<IndexWrapper
					title="Bio Attendance Updation"
					rows={rows}
					columns={columns}
					rowCount={totalRows}
					paginationModel={paginationModel}
					onPaginationModelChange={handlePaginationModelChange}
					loading={loading}
					showLoadingUntilLoaded
					toolbarContent={tabsContent}
					filterMode="server"
					filterModel={filterModel}
					onFilterModelChange={(m) => {
						setFilterModel(m);
						setPaginationModel((prev) => ({ ...prev, page: 0 }));
					}}
					search={{
						value: searchQuery,
						onChange: handleSearchChange,
						placeholder: "Search by emp code, name, dept, device",
						debounceDelayMs: 500,
					}}
					extraActions={
						<>
							<FormControl size="small" sx={{ minWidth: 170 }}>
								<InputLabel id="bioatt-action-label">Action</InputLabel>
								<Select<string>
									labelId="bioatt-action-label"
									label="Action"
									value=""
									onChange={handleActionSelect}
									displayEmpty
								>
									<MenuItem value="sql_create">Sql create</MenuItem>
									<MenuItem value="excel_upload">Upload from Excel</MenuItem>
								</Select>
							</FormControl>
							<Button variant="outlined" onClick={() => setFilterDialogOpen(true)}>
								Filter
							</Button>
							<Button variant="contained" color="success" onClick={handleFinalProcessClick}>
								Final Process
							</Button>
							<Button variant="outlined" color="warning" onClick={handleClearClick}>
								Clear
							</Button>
							<Button variant="outlined" color="info" onClick={handleEtrackClick}>
								Etrack Data
							</Button>
							<Button variant="contained" color="secondary" onClick={handleEtrackProcessClick}>
								Etrack Process
							</Button>
							<Button variant="contained" color="secondary" onClick={handleEtrackProcessDClick}>
								Etrack Process (D)
							</Button>
							<Button variant="contained" color="secondary" onClick={handleBprocessClick}>
								Bprocess
							</Button>
							<Button variant="contained" color="secondary" onClick={handleBAttenClick}>
								B Atten
							</Button>
							<Button variant="outlined" color="primary" onClick={handleDownloadExcel}>
								Download Excel
							</Button>
						</>
					}
				>
					<BioAttFilterDialog
						open={filterDialogOpen}
						onClose={() => setFilterDialogOpen(false)}
						onApply={handleApplyDateFilter}
						initial={dateFilter}
						title="Filter — BIO Metric"
					/>
					<BioAttUploadDialog
						open={uploadOpen}
						onClose={handleUploadClose}
						onSuccess={handleProcessSuccess}
					/>
					<BioAttSqlCreateDialog
						open={sqlCreateOpen}
						onClose={handleSqlCreateClose}
						getCoId={getCoId}
					/>
					<BioAttProcessDialog
						open={processOpen}
						onClose={handleProcessClose}
						onSuccess={handleProcessSuccess}
					/>
					<BioAttFinalProcessDialog
						open={finalProcessOpen}
						onClose={handleFinalProcessClose}
						onSuccess={handleProcessSuccess}
					/>
					<BioAttEtrackDialog
						open={etrackOpen}
						onClose={handleEtrackClose}
						onSuccess={handleProcessSuccess}
					/>
					<BioAttEtrackProcessDialog
						open={etrackProcessOpen}
						onClose={handleEtrackProcessClose}
						onSuccess={handleProcessSuccess}
					/>
					<BioAttEtrackProcessDDialog
						open={etrackProcessDOpen}
						onClose={handleEtrackProcessDClose}
						onSuccess={handleProcessSuccess}
					/>
					<BioAttBprocessDialog
						open={bprocessOpen}
						onClose={handleBprocessClose}
						onSuccess={handleProcessSuccess}
					/>
					<BioAttBAttenDialog
						open={bAttenOpen}
						onClose={handleBAttenClose}
						onSuccess={handleProcessSuccess}
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
			) : activeTab === "daily" ? (
				<IndexWrapper
					title="Daily Attendance"
					rows={dailyRows}
					columns={dailyColumns}
					rowCount={totalRows}
					paginationModel={paginationModel}
					onPaginationModelChange={handlePaginationModelChange}
					loading={loading}
					showLoadingUntilLoaded
					toolbarContent={tabsContent}
					filterMode="server"
					filterModel={filterModel}
					onFilterModelChange={(m) => {
						setFilterModel(m);
						setPaginationModel((prev) => ({ ...prev, page: 0 }));
					}}
					search={{
						value: searchQuery,
						onChange: handleSearchChange,
						placeholder: "Search by emp code, name, spell, type, device, date",
						debounceDelayMs: 500,
					}}
					extraActions={
						<>
							<Button variant="outlined" onClick={() => setFilterDialogOpen(true)}>
								Filter
							</Button>
							<Button variant="outlined" color="primary" onClick={handleDownloadExcel}>
								Download Excel
							</Button>
						</>
					}
				>
					<BioAttFilterDialog
						open={filterDialogOpen}
						onClose={() => setFilterDialogOpen(false)}
						onApply={handleApplyDateFilter}
						initial={dateFilter}
						title="Filter — Daily Attendance"
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
			) : (
				<WagesRegisterTab toolbarContent={tabsContent} />
			)}
		</>
	);
}
