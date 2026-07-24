"use client";

import * as React from "react";
import {
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	IconButton,
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
import { Eye as ViewIcon, Trash2 as DeleteIcon, X as CloseIcon } from "lucide-react";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { DEFAULT_BAND_LABELS, type PagedResponse, type RollWtRow } from "../types/spreaderSqcTypes";

type Props = {
	coId: string;
	/** By-date readings for the selected entry date (server-computed stats). */
	rows: RollWtRow[];
	loading: boolean;
	/** Bumped by the page after a save → refetch the history table. */
	refreshKey: number;
	/** Called after a delete so the page can refresh the by-date view. */
	onChanged: () => void;
};

const fmt = (v: number | null | undefined, d = 2) => (v == null ? "—" : Number(v).toFixed(d));
// calc_cv_pct is persisted as a RATIO (stdev/avg) — x100 for display.
const fmtCv = (v: number | null | undefined) => (v == null ? "—" : `${(Number(v) * 100).toFixed(2)}%`);

/**
 * R-08-04 read side: today's samples (by-date, delete + detail), plus the
 * paginated all-dates history (search + detail via by_id + delete).
 */
export default function RollWtGrid({ coId, rows, loading, refreshKey, onChanged }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [detail, setDetail] = React.useState<RollWtRow | null>(null);

	// ── History table (server-paginated) ──
	const [histRows, setHistRows] = React.useState<RollWtRow[]>([]);
	const [histTotal, setHistTotal] = React.useState(0);
	const [histLoading, setHistLoading] = React.useState(false);
	const [histModel, setHistModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchInput, setSearchInput] = React.useState("");
	const [histSearch, setHistSearch] = React.useState("");
	const [histVersion, setHistVersion] = React.useState(0);

	// Debounce the search box into the fetch param.
	React.useEffect(() => {
		const t = setTimeout(() => {
			setHistSearch(searchInput);
			setHistModel((prev) => (prev.page === 0 ? prev : { ...prev, page: 0 }));
		}, 500);
		return () => clearTimeout(t);
	}, [searchInput]);

	React.useEffect(() => {
		if (!coId) return;
		let cancelled = false;
		setHistLoading(true);
		const params = new URLSearchParams({
			co_id: coId,
			page: String(histModel.page + 1),
			limit: String(histModel.pageSize),
		});
		if (histSearch) params.append("search", histSearch);
		void fetchWithCookie<PagedResponse<RollWtRow>>(
			`${apiRoutesPortalMasters.SPREADER_ROLL_WT_TABLE}?${params.toString()}`,
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
	}, [coId, histModel, histSearch, histVersion, refreshKey]);

	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!confirm(`Delete roll weight sample #${id}?`)) return;
			const { error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.SPREADER_ROLL_WT_DELETE}/${id}`,
				"DELETE"
			);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted sample #${id}`);
			setHistVersion((v) => v + 1);
			onChanged();
		},
		[onChanged]
	);

	const handleViewById = React.useCallback(
		async (id: number) => {
			const { data, error } = await fetchWithCookie<{ data: RollWtRow }>(
				`${apiRoutesPortalMasters.SPREADER_ROLL_WT_BY_ID}?id=${id}&co_id=${coId}`,
				"GET"
			);
			if (error || !data?.data) {
				setSnack(error ?? "Sample not found");
				return;
			}
			setDetail(data.data);
		},
		[coId]
	);

	const statCols = React.useMemo<GridColDef<RollWtRow>[]>(
		() => [
			{
				field: "spell_code",
				headerName: "Spell",
				width: 100,
				valueGetter: (_v, row) => row.spell_code ?? "—",
			},
			{
				field: "machine_name",
				headerName: "Machine",
				width: 160,
				valueGetter: (_v, row) => row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—"),
			},
			{
				field: "jute_quality",
				headerName: "Quality",
				width: 150,
				valueGetter: (_v, row) => row.jute_quality ?? row.item_code ?? "—",
			},
			{ field: "feeder_name", headerName: "Feeder", width: 130, valueGetter: (_v, row) => row.feeder_name ?? "—" },
			{
				field: "calc_avg_obs",
				headerName: "Avg Obs (kg)",
				width: 120,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null, 2),
			},
			{
				field: "calc_avg_mr_pct",
				headerName: "Avg MR%",
				width: 100,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null, 2),
			},
			{
				field: "calc_avg_corr",
				headerName: "Avg Corr (kg)",
				width: 120,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null, 2),
			},
			{
				field: "calc_stdev_corr",
				headerName: "StDev Corr",
				width: 110,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null, 3),
			},
			{
				field: "calc_cv_pct",
				headerName: "CV%",
				width: 90,
				type: "number",
				valueFormatter: (value) => fmtCv(value as number | null),
			},
		],
		[]
	);

	const dayCols = React.useMemo<GridColDef<RollWtRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 90,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Box>
						<Tooltip title="View readings">
							<IconButton size="small" onClick={() => setDetail(params.row)}>
								<ViewIcon size={16} />
							</IconButton>
						</Tooltip>
						<Tooltip title="Delete sample">
							<IconButton
								size="small"
								color="error"
								onClick={() => handleDelete(params.row.spreader_roll_wt_id)}
							>
								<DeleteIcon size={16} />
							</IconButton>
						</Tooltip>
					</Box>
				),
			},
			...statCols,
		],
		[statCols, handleDelete]
	);

	const histCols = React.useMemo<GridColDef<RollWtRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 90,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Box>
						<Tooltip title="View readings">
							<IconButton size="small" onClick={() => handleViewById(params.row.spreader_roll_wt_id)}>
								<ViewIcon size={16} />
							</IconButton>
						</Tooltip>
						<Tooltip title="Delete sample">
							<IconButton
								size="small"
								color="error"
								onClick={() => handleDelete(params.row.spreader_roll_wt_id)}
							>
								<DeleteIcon size={16} />
							</IconButton>
						</Tooltip>
					</Box>
				),
			},
			{
				field: "entry_date",
				headerName: "Date",
				width: 110,
				valueGetter: (_v, row) =>
					row.entry_date ? new Date(row.entry_date).toLocaleDateString("en-IN") : "—",
			},
			...statCols,
		],
		[statCols, handleDelete, handleViewById]
	);

	const readings = detail?.roll_weights ?? [];
	const detailMrs = detail?.mr_pcts ?? [];

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			<Box>
				<Typography variant="subtitle2" sx={{ mb: 1 }}>
					Samples for selected date
				</Typography>
				<Box sx={{ width: "100%", overflowX: "auto" }}>
					<DataGrid
						autoHeight
						rows={rows}
						getRowId={(row) => row.spreader_roll_wt_id}
						columns={dayCols}
						loading={loading}
						disableRowSelectionOnClick
						density="compact"
						pageSizeOptions={[10, 25]}
						initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
						sx={{ minWidth: 1000 }}
					/>
				</Box>
			</Box>

			<Box>
				<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 1 }}>
					<Typography variant="subtitle2">History (all dates)</Typography>
					<TextField
						size="small"
						placeholder="Search feeder / quality / machine"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						sx={{ minWidth: 260 }}
					/>
				</Box>
				<Box sx={{ width: "100%", overflowX: "auto" }}>
					<DataGrid
						autoHeight
						rows={histRows}
						getRowId={(row) => row.spreader_roll_wt_id}
						columns={histCols}
						loading={histLoading}
						disableRowSelectionOnClick
						density="compact"
						paginationMode="server"
						rowCount={histTotal}
						paginationModel={histModel}
						onPaginationModelChange={setHistModel}
						pageSizeOptions={[10, 25, 50]}
						sx={{ minWidth: 1100 }}
					/>
				</Box>
			</Box>

			{/* ── Detail dialog ── */}
			<Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="md" fullWidth>
				<DialogTitle>
					Roll Weight Sample #{detail?.spreader_roll_wt_id}
					<IconButton onClick={() => setDetail(null)} sx={{ position: "absolute", right: 8, top: 8 }}>
						<CloseIcon size={18} />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers>
					{detail ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
							<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
								<Chip
									size="small"
									label={`Date: ${detail.entry_date ? new Date(detail.entry_date).toLocaleDateString("en-IN") : "—"}`}
								/>
								<Chip size="small" label={`Spell: ${detail.spell_code ?? "—"}`} />
								<Chip size="small" label={`Machine: ${detail.machine_name ?? "—"}`} />
								<Chip size="small" label={`Quality: ${detail.jute_quality ?? "—"}`} />
								<Chip size="small" label={`Feeder: ${detail.feeder_name ?? "—"}`} />
								<Chip size="small" label={`Std MR%: ${fmt(detail.std_mr_pct)}`} />
							</Box>

							<TableContainer component={Paper} variant="outlined">
								<Table size="small">
									<TableHead>
										<TableRow>
											<TableCell>#</TableCell>
											<TableCell align="right">Roll Wt (kg)</TableCell>
											<TableCell align="right">MR %</TableCell>
										</TableRow>
									</TableHead>
									<TableBody>
										{readings.map((w, i) => (
											<TableRow key={i}>
												<TableCell>R{i + 1}</TableCell>
												<TableCell align="right">{fmt(w, 2)}</TableCell>
												<TableCell align="right">{fmt(detailMrs[i], 2)}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</TableContainer>

							<Paper variant="outlined" sx={{ p: 2 }}>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									Computed (server)
								</Typography>
								<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
									<Chip size="small" label={`Avg Obs: ${fmt(detail.calc_avg_obs)} kg`} />
									<Chip size="small" label={`Avg MR%: ${fmt(detail.calc_avg_mr_pct)}`} />
									<Chip size="small" label={`Avg Corr: ${fmt(detail.calc_avg_corr)} kg`} />
									<Chip size="small" label={`StDev Obs: ${fmt(detail.calc_stdev_obs, 3)}`} />
									<Chip size="small" label={`StDev Corr: ${fmt(detail.calc_stdev_corr, 3)}`} />
									<Chip size="small" color="primary" label={`CV%: ${fmtCv(detail.calc_cv_pct)}`} />
								</Box>
							</Paper>

							{detail.band_counts_obs || detail.band_counts_corr ? (
								<TableContainer component={Paper} variant="outlined">
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>Weight band (kg)</TableCell>
												{DEFAULT_BAND_LABELS.map((l) => (
													<TableCell key={l} align="right">
														{l}
													</TableCell>
												))}
											</TableRow>
										</TableHead>
										<TableBody>
											<TableRow>
												<TableCell>Observed</TableCell>
												{DEFAULT_BAND_LABELS.map((l, i) => (
													<TableCell key={l} align="right">
														{detail.band_counts_obs?.[i] ?? "—"}
													</TableCell>
												))}
											</TableRow>
											<TableRow>
												<TableCell>Corrected</TableCell>
												{DEFAULT_BAND_LABELS.map((l, i) => (
													<TableCell key={l} align="right">
														{detail.band_counts_corr?.[i] ?? "—"}
													</TableCell>
												))}
											</TableRow>
										</TableBody>
									</Table>
								</TableContainer>
							) : null}
							<Typography variant="caption" color="text.secondary">
								Band labels use the default edges (55/60/65/70/75); machines with custom band edges keep
								their own snapshotted buckets.
							</Typography>
						</Box>
					) : null}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDetail(null)}>Close</Button>
				</DialogActions>
			</Dialog>

			<Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack ?? ""} />
		</Box>
	);
}
