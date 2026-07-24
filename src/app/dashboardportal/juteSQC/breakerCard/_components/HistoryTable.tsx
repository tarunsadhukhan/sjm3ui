"use client";

import * as React from "react";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
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
import { Eye as ViewIcon, Trash2 as DeleteIcon, X as CloseIcon } from "lucide-react";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { fmt, fmtCv, type BreakerCardRow, type BreakerCardTableRow } from "../types";

type Props = {
	coId: string;
	branchId: number;
	/** Bumped by the parent after a save / day-grid delete so history refetches. */
	version: number;
	/** Called after a delete here so the parent can refresh the day view too. */
	onChanged: () => void;
};

function fmtDate(v: string | null | undefined): string {
	if (!v) return "—";
	const d = new Date(v);
	return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("en-IN");
}

export default function HistoryTable({ coId, branchId, version, onChanged }: Props) {
	const [rows, setRows] = React.useState<BreakerCardTableRow[]>([]);
	const [total, setTotal] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
		page: 0,
		pageSize: 10,
	});
	const [search, setSearch] = React.useState("");
	const [debouncedSearch, setDebouncedSearch] = React.useState("");
	const [snack, setSnack] = React.useState<string | null>(null);

	// View dialog
	const [viewRow, setViewRow] = React.useState<BreakerCardRow | null>(null);
	const [viewOpen, setViewOpen] = React.useState(false);
	const [viewLoading, setViewLoading] = React.useState(false);

	React.useEffect(() => {
		const t = setTimeout(() => setDebouncedSearch(search), 500);
		return () => clearTimeout(t);
	}, [search]);

	React.useEffect(() => {
		let cancelled = false;
		setLoading(true);
		const params = new URLSearchParams({
			co_id: coId,
			branch_id: String(branchId),
			page: String(paginationModel.page + 1),
			limit: String(paginationModel.pageSize),
		});
		if (debouncedSearch) params.append("search", debouncedSearch);
		void fetchWithCookie<{ data: BreakerCardTableRow[]; total: number }>(
			`${apiRoutesPortalMasters.BREAKER_CARD_SWT_TABLE}?${params}`,
			"GET"
		).then(({ data, error }) => {
			if (cancelled) return;
			if (error || !data) {
				setSnack(error ?? "Failed to load history");
				setRows([]);
				setTotal(0);
			} else {
				setRows(data.data ?? []);
				setTotal(data.total ?? 0);
			}
			setLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, paginationModel.page, paginationModel.pageSize, debouncedSearch, version]);

	const handleView = React.useCallback(
		async (id: number) => {
			setViewOpen(true);
			setViewLoading(true);
			const { data, error } = await fetchWithCookie<{ data: BreakerCardRow }>(
				`${apiRoutesPortalMasters.BREAKER_CARD_SWT_BY_ID}?id=${id}&co_id=${coId}`,
				"GET"
			);
			setViewLoading(false);
			if (error || !data) {
				setSnack(error ?? "Failed to load reading");
				setViewOpen(false);
				return;
			}
			setViewRow(data.data);
		},
		[coId]
	);

	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!confirm(`Delete breaker card reading #${id}?`)) return;
			const { error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.BREAKER_CARD_SWT_DELETE}/${id}`,
				"DELETE"
			);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted reading #${id}`);
			onChanged();
		},
		[onChanged]
	);

	const columns = React.useMemo<GridColDef<BreakerCardTableRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 100,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<>
						<Tooltip title="View reading">
							<IconButton
								size="small"
								onClick={() => handleView(params.row.breaker_card_swt_id)}
							>
								<ViewIcon size={16} />
							</IconButton>
						</Tooltip>
						<Tooltip title="Delete reading">
							<IconButton
								size="small"
								color="error"
								onClick={() => handleDelete(params.row.breaker_card_swt_id)}
							>
								<DeleteIcon size={16} />
							</IconButton>
						</Tooltip>
					</>
				),
			},
			{
				field: "entry_date",
				headerName: "Date",
				width: 110,
				valueGetter: (_value, row) => fmtDate(row.entry_date),
			},
			{
				field: "spell_code",
				headerName: "Spell",
				width: 90,
				valueGetter: (_value, row) =>
					row.spell_code ?? (row.spell_id != null ? `#${row.spell_id}` : "—"),
			},
			{
				field: "machine_name",
				headerName: "Machine",
				width: 160,
				valueGetter: (_value, row) =>
					row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—"),
			},
			{
				field: "batch_plan_name",
				headerName: "Batch",
				width: 150,
				valueGetter: (_value, row) =>
					row.batch_plan_name ??
					(row.batch_plan_id != null ? `Batch #${row.batch_plan_id}` : "—"),
			},
			{ field: "card_side", headerName: "Side", width: 90 },
			{
				field: "calc_wt",
				headerName: "Avg Wt",
				width: 100,
				valueGetter: (_value, row) => fmt(row.calc_wt, 3),
			},
			{
				field: "calc_mr_pct",
				headerName: "Avg MR%",
				width: 100,
				valueGetter: (_value, row) => fmt(row.calc_mr_pct, 2),
			},
			{
				field: "calc_corr_wt",
				headerName: "Corr Wt",
				width: 100,
				valueGetter: (_value, row) => fmt(row.calc_corr_wt, 3),
			},
			{
				field: "calc_cv_pct",
				headerName: "CV %",
				width: 100,
				valueGetter: (_value, row) => fmtCv(row.calc_cv_pct),
			},
		],
		[handleView, handleDelete]
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<TextField
				label="Search machine / batch / quality"
				size="small"
				value={search}
				onChange={(e) => {
					setSearch(e.target.value);
					setPaginationModel((prev) => ({ ...prev, page: 0 }));
				}}
				sx={{ maxWidth: 360 }}
			/>
			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<DataGrid
					autoHeight
					rows={rows}
					getRowId={(row) => row.breaker_card_swt_id}
					columns={columns}
					loading={loading}
					disableRowSelectionOnClick
					density="compact"
					paginationMode="server"
					rowCount={total}
					paginationModel={paginationModel}
					onPaginationModelChange={setPaginationModel}
					pageSizeOptions={[10, 25, 50]}
					sx={{ minWidth: 1100 }}
				/>
			</Box>

			{/* View dialog — full readings via BY_ID */}
			<Dialog open={viewOpen} onClose={() => setViewOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>
					Breaker Card Reading
					<IconButton
						onClick={() => setViewOpen(false)}
						sx={{ position: "absolute", right: 8, top: 8 }}
					>
						<CloseIcon size={18} />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers>
					{viewLoading || !viewRow ? (
						<Typography>Loading…</Typography>
					) : (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
							<Box
								sx={{
									display: "grid",
									gap: 1.5,
									gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
								}}
							>
								{(
									[
										["Date", fmtDate(viewRow.entry_date)],
										["Spell", viewRow.spell_code ?? "—"],
										["Machine", viewRow.machine_name ?? "—"],
										[
											"Batch",
											viewRow.batch_plan_name ??
												(viewRow.batch_plan_id != null
													? `Batch #${viewRow.batch_plan_id}`
													: "—"),
										],
										["Card Side", viewRow.card_side ?? "—"],
										["STD MR %", fmt(viewRow.std_mr_pct, 2)],
									] as const
								).map(([label, value]) => (
									<Box key={label}>
										<Typography variant="caption" color="text.secondary">
											{label}
										</Typography>
										<Typography variant="body2">{value}</Typography>
									</Box>
								))}
							</Box>
							<TableContainer>
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>#</TableCell>
											<TableCell align="right">WEIGHT (LB/5 yds)</TableCell>
											<TableCell align="right">MR %</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{(viewRow.weights ?? []).map((w, i) => (
											<TableRow key={i}>
												<TableCell>{i + 1}</TableCell>
												<TableCell align="right">{fmt(w, 2)}</TableCell>
												<TableCell align="right">
													{fmt((viewRow.mr_pcts ?? [])[i], 1)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>
							<Box
								sx={{
									display: "grid",
									gap: 1.5,
									gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
								}}
							>
								{(
									[
										["Avg Wt", fmt(viewRow.calc_wt, 3)],
										["Avg MR %", fmt(viewRow.calc_mr_pct, 2)],
										["Corr Wt", fmt(viewRow.calc_corr_wt, 3)],
										["Std Dev", fmt(viewRow.calc_sdev, 4)],
										["CV %", fmtCv(viewRow.calc_cv_pct)],
									] as const
								).map(([label, value]) => (
									<Box key={label}>
										<Typography variant="caption" color="text.secondary">
											{label}
										</Typography>
										<Typography variant="body2" fontWeight="bold">
											{value}
										</Typography>
									</Box>
								))}
							</Box>
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setViewOpen(false)}>Close</Button>
				</DialogActions>
			</Dialog>

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
