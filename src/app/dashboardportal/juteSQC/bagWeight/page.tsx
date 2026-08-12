"use client";

import * as React from "react";
import {
	Alert,
	Box,
	CircularProgress,
	IconButton,
	MenuItem,
	Snackbar,
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
import BagWeightSheet, { bagTypeLabelOf, fmt } from "./_components/BagWeightSheet";
import type { BagWeightBlock, BagWeightSetup, BagWeightTableRow } from "./types";

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
			if (!window.confirm(`Delete bag weight sheet #${id}?`)) return;
			const { error } = await fetchWithCookie<{ message: string }>(
				apiRoutesPortalMasters.BAG_WEIGHT_DELETE,
				"POST",
				{ bag_weight_id: id, co_id: Number(coId) }
			);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted bag weight sheet #${id}.`);
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
				field: "size",
				headerName: "Size (cm)",
				width: 110,
				sortable: false,
				valueGetter: (_value, row) =>
					row.std_length_cm != null && row.std_width_cm != null
						? `${fmt(row.std_length_cm, 0)} × ${fmt(row.std_width_cm, 0)}`
						: "—",
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
				headerName: "Actual M.R. %",
				width: 115,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "avg_obs",
				headerName: "Actual bag wt",
				width: 120,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "avg_corr",
				headerName: "Correct bag wt",
				width: 125,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "obs_cv_pct",
				headerName: "C.V. %",
				width: 90,
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
				field: "above_pct",
				headerName: "Above %",
				width: 110,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null),
				renderHeader: () => (
					<Tooltip title="% of corrected weights above the sheet's threshold">
						<span className="MuiDataGrid-columnHeaderTitle">Above %</span>
					</Tooltip>
				),
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
				R-08-23 — finished-bag weight control. One save = one dated sheet: per-bag length, width,
				ends, picks, stitch, bag weight and M.R.%; the server computes the MR-corrected weights,
				the actual/correct bag-weight averages with their heavy-light percents, C.V.% and the
				share above the threshold weight.
			</Typography>

			{sidebarBranchIds.length > 1 ? (
				<TextField
					select
					size="small"
					label="Branch"
					value={pageBranchId}
					onChange={(e) => setPageBranchId(e.target.value === "" ? "" : Number(e.target.value))}
					sx={{ mb: 2, width: { xs: "100%", sm: 240 } }}
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
							Sheets on {entryDate}
						</Typography>
						{blocksLoading ? (
							<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
								<CircularProgress size={28} />
							</Box>
						) : blocks.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								No bag-weight sheets for this date.
							</Typography>
						) : (
							<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
								{blocks.map((block) => (
									<BagWeightSheet
										key={block.bag_weight_id}
										block={block}
										entryDate={entryDate}
										actions={
											<Tooltip title="Delete sheet">
												<IconButton
													size="small"
													color="error"
													onClick={() => handleDelete(block.bag_weight_id)}
												>
													<DeleteIcon size={16} />
												</IconButton>
											</Tooltip>
										}
									/>
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
								sx={{ width: { xs: "100%", sm: 260 } }}
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
								sx={{ minWidth: 1200 }}
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
