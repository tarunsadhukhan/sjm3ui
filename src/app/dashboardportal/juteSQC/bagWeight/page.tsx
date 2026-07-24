"use client";

import * as React from "react";
import {
	Alert,
	Box,
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
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { Trash2 as DeleteIcon } from "lucide-react";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import BagWeightForm from "./_components/BagWeightForm";
import type { BagWeightBlock, BagWeightSetup, BagWeightTableRow } from "./types";

function fmt(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

function bagTypeLabelOf(row: {
	item_name?: string | null;
	item_code?: string | null;
	bag_type_label?: string | null;
}): string {
	return row.item_name ?? row.bag_type_label ?? row.item_code ?? "—";
}

function Stat({ label, value }: { label: string; value: string }) {
	return (
		<Box>
			<Typography variant="caption" color="text.secondary">
				{label}
			</Typography>
			<Typography variant="body2" fontWeight="bold">
				{value}
			</Typography>
		</Box>
	);
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function BagWeightSqcPage() {
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

	// ── Setup (bag types + defaults) ──
	const [setup, setSetup] = React.useState<BagWeightSetup | null>(null);
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
		void fetchWithCookie<{ data: BagWeightSetup }>(
			`${apiRoutesPortalMasters.BAG_WEIGHT_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`,
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

	// ── By-date blocks ──
	const [blocks, setBlocks] = React.useState<BagWeightBlock[]>([]);
	const [blocksLoading, setBlocksLoading] = React.useState(false);
	const [version, setVersion] = React.useState(0);
	const refreshData = React.useCallback(() => setVersion((v) => v + 1), []);
	React.useEffect(() => {
		if (!coId || branchId == null || !entryDate) {
			setBlocks([]);
			return;
		}
		let cancelled = false;
		setBlocksLoading(true);
		void fetchWithCookie<{ data: { blocks: BagWeightBlock[] } }>(
			`${apiRoutesPortalMasters.BAG_WEIGHT_BY_DATE}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`,
			"GET"
		).then(({ data, error }) => {
			if (cancelled) return;
			if (error || !data) setBlocks([]);
			else setBlocks(data.data?.blocks ?? []);
			setBlocksLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, entryDate, version]);

	// ── History table (server-paginated) ──
	const [tableRows, setTableRows] = React.useState<BagWeightTableRow[]>([]);
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
		void fetchWithCookie<{ data: BagWeightTableRow[]; total: number }>(
			`${apiRoutesPortalMasters.BAG_WEIGHT_TABLE}?${params.toString()}`,
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

	// ── Delete (POST endpoint with JSON body) ──
	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!window.confirm(`Delete bag weight block #${id}?`)) return;
			const { error } = await fetchWithCookie<{ message: string }>(
				apiRoutesPortalMasters.BAG_WEIGHT_DELETE,
				"POST",
				{ bag_weight_id: id, co_id: Number(coId) }
			);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted bag weight block #${id}.`);
			refreshData();
		},
		[coId, refreshData]
	);

	const historyColumns = React.useMemo<GridColDef<BagWeightTableRow>[]>(
		() => [
			{
				field: "entry_date",
				headerName: "Date",
				width: 110,
				valueFormatter: (value) =>
					value ? new Date(value as string).toLocaleDateString("en-IN") : "—",
			},
			{
				field: "bag_type",
				headerName: "Bag type",
				flex: 1,
				minWidth: 160,
				valueGetter: (_value, row) => bagTypeLabelOf(row),
			},
			{
				field: "std_bag_weight",
				headerName: "Std wt (gm)",
				width: 110,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null, 0),
			},
			{
				field: "avg_mr",
				headerName: "Avg MR %",
				width: 100,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "avg_obs",
				headerName: "Avg obs wt",
				width: 110,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "avg_corr",
				headerName: "Avg corr wt",
				width: 110,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "obs_cv_pct",
				headerName: "Obs CV %",
				width: 100,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "obs_hy_lt_pct",
				headerName: "Obs HY/LT %",
				width: 110,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "corr_hy_lt_pct",
				headerName: "Corr HY/LT %",
				width: 115,
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
							onClick={() => handleDelete(params.row.bag_weight_id)}
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
				Bag Weight SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-23 — finished-bag weight control. One save = one (date, bag type) block of MR% +
				observed weight rows; the server computes MR-corrected weights, averages, CV% and the
				heavy/light percents vs the standard bag weight.
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
				<Alert severity="info">Select a branch to load Bag Weight SQC data.</Alert>
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
						<BagWeightForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={refreshData}
						/>
					)}

					{/* ── By-date blocks ── */}
					<Box>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Blocks on {entryDate}
						</Typography>
						{blocksLoading ? (
							<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
								<CircularProgress size={28} />
							</Box>
						) : blocks.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								No bag-weight blocks for this date.
							</Typography>
						) : (
							<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
								{blocks.map((block) => (
									<Paper key={block.bag_weight_id} variant="outlined" sx={{ p: 2 }}>
										<Box
											sx={{
												display: "flex",
												alignItems: "center",
												gap: 2,
												flexWrap: "wrap",
												mb: 1,
											}}
										>
											<Typography variant="subtitle2">{bagTypeLabelOf(block)}</Typography>
											<Typography variant="caption" color="text.secondary">
												Std wt: {fmt(block.std_bag_weight, 0)} gm · Std MR:{" "}
												{fmt(block.std_mr_pct, 1)}%
											</Typography>
											<Box sx={{ flexGrow: 1 }} />
											<Tooltip title="Delete block">
												<IconButton
													size="small"
													color="error"
													onClick={() => handleDelete(block.bag_weight_id)}
												>
													<DeleteIcon size={16} />
												</IconButton>
											</Tooltip>
										</Box>
										<TableContainer sx={{ maxWidth: 520, mb: 1 }}>
											<Table size="small">
												<TableHead>
													<TableRow>
														<TableCell>Sl</TableCell>
														<TableCell align="right">MR %</TableCell>
														<TableCell align="right">Obs wt (gm)</TableCell>
														<TableCell align="right">Corr wt (gm)</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{(block.readings ?? []).map((r, i) => (
														<TableRow key={i}>
															<TableCell>{i + 1}</TableCell>
															<TableCell align="right">{fmt(r.mr)}</TableCell>
															<TableCell align="right">{fmt(r.obs)}</TableCell>
															<TableCell align="right">{fmt(r.corr)}</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</TableContainer>
										<Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
											<Stat label="Avg MR %" value={fmt(block.avg_mr)} />
											<Stat label="Avg obs wt" value={fmt(block.avg_obs)} />
											<Stat label="Avg corr wt" value={fmt(block.avg_corr)} />
											<Stat label="Obs std dev" value={fmt(block.obs_stdev, 3)} />
											<Stat label="Obs CV %" value={fmt(block.obs_cv_pct)} />
											<Stat label="Obs HY/LT %" value={fmt(block.obs_hy_lt_pct)} />
											<Stat label="Corr HY/LT %" value={fmt(block.corr_hy_lt_pct)} />
										</Box>
									</Paper>
								))}
							</Box>
						)}
					</Box>

					{/* ── History ── */}
					<Box>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 1 }}>
							<Typography variant="subtitle2">History</Typography>
							<TextField
								size="small"
								placeholder="Search bag type"
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
								getRowId={(r) => r.bag_weight_id}
								columns={historyColumns}
								loading={tableLoading}
								paginationMode="server"
								rowCount={tableTotal}
								paginationModel={paginationModel}
								onPaginationModelChange={setPaginationModel}
								pageSizeOptions={[10, 25, 50]}
								disableRowSelectionOnClick
								density="compact"
								sx={{ minWidth: 1000 }}
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
