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
import BeamMrEntryForm from "./_components/BeamMrEntryForm";
import type {
	BeamMrByDateRow,
	BeamMrGroupSummary,
	BeamMrSetup,
	BeamMrTableRow,
} from "./types";

const fmt2 = (v: unknown): string => {
	if (v == null || v === "") return "—";
	const n = Number(v);
	return Number.isFinite(n) ? n.toFixed(2) : "—";
};

const fmtDate = (v: unknown): string =>
	typeof v === "string" && v ? new Date(v).toLocaleDateString("en-IN") : "—";

export default function BeamMrSqcPage() {
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

	// Setup (spells, machines, cloth qualities, std defaults)
	const [setup, setSetup] = React.useState<BeamMrSetup | null>(null);
	const [setupLoading, setSetupLoading] = React.useState(false);
	const [setupError, setSetupError] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (!coId || branchId == null) {
			setSetup(null);
			return;
		}
		let cancelled = false;
		setSetupLoading(true);
		const url = `${apiRoutesPortalMasters.BEAM_MR_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: BeamMrSetup }>(url, "GET").then(({ data, error }) => {
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

	const readingsPerSet = setup?.readings_per_set ?? 5;

	// Bumped after save/delete so both the by-date view and the history reload.
	const [refreshKey, setRefreshKey] = React.useState(0);
	const onSaved = React.useCallback(() => setRefreshKey((v) => v + 1), []);

	// By-date view
	const [viewDate, setViewDate] = React.useState<string>(todayISO());
	const [viewRows, setViewRows] = React.useState<BeamMrByDateRow[]>([]);
	const [viewSummaries, setViewSummaries] = React.useState<BeamMrGroupSummary[]>([]);
	const [viewLoading, setViewLoading] = React.useState(false);
	React.useEffect(() => {
		if (!coId || branchId == null || !viewDate) return;
		let cancelled = false;
		setViewLoading(true);
		const url = `${apiRoutesPortalMasters.BEAM_MR_BY_DATE}?co_id=${coId}&branch_id=${branchId}&entry_date=${viewDate}`;
		void fetchWithCookie<{ data: { rows: BeamMrByDateRow[]; group_summaries: BeamMrGroupSummary[] } }>(
			url,
			"GET"
		).then(({ data, error }) => {
			if (cancelled) return;
			if (!error && data) {
				setViewRows(data.data?.rows ?? []);
				setViewSummaries(data.data?.group_summaries ?? []);
			}
			setViewLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, viewDate, refreshKey]);

	// History (server-paginated)
	const [histRows, setHistRows] = React.useState<BeamMrTableRow[]>([]);
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
		void fetchWithCookie<{ data: BeamMrTableRow[]; total: number }>(
			`${apiRoutesPortalMasters.BEAM_MR_TABLE}?${params}`,
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
			if (!confirm(`Delete Beam MR% entry #${id}?`)) return;
			const { error } = await fetchWithCookie(apiRoutesPortalMasters.BEAM_MR_DELETE, "POST", {
				beam_mr_id: id,
				co_id: Number(coId),
			});
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted Beam MR% entry #${id}`);
			setRefreshKey((v) => v + 1);
		},
		[coId]
	);

	const columns = React.useMemo<GridColDef<BeamMrTableRow>[]>(
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
							onClick={() => handleDelete(params.row.beam_mr_id)}
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
				field: "mech_code",
				headerName: "Machine",
				width: 150,
				valueGetter: (_value, row) => row.mech_code ?? row.machine_name ?? "—",
			},
			{ field: "item_name", headerName: "Cloth Quality", flex: 1, minWidth: 160 },
			{
				field: "spell_code",
				headerName: "Spell",
				width: 90,
				valueGetter: (_value, row) => row.spell_code ?? "—",
			},
			{
				field: "calc_avg_mr",
				headerName: "Avg MR%",
				width: 100,
				valueFormatter: (value) => fmt2(value),
			},
			{
				field: "std_mr_pct",
				headerName: "Std MR%",
				width: 100,
				valueFormatter: (value) => fmt2(value),
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
				Beam MR% SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-18 warp-beam moisture regain — one reading-set = {readingsPerSet} MR% readings per beam
				machine and quality group. Averages and deviation vs std are computed on save.
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
				<Alert severity="info">Select a branch to load Beam MR% SQC data.</Alert>
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
							<BeamMrEntryForm coId={coId} branchId={branchId} setup={setup} onSaved={onSaved} />
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
						) : viewRows.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								No readings recorded for {viewDate}.
							</Typography>
						) : (
							<>
								<TableContainer sx={{ overflowX: "auto" }}>
									<Table size="small" sx={{ minWidth: 1000 }}>
										<TableHead>
											<TableRow>
												<TableCell>Group</TableCell>
												<TableCell>Machine</TableCell>
												<TableCell>Cloth Quality</TableCell>
												<TableCell>Spell</TableCell>
												{Array.from({ length: readingsPerSet }, (_, i) => (
													<TableCell key={i} align="right">
														R{i + 1}
													</TableCell>
												))}
												<TableCell align="right">Avg MR%</TableCell>
												<TableCell align="right">Std MR%</TableCell>
												<TableCell align="right">Deviation</TableCell>
												<TableCell />
											</TableRow>
										</TableHead>
										<TableBody>
											{viewRows.map((r) => (
												<TableRow key={r.beam_mr_id}>
													<TableCell>{r.quality_group}</TableCell>
													<TableCell>{r.mech_code ?? r.machine_name ?? "—"}</TableCell>
													<TableCell>{r.item_name ?? "—"}</TableCell>
													<TableCell>{r.spell_code ?? "—"}</TableCell>
													{Array.from({ length: readingsPerSet }, (_, i) => (
														<TableCell key={i} align="right">
															{r.readings[i] != null ? fmt2(r.readings[i]) : "—"}
														</TableCell>
													))}
													<TableCell align="right">{fmt2(r.avg_mr)}</TableCell>
													<TableCell align="right">{fmt2(r.std_mr_pct)}</TableCell>
													<TableCell align="right">{fmt2(r.deviation)}</TableCell>
													<TableCell>
														<Tooltip title="Delete entry">
															<IconButton
																size="small"
																color="error"
																onClick={() => handleDelete(r.beam_mr_id)}
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
											label={`${g.quality_group}: avg ${fmt2(g.overall_avg_mr)}% · std ${fmt2(g.std_mr_pct)}% · ${g.machine_count} machine(s)`}
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
								placeholder="Search machine / quality / group"
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
								getRowId={(r) => r.beam_mr_id}
								columns={columns}
								loading={histLoading}
								paginationMode="server"
								rowCount={histTotal}
								paginationModel={paginationModel}
								onPaginationModelChange={setPaginationModel}
								pageSizeOptions={[10, 25, 50]}
								disableRowSelectionOnClick
								density="comfortable"
								sx={{ minWidth: 860 }}
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
