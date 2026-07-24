"use client";

import * as React from "react";
import {
	Box,
	IconButton,
	Paper,
	Snackbar,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import { Trash2 as DeleteIcon } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { fmt, fmtCv, type CardSliverRow, type GrandAverage, type SectionAverage } from "../types";

type Props = {
	rows: CardSliverRow[];
	sectionAverages: SectionAverage[];
	grandAverages: GrandAverage[];
	loading: boolean;
	onDeleted: () => void;
};

export default function DayGrid({ rows, sectionAverages, grandAverages, loading, onDeleted }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);

	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!confirm(`Delete card sliver reading #${id}?`)) return;
			const { error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.CARD_SLIVER_WT_DELETE}/${id}`,
				"DELETE"
			);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted reading #${id}`);
			onDeleted();
		},
		[onDeleted]
	);

	const columns = React.useMemo<GridColDef<CardSliverRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 60,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Tooltip title="Delete reading">
						<IconButton
							size="small"
							color="error"
							onClick={() => handleDelete(params.row.card_sliver_wt_id)}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{ field: "section", headerName: "Section", width: 120 },
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
			{
				field: "weights",
				headerName: "Weights (LB/5 yds)",
				width: 200,
				sortable: false,
				valueGetter: (_value, row) => (row.weights ?? []).map((w) => fmt(w, 2)).join(" | "),
			},
			{
				field: "mr_pcts",
				headerName: "MR %",
				width: 200,
				sortable: false,
				valueGetter: (_value, row) => (row.mr_pcts ?? []).map((m) => fmt(m, 1)).join(" | "),
			},
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
				field: "calc_sdev",
				headerName: "Std Dev",
				width: 100,
				valueGetter: (_value, row) => fmt(row.calc_sdev, 4),
			},
			{
				field: "calc_cv_pct",
				headerName: "CV %",
				width: 100,
				valueGetter: (_value, row) => fmtCv(row.calc_cv_pct),
			},
		],
		[handleDelete]
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{/* Day's readings */}
			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<DataGrid
					autoHeight
					rows={rows}
					getRowId={(row) => row.card_sliver_wt_id}
					columns={columns}
					loading={loading}
					disableRowSelectionOnClick
					density="compact"
					pageSizeOptions={[10, 25, 50]}
					initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
					sx={{ minWidth: 1300 }}
				/>
			</Box>

			{/* Per-section footer averages (mean of per-row stats, recomputed server-side at read) */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
					Section Averages
				</Typography>
				{sectionAverages.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No readings yet for this date.
					</Typography>
				) : (
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>SECTION</TableCell>
									<TableCell align="right">ROWS</TableCell>
									<TableCell align="right">AVG OBS</TableCell>
									<TableCell align="right">AVG MR %</TableCell>
									<TableCell align="right">AVG CORR</TableCell>
									<TableCell align="right">AVG SDEV</TableCell>
									<TableCell align="right">AVG CV %</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{sectionAverages.map((s) => (
									<TableRow key={s.section}>
										<TableCell>{s.section}</TableCell>
										<TableCell align="right">{s.row_count}</TableCell>
										<TableCell align="right">{fmt(s.avg_obs, 3)}</TableCell>
										<TableCell align="right">{fmt(s.avg_mr_pct, 2)}</TableCell>
										<TableCell align="right">{fmt(s.avg_corr_wt, 3)}</TableCell>
										<TableCell align="right">{fmt(s.avg_sdev, 4)}</TableCell>
										<TableCell align="right">{fmtCv(s.avg_cv_pct)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</Paper>

			{/* Per-batch grand averages (pooled corrected cuts, recomputed server-side at read) */}
			<Paper variant="outlined" sx={{ p: 2 }}>
				<Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
					Grand Average by Batch
				</Typography>
				{grandAverages.length === 0 ? (
					<Typography variant="body2" color="text.secondary">
						No readings yet for this date.
					</Typography>
				) : (
					<TableContainer>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>BATCH</TableCell>
									<TableCell align="right">ROWS</TableCell>
									<TableCell align="right">OBS WT</TableCell>
									<TableCell align="right">MR %</TableCell>
									<TableCell align="right">CORR WT</TableCell>
									<TableCell align="right">CV %</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{grandAverages.map((g) => (
									<TableRow key={g.batch_plan_id}>
										<TableCell>
											{g.batch_plan_name ?? `Batch #${g.batch_plan_id}`}
										</TableCell>
										<TableCell align="right">{g.row_count}</TableCell>
										<TableCell align="right">{fmt(g.grand_obs, 3)}</TableCell>
										<TableCell align="right">{fmt(g.grand_mr_pct, 2)}</TableCell>
										<TableCell align="right">{fmt(g.grand_corr_wt, 3)}</TableCell>
										<TableCell
											align="right"
											sx={
												g.cv_within_band === 0
													? { color: "error.main", fontWeight: 700 }
													: undefined
											}
										>
											{fmtCv(g.grand_cv_pct)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</Paper>

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
