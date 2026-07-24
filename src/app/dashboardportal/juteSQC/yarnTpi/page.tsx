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
import { Trash2 as DeleteOutlineIcon } from "lucide-react";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import TpiForm from "./_components/TpiForm";
import TpiGrid from "./_components/TpiGrid";
import type { TpiSetup, TpiTableRow } from "./types";

function fmt(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

export default function YarnTpiSqcPage() {
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

	// ── Setup: machines + yarn items + saved studies for the date ──────────────
	// (setup already returns the by-date groups, so one fetch serves both the
	// pickers and the by-date view; refresh after save/delete re-fetches it)
	const [setup, setSetup] = React.useState<TpiSetup | null>(null);
	const [setupLoading, setSetupLoading] = React.useState(false);
	const [setupError, setSetupError] = React.useState<string | null>(null);
	const [version, setVersion] = React.useState(0);
	const refreshSetup = React.useCallback(() => setVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null || !entryDate) {
			setSetup(null);
			return;
		}
		let cancelled = false;
		setSetupLoading(true);
		const url = `${apiRoutesPortalMasters.YARN_TPI_SETUP}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: TpiSetup }>(url, "GET").then(({ data, error }) => {
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
	}, [coId, entryDate, branchId, version]);

	// ── History: paginated table of all saved studies (branch-scoped) ──────────
	const [histRows, setHistRows] = React.useState<TpiTableRow[]>([]);
	const [histTotal, setHistTotal] = React.useState(0);
	const [histLoading, setHistLoading] = React.useState(false);
	const [histVersion, setHistVersion] = React.useState(0);
	const [pagination, setPagination] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [search, setSearch] = React.useState("");
	const [debouncedSearch, setDebouncedSearch] = React.useState("");
	React.useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(search), 400);
		return () => clearTimeout(t);
	}, [search]);
	const refreshHistory = React.useCallback(() => setHistVersion((v) => v + 1), []);

	React.useEffect(() => {
		if (!coId || branchId == null) {
			setHistRows([]);
			setHistTotal(0);
			return;
		}
		let cancelled = false;
		setHistLoading(true);
		const params = new URLSearchParams({
			co_id: coId,
			branch_id: String(branchId),
			page: String(pagination.page + 1),
			limit: String(pagination.pageSize),
		});
		if (debouncedSearch) params.append("search", debouncedSearch);
		void fetchWithCookie<{ data: TpiTableRow[]; total: number }>(
			`${apiRoutesPortalMasters.YARN_TPI_TABLE}?${params}`,
			"GET"
		).then(({ data, error }) => {
			if (cancelled) return;
			if (error || !data) {
				setHistRows([]);
				setHistTotal(0);
			} else {
				setHistRows(data.data ?? []);
				setHistTotal(data.total ?? 0);
			}
			setHistLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, pagination.page, pagination.pageSize, debouncedSearch, histVersion]);

	const [snack, setSnack] = React.useState<string | null>(null);

	const onMutated = React.useCallback(() => {
		refreshSetup();
		refreshHistory();
	}, [refreshSetup, refreshHistory]);

	const handleHistoryDelete = React.useCallback(
		async (id: number) => {
			if (!confirm(`Delete TPI study #${id}?`)) return;
			const { error } = await fetchWithCookie<{ data: { message: string } }>(
				`${apiRoutesPortalMasters.YARN_TPI_DELETE}/${id}?co_id=${coId}`,
				"DELETE"
			);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted TPI study #${id}`);
			onMutated();
		},
		[coId, onMutated]
	);

	const histColumns = React.useMemo<GridColDef<TpiTableRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 60,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Tooltip title="Delete study">
						<IconButton
							size="small"
							color="error"
							onClick={() => handleHistoryDelete(params.row.yarn_tpi_id)}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteOutlineIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{
				field: "entry_date",
				headerName: "DATE",
				width: 110,
				valueGetter: (_value, row) =>
					row.entry_date ? new Date(row.entry_date).toLocaleDateString("en-IN") : "—",
			},
			{
				field: "yarn_quality",
				headerName: "QUALITY",
				width: 180,
				valueGetter: (_value, row) => row.yarn_quality ?? row.item_code ?? "—",
			},
			{
				field: "machine_name",
				headerName: "MC No.",
				width: 140,
				valueGetter: (_value, row) => row.mech_code ?? row.machine_name ?? "—",
			},
			{
				field: "count_lbs",
				headerName: "COUNT (lbs)",
				width: 110,
				type: "number",
				valueGetter: (_value, row) => row.count_lbs ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "std_tpi",
				headerName: "STD TPI",
				width: 100,
				type: "number",
				valueGetter: (_value, row) => row.std_tpi ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "tp_value",
				headerName: "TP",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => row.tp_value ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "prepared_by",
				headerName: "PREPARED BY",
				width: 150,
				valueGetter: (_value, row) => row.prepared_by ?? "—",
			},
		],
		[handleHistoryDelete]
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
				Yarn TPI SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-17 — Yarn TPI &amp; TPI CV% twist-uniformity study (20 readings per study).
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
				<Alert severity="info">Select a branch to load Yarn TPI data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
						<Typography variant="subtitle2">Study date</Typography>
						<TextField
							type="date"
							size="small"
							value={entryDate}
							onChange={(e) => setEntryDate(e.target.value)}
							InputLabelProps={{ shrink: true }}
						/>
					</Box>

					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<TpiForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onMutated}
						/>
					)}

					<Box>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Studies on {entryDate}
						</Typography>
						<TpiGrid
							coId={coId}
							groups={setup?.groups ?? []}
							loading={setupLoading}
							onDeleted={onMutated}
						/>
					</Box>

					<Box>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							History
						</Typography>
						<TextField
							size="small"
							label="Search"
							placeholder="Quality, machine or prepared by"
							value={search}
							onChange={(e) => {
								setSearch(e.target.value);
								setPagination((prev) => ({ ...prev, page: 0 }));
							}}
							sx={{ mb: 1.5, minWidth: 280 }}
						/>
						<Box sx={{ width: "100%", overflowX: "auto" }}>
							<DataGrid
								autoHeight
								rows={histRows}
								getRowId={(row) => row.yarn_tpi_id}
								columns={histColumns}
								loading={histLoading}
								rowCount={histTotal}
								paginationMode="server"
								paginationModel={pagination}
								onPaginationModelChange={setPagination}
								pageSizeOptions={[10, 25, 50]}
								disableRowSelectionOnClick
								density="comfortable"
								sx={{ minWidth: 940 }}
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
