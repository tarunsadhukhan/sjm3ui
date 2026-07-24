"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	CircularProgress,
	Divider,
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
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { Save as SaveIcon, Trash2 as DeleteIcon } from "lucide-react";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	sampleStdDev,
	todayISO,
} from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";

// ─── Types (server contract: src/juteSQC/cutting_length.py) ─────────────────

type ClothQuality = { item_id: number; item_code: string | null; item_name: string | null };

type CuttingLengthSetup = {
	cloth_qualities: ClothQuality[];
	default_std_length: number;
	readings_count: number;
};

type CuttingLengthByDateRow = {
	cutting_length_id: number;
	item_id: number | null;
	item_name: string | null;
	item_code: string | null;
	std_length: number | null;
	readings: number[];
	avg: number | null;
	stdev: number | null;
	cv_pct: number | null;
	deviation: number | null;
};

type CuttingLengthTableRow = {
	cutting_length_id: number;
	entry_date: string | null;
	branch_id: number | null;
	item_id: number | null;
	item_name: string | null;
	item_code: string | null;
	std_length: number | null;
	avg: number | null;
	stdev: number | null;
	cv_pct: number | null;
	deviation: number | null;
};

function fmt(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

function qualityLabel(row: {
	item_name?: string | null;
	item_code?: string | null;
	item_id?: number | null;
}): string {
	return row.item_name ?? row.item_code ?? (row.item_id != null ? `Item #${row.item_id}` : "—");
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function CuttingLengthSqcPage() {
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

	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const [snack, setSnack] = React.useState<string | null>(null);

	// ── Setup (cloth qualities + defaults) ──
	const [setup, setSetup] = React.useState<CuttingLengthSetup | null>(null);
	const [setupLoading, setSetupLoading] = React.useState(false);
	const [setupError, setSetupError] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (!coId || branchId == null) {
			setSetup(null);
			return;
		}
		let cancelled = false;
		setSetupLoading(true);
		setSetupError(null);
		void fetchWithCookie<{ data: CuttingLengthSetup }>(
			`${apiRoutesPortalMasters.CUTTING_LENGTH_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`,
			"GET"
		).then(({ data, error }) => {
			if (cancelled) return;
			if (error || !data) {
				setSetupError(error ?? "Failed to load setup");
				setSetup(null);
			} else {
				setSetup(data.data);
			}
			setSetupLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId]);

	// ── Entry form state ──
	const readingsCount = setup?.readings_count ?? 20;
	const [itemId, setItemId] = React.useState<number | "">("");
	const [stdLength, setStdLength] = React.useState<string>("");
	const [readings, setReadings] = React.useState<string[]>(Array.from({ length: 20 }, () => ""));
	const [saving, setSaving] = React.useState(false);
	React.useEffect(() => {
		if (!setup) return;
		setStdLength(String(setup.default_std_length));
		setReadings(Array.from({ length: setup.readings_count }, () => ""));
	}, [setup]);

	// Live preview — server recomputes stats at save and is authoritative.
	const numericReadings = React.useMemo(
		() => readings.filter((r) => r !== "").map(Number).filter((n) => Number.isFinite(n)),
		[readings]
	);
	const previewAvg =
		numericReadings.length > 0
			? numericReadings.reduce((a, b) => a + b, 0) / numericReadings.length
			: null;
	const previewStdev = sampleStdDev(numericReadings);
	const previewCv =
		previewStdev != null && previewAvg != null && previewAvg > 0
			? (previewStdev / previewAvg) * 100
			: null;
	const stdNum = stdLength === "" ? null : Number(stdLength);
	const previewDeviation = previewAvg != null && stdNum != null ? previewAvg - stdNum : null;

	// ── By-date view ──
	const [byDateRows, setByDateRows] = React.useState<CuttingLengthByDateRow[]>([]);
	const [byDateLoading, setByDateLoading] = React.useState(false);
	const [version, setVersion] = React.useState(0);
	const refreshData = React.useCallback(() => setVersion((v) => v + 1), []);
	React.useEffect(() => {
		if (!coId || branchId == null || !entryDate) {
			setByDateRows([]);
			return;
		}
		let cancelled = false;
		setByDateLoading(true);
		void fetchWithCookie<{ data: { rows: CuttingLengthByDateRow[] } }>(
			`${apiRoutesPortalMasters.CUTTING_LENGTH_BY_DATE}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`,
			"GET"
		).then(({ data, error }) => {
			if (cancelled) return;
			if (error || !data) setByDateRows([]);
			else setByDateRows(data.data?.rows ?? []);
			setByDateLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, entryDate, version]);

	// ── History table (server-paginated) ──
	const [tableRows, setTableRows] = React.useState<CuttingLengthTableRow[]>([]);
	const [tableTotal, setTableTotal] = React.useState(0);
	const [tableLoading, setTableLoading] = React.useState(false);
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
		if (!coId || branchId == null) {
			setTableRows([]);
			setTableTotal(0);
			return;
		}
		let cancelled = false;
		setTableLoading(true);
		const params = new URLSearchParams({
			co_id: coId,
			branch_id: String(branchId),
			page: String(paginationModel.page + 1),
			limit: String(paginationModel.pageSize),
		});
		if (debouncedSearch) params.append("search", debouncedSearch);
		void fetchWithCookie<{ data: CuttingLengthTableRow[]; total: number }>(
			`${apiRoutesPortalMasters.CUTTING_LENGTH_TABLE}?${params.toString()}`,
			"GET"
		).then(({ data, error }) => {
			if (cancelled) return;
			if (error || !data) {
				setTableRows([]);
				setTableTotal(0);
			} else {
				setTableRows(data.data ?? []);
				setTableTotal(data.total ?? 0);
			}
			setTableLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, paginationModel.page, paginationModel.pageSize, debouncedSearch, version]);

	// ── Save ──
	const handleSave = async () => {
		const std = Number(stdLength);
		if (!Number.isFinite(std) || std <= 0) {
			setSnack("Std length must be a positive number.");
			return;
		}
		const nums = readings.map(Number);
		if (readings.some((r) => r === "") || nums.some((n) => !Number.isFinite(n) || n <= 0)) {
			setSnack(`Enter all ${readingsCount} readings as positive numbers.`);
			return;
		}
		setSaving(true);
		const { error } = await fetchWithCookie<{ message: string; cutting_length_id: number }>(
			apiRoutesPortalMasters.CUTTING_LENGTH_CREATE,
			"POST",
			{
				co_id: Number(coId),
				branch_id: branchId,
				entry_date: entryDate,
				item_id: itemId === "" ? null : Number(itemId),
				std_length: std,
				readings: nums,
			}
		);
		setSaving(false);
		if (error) {
			setSnack(error);
			return;
		}
		setSnack("Cutting length reading-set saved.");
		setReadings(Array.from({ length: readingsCount }, () => ""));
		refreshData();
	};

	// ── Delete (POST endpoint with JSON body) ──
	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!window.confirm(`Delete cutting length reading-set #${id}?`)) return;
			const { error } = await fetchWithCookie<{ message: string }>(
				apiRoutesPortalMasters.CUTTING_LENGTH_DELETE,
				"POST",
				{ cutting_length_id: id, co_id: Number(coId) }
			);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted cutting length reading-set #${id}.`);
			refreshData();
		},
		[coId, refreshData]
	);

	const historyColumns = React.useMemo<GridColDef<CuttingLengthTableRow>[]>(
		() => [
			{
				field: "entry_date",
				headerName: "Date",
				width: 110,
				valueFormatter: (value) =>
					value ? new Date(value as string).toLocaleDateString("en-IN") : "—",
			},
			{
				field: "quality",
				headerName: "Cloth quality",
				flex: 1,
				minWidth: 160,
				valueGetter: (_value, row) => qualityLabel(row),
			},
			{
				field: "std_length",
				headerName: "Std (in)",
				width: 100,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null, 1),
			},
			{
				field: "avg",
				headerName: "Avg (in)",
				width: 100,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "stdev",
				headerName: "Std Dev",
				width: 100,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null, 3),
			},
			{
				field: "cv_pct",
				headerName: "CV %",
				width: 90,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "deviation",
				headerName: "Deviation",
				width: 100,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "actions",
				headerName: "",
				width: 60,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Tooltip title="Delete">
						<IconButton
							size="small"
							color="error"
							onClick={() => handleDelete(params.row.cutting_length_id)}
						>
							<DeleteIcon size={16} />
						</IconButton>
					</Tooltip>
				),
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
				Cutting Length SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-20 — daily cut-piece length consistency (inches). One save = {readingsCount} readings;
				the server computes avg, sample std dev, CV% and deviation vs the standard length.
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
				<Alert severity="info">Select a branch to load Cutting Length SQC data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
						<Typography variant="subtitle2">Entry date</Typography>
						<TextField
							type="date"
							size="small"
							value={entryDate}
							onChange={(e) => setEntryDate(e.target.value)}
							InputLabelProps={{ shrink: true }}
						/>
					</Box>

					{/* ── Entry form ── */}
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
							<Typography variant="subtitle2">New reading-set</Typography>
							<Box
								sx={{
									display: "grid",
									gap: 2,
									gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
								}}
							>
								<Autocomplete
									options={setup.cloth_qualities}
									getOptionLabel={(q) => `${q.item_name ?? ""} (${q.item_code ?? ""})`}
									value={setup.cloth_qualities.find((q) => q.item_id === itemId) ?? null}
									onChange={(_, val) => setItemId(val ? val.item_id : "")}
									size="small"
									renderInput={(params) => (
										<TextField {...params} label="Cloth quality (optional)" />
									)}
									isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
								/>
								<TextField
									type="number"
									label="Std length (inches)"
									value={stdLength}
									onChange={(e) => setStdLength(e.target.value)}
									size="small"
									fullWidth
									inputProps={{ step: "any", min: 0 }}
								/>
							</Box>
							<Divider />
							<Box
								sx={{
									display: "grid",
									gap: 1.5,
									gridTemplateColumns: {
										xs: "repeat(2, minmax(0, 1fr))",
										sm: "repeat(5, minmax(0, 1fr))",
										md: "repeat(10, minmax(0, 1fr))",
									},
								}}
							>
								{readings.map((r, i) => (
									<TextField
										key={i}
										type="number"
										label={`R${i + 1}`}
										value={r}
										onChange={(e) =>
											setReadings((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
										}
										size="small"
										fullWidth
										inputProps={{ step: "any", min: 0 }}
									/>
								))}
							</Box>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
								<TextField
									label="Avg"
									value={previewAvg != null ? previewAvg.toFixed(2) : ""}
									size="small"
									InputProps={{ readOnly: true }}
									sx={{ width: 110 }}
								/>
								<TextField
									label="Std Dev"
									value={previewStdev != null ? previewStdev.toFixed(3) : ""}
									size="small"
									InputProps={{ readOnly: true }}
									sx={{ width: 110 }}
								/>
								<TextField
									label="CV %"
									value={previewCv != null ? previewCv.toFixed(2) : ""}
									size="small"
									InputProps={{ readOnly: true }}
									sx={{ width: 110 }}
								/>
								<TextField
									label="Deviation"
									value={previewDeviation != null ? previewDeviation.toFixed(2) : ""}
									size="small"
									InputProps={{ readOnly: true }}
									sx={{ width: 110 }}
								/>
								<Typography variant="caption" color="text.secondary">
									Preview only — the server recomputes stats on save.
								</Typography>
								<Box sx={{ flexGrow: 1 }} />
								<Button
									variant="contained"
									startIcon={<SaveIcon size={18} />}
									onClick={handleSave}
									disabled={saving}
									sx={{ minHeight: 44 }}
								>
									{saving ? "Saving…" : "Save"}
								</Button>
							</Box>
						</Paper>
					)}

					{/* ── By-date view ── */}
					<Box>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Reading-sets on {entryDate}
						</Typography>
						{byDateLoading ? (
							<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
								<CircularProgress size={28} />
							</Box>
						) : byDateRows.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								No reading-sets for this date.
							</Typography>
						) : (
							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>Cloth quality</TableCell>
											<TableCell align="right">Std (in)</TableCell>
											<TableCell align="right">Avg (in)</TableCell>
											<TableCell align="right">Std Dev</TableCell>
											<TableCell align="right">CV %</TableCell>
											<TableCell align="right">Deviation</TableCell>
											<TableCell align="center">Delete</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{byDateRows.map((row) => (
											<React.Fragment key={row.cutting_length_id}>
												<TableRow>
													<TableCell>{qualityLabel(row)}</TableCell>
													<TableCell align="right">{fmt(row.std_length, 1)}</TableCell>
													<TableCell align="right">{fmt(row.avg)}</TableCell>
													<TableCell align="right">{fmt(row.stdev, 3)}</TableCell>
													<TableCell align="right">{fmt(row.cv_pct)}</TableCell>
													<TableCell align="right">{fmt(row.deviation)}</TableCell>
													<TableCell align="center">
														<IconButton
															size="small"
															color="error"
															onClick={() => handleDelete(row.cutting_length_id)}
														>
															<DeleteIcon size={16} />
														</IconButton>
													</TableCell>
												</TableRow>
												<TableRow>
													<TableCell colSpan={7} sx={{ py: 0.5 }}>
														<Typography variant="caption" color="text.secondary">
															Readings: {(row.readings ?? []).map((n) => fmt(n, 1)).join(", ")}
														</Typography>
													</TableCell>
												</TableRow>
											</React.Fragment>
										))}
									</TableBody>
								</Table>
							</TableContainer>
						)}
					</Box>

					{/* ── History ── */}
					<Box>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 1 }}>
							<Typography variant="subtitle2">History</Typography>
							<TextField
								size="small"
								placeholder="Search cloth quality"
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
								rows={tableRows}
								getRowId={(r) => r.cutting_length_id}
								columns={historyColumns}
								loading={tableLoading}
								paginationMode="server"
								rowCount={tableTotal}
								paginationModel={paginationModel}
								onPaginationModelChange={setPaginationModel}
								pageSizeOptions={[10, 25, 50]}
								disableRowSelectionOnClick
								density="compact"
								sx={{ minWidth: 820 }}
							/>
						</Box>
					</Box>
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
