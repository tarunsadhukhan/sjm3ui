"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Chip,
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
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";

// ─── Types (server contract: src/juteSQC/stitch.py) ─────────────────────────

type StitchFlag = "OK" | "LOW" | "HIGH";

type StitchMachine = { machine_id: number; machine_name: string; mech_code: string };

type StitchSetup = {
	machines: StitchMachine[];
	default_std_stitch: number;
	readings_count: number;
};

type StitchByDateRow = {
	stitch_id: number;
	mc_id: number | null;
	machine_name: string | null;
	mech_code: string | null;
	std_stitch: number | null;
	readings: number[];
	avg: number | null;
	flag: StitchFlag | null;
	inspector_name: string | null;
};

type StitchTableRow = {
	stitch_id: number;
	entry_date: string | null;
	mc_id: number | null;
	machine_name: string | null;
	mech_code: string | null;
	std_stitch: number | null;
	avg: number | null;
	flag: StitchFlag | null;
	inspector_name: string | null;
};

const FLAG_COLOR: Record<StitchFlag, "success" | "warning" | "error"> = {
	OK: "success",
	LOW: "warning",
	HIGH: "error",
};

function fmt(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

// Mirror of the server's flag rule (exact equality within epsilon) for the live preview.
function stitchFlag(avg: number | null, std: number | null): StitchFlag | null {
	if (avg == null || std == null) return null;
	if (Math.abs(avg - std) < 1e-9) return "OK";
	return avg < std ? "LOW" : "HIGH";
}

function machineLabel(row: {
	machine_name?: string | null;
	mech_code?: string | null;
	mc_id?: number | null;
}): string {
	return row.mech_code ?? row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—");
}

function flagChip(flag: StitchFlag | null): React.ReactNode {
	return flag ? <Chip label={flag} size="small" color={FLAG_COLOR[flag]} variant="outlined" /> : "—";
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function StitchSqcPage() {
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

	// ── Setup (sewing machines + defaults) ──
	const [setup, setSetup] = React.useState<StitchSetup | null>(null);
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
		void fetchWithCookie<{ data: StitchSetup }>(
			`${apiRoutesPortalMasters.STITCH_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`,
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
	const readingsCount = setup?.readings_count ?? 5;
	const [machineId, setMachineId] = React.useState<number | "">("");
	const [stdStitch, setStdStitch] = React.useState<string>("");
	const [inspectorName, setInspectorName] = React.useState<string>("");
	const [readings, setReadings] = React.useState<string[]>(Array.from({ length: 5 }, () => ""));
	const [saving, setSaving] = React.useState(false);
	React.useEffect(() => {
		if (!setup) return;
		setStdStitch(String(setup.default_std_stitch));
		setReadings(Array.from({ length: setup.readings_count }, () => ""));
	}, [setup]);

	// Live preview — server recomputes avg/flag at save and is authoritative.
	const numericReadings = React.useMemo(
		() => readings.filter((r) => r !== "").map(Number).filter((n) => Number.isFinite(n)),
		[readings]
	);
	const previewAvg =
		numericReadings.length > 0
			? numericReadings.reduce((a, b) => a + b, 0) / numericReadings.length
			: null;
	const previewFlag = stitchFlag(previewAvg, stdStitch === "" ? null : Number(stdStitch));

	// ── By-date view ──
	const [byDateRows, setByDateRows] = React.useState<StitchByDateRow[]>([]);
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
		void fetchWithCookie<{ data: { rows: StitchByDateRow[] } }>(
			`${apiRoutesPortalMasters.STITCH_BY_DATE}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`,
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
	const [tableRows, setTableRows] = React.useState<StitchTableRow[]>([]);
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
		if (!coId) {
			setTableRows([]);
			setTableTotal(0);
			return;
		}
		let cancelled = false;
		setTableLoading(true);
		const params = new URLSearchParams({
			co_id: coId,
			page: String(paginationModel.page + 1),
			limit: String(paginationModel.pageSize),
		});
		if (debouncedSearch) params.append("search", debouncedSearch);
		void fetchWithCookie<{ data: StitchTableRow[]; total: number }>(
			`${apiRoutesPortalMasters.STITCH_TABLE}?${params.toString()}`,
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
	}, [coId, paginationModel.page, paginationModel.pageSize, debouncedSearch, version]);

	// ── Save ──
	const handleSave = async () => {
		if (machineId === "") {
			setSnack("Select a sewing machine.");
			return;
		}
		const stdNum = Number(stdStitch);
		if (!Number.isFinite(stdNum) || stdNum <= 0) {
			setSnack("Std stitch must be a positive number.");
			return;
		}
		const nums = readings.map(Number);
		if (readings.some((r) => r === "") || nums.some((n) => !Number.isFinite(n) || n <= 0)) {
			setSnack(`Enter all ${readingsCount} readings as positive numbers.`);
			return;
		}
		setSaving(true);
		const { error } = await fetchWithCookie<{ message: string; stitch_id: number }>(
			apiRoutesPortalMasters.STITCH_CREATE,
			"POST",
			{
				co_id: Number(coId),
				branch_id: branchId,
				entry_date: entryDate,
				mc_id: Number(machineId),
				std_stitch: stdNum,
				readings: nums,
				inspector_name: inspectorName || null,
			}
		);
		setSaving(false);
		if (error) {
			setSnack(error);
			return;
		}
		setSnack("Stitch reading-set saved.");
		// Keep machine/std so the inspector can punch many sets quickly.
		setReadings(Array.from({ length: readingsCount }, () => ""));
		refreshData();
	};

	// ── Delete (POST endpoint with JSON body) ──
	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!window.confirm(`Delete stitch reading-set #${id}?`)) return;
			const { error } = await fetchWithCookie<{ message: string }>(
				apiRoutesPortalMasters.STITCH_DELETE,
				"POST",
				{ stitch_id: id, co_id: Number(coId) }
			);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted stitch reading-set #${id}.`);
			refreshData();
		},
		[coId, refreshData]
	);

	const historyColumns = React.useMemo<GridColDef<StitchTableRow>[]>(
		() => [
			{
				field: "entry_date",
				headerName: "Date",
				width: 110,
				valueFormatter: (value) =>
					value ? new Date(value as string).toLocaleDateString("en-IN") : "—",
			},
			{
				field: "machine",
				headerName: "MC No.",
				width: 150,
				valueGetter: (_value, row) => machineLabel(row),
			},
			{
				field: "std_stitch",
				headerName: "Std (st/dm)",
				width: 110,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null, 1),
			},
			{
				field: "avg",
				headerName: "Avg (st/dm)",
				width: 110,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "flag",
				headerName: "Flag",
				width: 90,
				sortable: false,
				renderCell: (params) => flagChip(params.row.flag),
			},
			{
				field: "inspector_name",
				headerName: "Inspector",
				flex: 1,
				minWidth: 140,
				valueGetter: (_value, row) => row.inspector_name ?? "—",
			},
			{
				field: "actions",
				headerName: "",
				width: 60,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Tooltip title="Delete">
						<IconButton size="small" color="error" onClick={() => handleDelete(params.row.stitch_id)}>
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
				Stitch SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-22 — sewing stitch density (stitches/dm). One save = {readingsCount} readings for one
				sewing machine and date; the server computes the average and the OK / LOW / HIGH flag
				against the standard.
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
				<Alert severity="info">Select a branch to load Stitch SQC data.</Alert>
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
									gridTemplateColumns: {
										xs: "1fr",
										sm: "repeat(2, minmax(0, 1fr))",
										md: "repeat(3, minmax(0, 1fr))",
									},
								}}
							>
								<Autocomplete
									options={setup.machines}
									getOptionLabel={(m) => `${m.machine_name} (${m.mech_code})`}
									value={setup.machines.find((m) => m.machine_id === machineId) ?? null}
									onChange={(_, val) => setMachineId(val ? val.machine_id : "")}
									size="small"
									renderInput={(params) => <TextField {...params} label="Sewing machine" />}
									isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
								/>
								<TextField
									type="number"
									label="Std stitch (st/dm)"
									value={stdStitch}
									onChange={(e) => setStdStitch(e.target.value)}
									size="small"
									fullWidth
									inputProps={{ step: "any", min: 0 }}
								/>
								<TextField
									label="Inspector (optional)"
									value={inspectorName}
									onChange={(e) => setInspectorName(e.target.value)}
									size="small"
									fullWidth
								/>
							</Box>
							<Divider />
							<Box
								sx={{
									display: "grid",
									gap: 1.5,
									gridTemplateColumns: {
										xs: "repeat(2, minmax(0, 1fr))",
										sm: `repeat(${readingsCount}, minmax(0, 1fr))`,
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
									label="Avg (preview)"
									value={previewAvg != null ? previewAvg.toFixed(2) : ""}
									size="small"
									InputProps={{ readOnly: true }}
								/>
								{flagChip(previewFlag)}
								<Typography variant="caption" color="text.secondary">
									Preview only — the server recomputes avg/flag on save.
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
											<TableCell>MC No.</TableCell>
											<TableCell>Readings (st/dm)</TableCell>
											<TableCell align="right">Std</TableCell>
											<TableCell align="right">Avg</TableCell>
											<TableCell>Flag</TableCell>
											<TableCell>Inspector</TableCell>
											<TableCell align="center">Delete</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{byDateRows.map((row) => (
											<TableRow key={row.stitch_id}>
												<TableCell>{machineLabel(row)}</TableCell>
												<TableCell>{(row.readings ?? []).map((n) => fmt(n, 1)).join(", ")}</TableCell>
												<TableCell align="right">{fmt(row.std_stitch, 1)}</TableCell>
												<TableCell align="right">{fmt(row.avg)}</TableCell>
												<TableCell>{flagChip(row.flag)}</TableCell>
												<TableCell>{row.inspector_name ?? "—"}</TableCell>
												<TableCell align="center">
													<IconButton
														size="small"
														color="error"
														onClick={() => handleDelete(row.stitch_id)}
													>
														<DeleteIcon size={16} />
													</IconButton>
												</TableCell>
											</TableRow>
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
								placeholder="Search machine or inspector"
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
								getRowId={(r) => r.stitch_id}
								columns={historyColumns}
								loading={tableLoading}
								paginationMode="server"
								rowCount={tableTotal}
								paginationModel={paginationModel}
								onPaginationModelChange={setPaginationModel}
								pageSizeOptions={[10, 25, 50]}
								disableRowSelectionOnClick
								density="compact"
								sx={{ minWidth: 760 }}
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
