"use client";

import * as React from "react";
import {
	Alert,
	Box,
	Chip,
	CircularProgress,
	IconButton,
	MenuItem,
	Paper,
	Snackbar,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Trash2 as DeleteIcon } from "lucide-react";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import PackingMrEntryForm from "./_components/PackingMrEntryForm";
import type {
	PackingMrByDateColumn,
	PackingMrGroupSummary,
	PackingMrSetup,
	PackingMrTableRow,
} from "./types";

const fmt3 = (v: unknown): string => {
	if (v == null || v === "") return "—";
	const n = Number(v);
	return Number.isFinite(n) ? n.toFixed(3) : "—";
};

const fmtDate = (v: unknown): string =>
	typeof v === "string" && v ? new Date(v).toLocaleDateString("en-IN") : "—";

export default function PackingMrSqcPage() {
	// HYDRATION RULE: this component reads sidebar context and seeds a date,
	// so defer render until mounted to avoid SSR hydration mismatch.
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const { coId } = useSelectedCompanyCoId();
	const { selectedBranches, selectedCompany } = useSidebarContext();

	// Branch resolution: 1 sidebar branch → auto-use it; several → user must pick one.
	const sidebarBranchIds = React.useMemo(() => selectedBranches.map(Number), [selectedBranches]);
	const [pageBranchId, setPageBranchId] = React.useState<number | "">("");
	React.useEffect(() => {
		if (sidebarBranchIds.length === 1) {
			setPageBranchId(sidebarBranchIds[0]);
		} else if (sidebarBranchIds.length === 0) {
			setPageBranchId("");
		} else {
			setPageBranchId((prev) =>
				prev !== "" && sidebarBranchIds.includes(prev as number) ? prev : ""
			);
		}
	}, [sidebarBranchIds]);
	const branchId = pageBranchId === "" ? null : (pageBranchId as number);
	const branchOptions = React.useMemo(
		() => (selectedCompany?.branches ?? []).filter((b) => sidebarBranchIds.includes(Number(b.branch_id))),
		[selectedCompany, sidebarBranchIds]
	);
	const selectedBranchName = branchOptions.find((b) => Number(b.branch_id) === branchId)?.branch_name;

	// Setup (cloth qualities + quality groups)
	const [setup, setSetup] = React.useState<PackingMrSetup | null>(null);
	const [setupLoading, setSetupLoading] = React.useState(false);
	const [setupError, setSetupError] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (!coId || branchId == null) {
			setSetup(null);
			return;
		}
		let cancelled = false;
		setSetupLoading(true);
		const url = `${apiRoutesPortalMasters.PACKING_MR_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: PackingMrSetup }>(url, "GET").then(({ data, error }) => {
			if (cancelled) return;
			if (error) {
				setSetupError(error);
				setSetup(null);
			} else {
				setSetupError(null);
				setSetup(data?.data ?? null);
			}
			setSetupLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId]);

	const readingsCount = setup?.readings_count ?? 10;

	// Bumped after save/delete so both the by-date view and the history reload.
	const [refreshKey, setRefreshKey] = React.useState(0);
	const onSaved = React.useCallback(() => setRefreshKey((v) => v + 1), []);

	// By-date view
	const [viewDate, setViewDate] = React.useState<string>(todayISO());
	const [viewCols, setViewCols] = React.useState<PackingMrByDateColumn[]>([]);
	const [viewSummaries, setViewSummaries] = React.useState<PackingMrGroupSummary[]>([]);
	const [viewLoading, setViewLoading] = React.useState(false);
	React.useEffect(() => {
		if (!coId || branchId == null || !viewDate) return;
		let cancelled = false;
		setViewLoading(true);
		const url = `${apiRoutesPortalMasters.PACKING_MR_BY_DATE}?co_id=${coId}&branch_id=${branchId}&entry_date=${viewDate}`;
		void fetchWithCookie<{
			data: { columns: PackingMrByDateColumn[]; group_summaries: PackingMrGroupSummary[] };
		}>(url, "GET").then(({ data, error }) => {
			if (cancelled) return;
			if (!error && data) {
				setViewCols(data.data?.columns ?? []);
				setViewSummaries(data.data?.group_summaries ?? []);
			}
			setViewLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, viewDate, refreshKey]);

	// History (server-paginated)
	const [histRows, setHistRows] = React.useState<PackingMrTableRow[]>([]);
	const [histTotal, setHistTotal] = React.useState(0);
	const [histLoading, setHistLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
		page: 0,
		pageSize: 10,
	});
	const [search, setSearch] = React.useState("");
	const [debouncedSearch, setDebouncedSearch] = React.useState("");
	React.useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(search), 400);
		return () => clearTimeout(t);
	}, [search]);
	React.useEffect(() => {
		if (!coId || branchId == null) return;
		let cancelled = false;
		setHistLoading(true);
		const params = new URLSearchParams({
			co_id: coId,
			page: String(paginationModel.page + 1),
			limit: String(paginationModel.pageSize),
		});
		if (debouncedSearch) params.append("search", debouncedSearch);
		void fetchWithCookie<{ data: PackingMrTableRow[]; total: number }>(
			`${apiRoutesPortalMasters.PACKING_MR_TABLE}?${params}`,
			"GET"
		).then(({ data, error }) => {
			if (cancelled) return;
			if (!error && data) {
				setHistRows(data.data ?? []);
				setHistTotal(data.total ?? 0);
			}
			setHistLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, paginationModel, debouncedSearch, refreshKey]);

	const [snack, setSnack] = React.useState<string | null>(null);

	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!confirm(`Delete Packing MR% entry #${id}?`)) return;
			const { error } = await fetchWithCookie(apiRoutesPortalMasters.PACKING_MR_DELETE, "POST", {
				packing_mr_id: id,
				co_id: Number(coId),
			});
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted Packing MR% entry #${id}`);
			setRefreshKey((v) => v + 1);
		},
		[coId]
	);

	const columns = React.useMemo<GridColDef<PackingMrTableRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 60,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Tooltip title="Delete entry">
						<IconButton
							size="small"
							color="error"
							onClick={() => handleDelete(params.row.packing_mr_id)}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{
				field: "entry_date",
				headerName: "Date",
				width: 110,
				valueFormatter: (value) => fmtDate(value),
			},
			{ field: "quality_group", headerName: "Group", width: 100 },
			{
				field: "item_name",
				headerName: "Cloth Quality",
				flex: 1,
				minWidth: 160,
				valueGetter: (_value, row) => row.item_name ?? row.quality_label ?? "—",
			},
			{
				field: "construction_code",
				headerName: "Construction",
				width: 140,
				valueGetter: (_value, row) => row.construction_code ?? "—",
			},
			{
				field: "avg_mr",
				headerName: "Avg MR%",
				width: 110,
				valueFormatter: (value) => fmt3(value),
			},
		],
		[handleDelete]
	);

	if (!mounted) return null;

	if (!coId) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Select a company to continue.
			</Alert>
		);
	}

	if (sidebarBranchIds.length === 0) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Select at least one branch in the sidebar to continue.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Typography variant="h5" sx={{ fontWeight: 600 }}>
				Packing MR% SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-25 finished-goods moisture at packing — one reading-set = {readingsCount} MR% readings
				per quality column. Averages are computed on save.
			</Typography>

			{sidebarBranchIds.length > 1 ? (
				<TextField
					select
					size="small"
					label="Branch"
					value={pageBranchId}
					onChange={(e) => setPageBranchId(e.target.value === "" ? "" : Number(e.target.value))}
					sx={{ mb: 2, minWidth: 240 }}
				>
					{branchOptions.map((b) => (
						<MenuItem key={b.branch_id} value={Number(b.branch_id)}>
							{b.branch_name}
						</MenuItem>
					))}
				</TextField>
			) : selectedBranchName ? (
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Branch: {selectedBranchName}
				</Typography>
			) : null}

			{branchId == null ? (
				<Alert severity="info">Select a branch to load Packing MR% SQC data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					{/* Entry form */}
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
							New reading-set
						</Typography>
						{setupError ? <Alert severity="error">{setupError}</Alert> : null}
						{setupLoading ? (
							<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
								<CircularProgress size={24} />
							</Box>
						) : setup ? (
							<PackingMrEntryForm coId={coId} branchId={branchId} setup={setup} onSaved={onSaved} />
						) : null}
					</Paper>

					{/* By-date view */}
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
							<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
								Readings by date
							</Typography>
							<TextField
								type="date"
								size="small"
								value={viewDate}
								onChange={(e) => setViewDate(e.target.value)}
								slotProps={{ inputLabel: { shrink: true } }}
							/>
						</Box>
						{viewLoading ? (
							<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
								<CircularProgress size={24} />
							</Box>
						) : viewCols.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								No readings recorded for {viewDate}.
							</Typography>
						) : (
							<>
								<TableContainer sx={{ overflowX: "auto" }}>
									<Table size="small" sx={{ minWidth: 1300 }}>
										<TableHead>
											<TableRow>
												<TableCell>Group</TableCell>
												<TableCell>Cloth Quality</TableCell>
												<TableCell>Construction</TableCell>
												{Array.from({ length: readingsCount }, (_, i) => (
													<TableCell key={i} align="right">
														R{i + 1}
													</TableCell>
												))}
												<TableCell align="right">Avg MR%</TableCell>
												<TableCell />
											</TableRow>
										</TableHead>
										<TableBody>
											{viewCols.map((c) => (
												<TableRow key={c.packing_mr_id}>
													<TableCell>{c.quality_group}</TableCell>
													<TableCell>{c.item_name ?? c.quality_label ?? "—"}</TableCell>
													<TableCell>{c.construction_code ?? "—"}</TableCell>
													{Array.from({ length: readingsCount }, (_, i) => (
														<TableCell key={i} align="right">
															{c.readings[i] != null ? fmt3(c.readings[i]) : "—"}
														</TableCell>
													))}
													<TableCell align="right">{fmt3(c.avg_mr)}</TableCell>
													<TableCell>
														<Tooltip title="Delete entry">
															<IconButton
																size="small"
																color="error"
																onClick={() => handleDelete(c.packing_mr_id)}
															>
																<DeleteIcon size={16} />
															</IconButton>
														</Tooltip>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
								<Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
									{viewSummaries.map((g) => (
										<Chip
											key={g.quality_group}
											variant="outlined"
											label={`${g.quality_group}: avg ${fmt3(g.group_avg_mr)}% · ${g.column_count} column(s), ${g.reading_count} readings`}
										/>
									))}
								</Box>
							</>
						)}
					</Paper>

					{/* History */}
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
							<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
								History
							</Typography>
							<TextField
								size="small"
								placeholder="Search group / quality / construction"
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPaginationModel((prev) => ({ ...prev, page: 0 }));
								}}
								sx={{ minWidth: 260 }}
							/>
						</Box>
						<Box sx={{ width: "100%", overflowX: "auto" }}>
							<DataGrid
								autoHeight
								rows={histRows}
								getRowId={(r) => r.packing_mr_id}
								columns={columns}
								loading={histLoading}
								paginationMode="server"
								rowCount={histTotal}
								paginationModel={paginationModel}
								onPaginationModelChange={setPaginationModel}
								pageSizeOptions={[10, 25, 50]}
								disableRowSelectionOnClick
								density="comfortable"
								sx={{ minWidth: 720 }}
							/>
						</Box>
					</Paper>
				</Box>
			)}

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
