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
// ponytail: PagedResponse reused from the sibling spreader SQC page (same envelope).
import type { PagedResponse } from "../../spreader/types/spreaderSqcTypes";
import { ADDITIVE_FIELDS, type EmulsionRow, type EmulsionStatus } from "../types/emulsionTypes";

type Props = {
	coId: string;
	/** By-date rows for the selected entry date (server-enriched status). */
	rows: EmulsionRow[];
	loading: boolean;
	/** Bumped by the page after a save → refetch the history table. */
	refreshKey: number;
	/** Called after a delete so the page can refresh the by-date view. */
	onChanged: () => void;
};

const fmt = (v: number | null | undefined, d = 2) => (v == null ? "—" : Number(v).toFixed(d));

const STATUS_COLOR: Record<EmulsionStatus, "success" | "warning" | "error"> = {
	OK: "success",
	LOW: "warning",
	HIGH: "error",
};

function statusChip(status: EmulsionStatus | null | undefined) {
	return status ? <Chip size="small" color={STATUS_COLOR[status]} label={status} /> : <>—</>;
}

/**
 * R-08-02 read side: the selected date's recipe rows (delete + full-recipe
 * detail — by-date rows carry every stored column), plus the paginated
 * all-dates history (summary columns only; no by-id endpoint exists).
 */
export default function EmulsionGrid({ coId, rows, loading, refreshKey, onChanged }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	const [detail, setDetail] = React.useState<EmulsionRow | null>(null);

	// ── History table (server-paginated) ──
	const [histRows, setHistRows] = React.useState<EmulsionRow[]>([]);
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
		void fetchWithCookie<PagedResponse<EmulsionRow>>(
			`${apiRoutesPortalMasters.EMULSION_TABLE}?${params.toString()}`,
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
			if (!confirm(`Delete emulsion recipe #${id}?`)) return;
			// Emulsion delete is a POST with a JSON body (unlike the spreader DELETEs).
			const { error } = await fetchWithCookie<{ message: string }>(
				apiRoutesPortalMasters.EMULSION_DELETE,
				"POST",
				{ emulsion_id: id, co_id: Number(coId) }
			);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted recipe #${id}`);
			setHistVersion((v) => v + 1);
			onChanged();
		},
		[coId, onChanged]
	);

	const statCols = React.useMemo<GridColDef<EmulsionRow>[]>(
		() => [
			{
				field: "machine_name",
				headerName: "Machine",
				width: 150,
				valueGetter: (_v, row) => row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—"),
			},
			{
				field: "oil_used_ltr",
				headerName: "Oil Used (ltr)",
				width: 120,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null, 2),
			},
			{
				field: "tank_capacity_ltr",
				headerName: "Tank (ltr)",
				width: 100,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null, 0),
			},
			{
				field: "oil_pct_in_emulsion",
				headerName: "Oil %",
				width: 90,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null, 2),
			},
			{
				field: "std_band",
				headerName: "Std Band",
				width: 100,
				sortable: false,
				valueGetter: (_v, row) =>
					row.std_oil_pct_low != null && row.std_oil_pct_high != null
						? `${fmt(row.std_oil_pct_low, 1)}–${fmt(row.std_oil_pct_high, 1)}`
						: "—",
			},
			{
				field: "oil_pct_status",
				headerName: "Status",
				width: 90,
				sortable: false,
				renderCell: (params) => statusChip(params.row.oil_pct_status),
			},
		],
		[]
	);

	const dayCols = React.useMemo<GridColDef<EmulsionRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 90,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Box>
						<Tooltip title="View recipe">
							<IconButton size="small" onClick={() => setDetail(params.row)}>
								<ViewIcon size={16} />
							</IconButton>
						</Tooltip>
						<Tooltip title="Delete recipe">
							<IconButton size="small" color="error" onClick={() => handleDelete(params.row.emulsion_id)}>
								<DeleteIcon size={16} />
							</IconButton>
						</Tooltip>
					</Box>
				),
			},
			...statCols,
			{
				field: "theoretical_oil_pct",
				headerName: "Theoretical %",
				width: 110,
				type: "number",
				valueFormatter: (value) => fmt(value as number | null, 2),
			},
			{
				field: "spreader_rolls_made",
				headerName: "Rolls Made",
				width: 100,
				type: "number",
				valueFormatter: (value) => (value == null ? "—" : String(value)),
			},
			{
				field: "prepared_by",
				headerName: "Prepared By",
				width: 130,
				valueGetter: (_v, row) => row.prepared_by ?? "—",
			},
		],
		[statCols, handleDelete]
	);

	const histCols = React.useMemo<GridColDef<EmulsionRow>[]>(
		() => [
			{
				field: "actions",
				headerName: "",
				width: 60,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Tooltip title="Delete recipe">
						<IconButton size="small" color="error" onClick={() => handleDelete(params.row.emulsion_id)}>
							<DeleteIcon size={16} />
						</IconButton>
					</Tooltip>
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
		[statCols, handleDelete]
	);

	// Non-null additive rows of the recipe being viewed.
	const detailAdditives = detail
		? ADDITIVE_FIELDS.filter((f) => detail[f.key] != null).map((f) => ({
				label: f.label,
				value: detail[f.key] as number,
		  }))
		: [];

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
			<Box>
				<Typography variant="subtitle2" sx={{ mb: 1 }}>
					Recipes for selected date
				</Typography>
				<Box sx={{ width: "100%", overflowX: "auto" }}>
					<DataGrid
						autoHeight
						rows={rows}
						getRowId={(row) => row.emulsion_id}
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
						placeholder="Search machine / prepared by"
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						sx={{ minWidth: 260 }}
					/>
				</Box>
				<Box sx={{ width: "100%", overflowX: "auto" }}>
					<DataGrid
						autoHeight
						rows={histRows}
						getRowId={(row) => row.emulsion_id}
						columns={histCols}
						loading={histLoading}
						disableRowSelectionOnClick
						density="compact"
						paginationMode="server"
						rowCount={histTotal}
						paginationModel={histModel}
						onPaginationModelChange={setHistModel}
						pageSizeOptions={[10, 25, 50]}
						sx={{ minWidth: 900 }}
					/>
				</Box>
			</Box>

			{/* ── Detail dialog (full recipe) ── */}
			<Dialog open={!!detail} onClose={() => setDetail(null)} maxWidth="sm" fullWidth>
				<DialogTitle>
					Emulsion Recipe #{detail?.emulsion_id}
					<IconButton onClick={() => setDetail(null)} sx={{ position: "absolute", right: 8, top: 8 }}>
						<CloseIcon size={18} />
					</IconButton>
				</DialogTitle>
				<DialogContent dividers>
					{detail ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
							<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
								<Chip
									size="small"
									label={`Date: ${detail.entry_date ? new Date(detail.entry_date).toLocaleDateString("en-IN") : "—"}`}
								/>
								<Chip size="small" label={`Machine: ${detail.machine_name ?? "—"}`} />
								<Chip size="small" label={`Oil Used: ${fmt(detail.oil_used_ltr)} ltr`} />
								<Chip size="small" label={`Tank: ${fmt(detail.tank_capacity_ltr, 0)} ltr`} />
								<Chip size="small" label={`Oil %: ${fmt(detail.oil_pct_in_emulsion)}`} />
								<Chip size="small" label={`Theoretical %: ${fmt(detail.theoretical_oil_pct)}`} />
								<Chip
									size="small"
									label={`Band: ${fmt(detail.std_oil_pct_low, 1)}–${fmt(detail.std_oil_pct_high, 1)}`}
								/>
								{statusChip(detail.oil_pct_status)}
							</Box>

							{detailAdditives.length > 0 ? (
								<TableContainer component={Paper} variant="outlined">
									<Table size="small">
										<TableHead>
											<TableRow>
												<TableCell>Additive</TableCell>
												<TableCell align="right">Qty</TableCell>
											</TableRow>
										</TableHead>
										<TableBody>
											{detailAdditives.map((a) => (
												<TableRow key={a.label}>
													<TableCell>{a.label}</TableCell>
													<TableCell align="right">{fmt(a.value, 2)}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</TableContainer>
							) : (
								<Typography variant="body2" color="text.secondary">
									No additives recorded.
								</Typography>
							)}

							<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
								<Chip size="small" label={`Rolls Made: ${detail.spreader_rolls_made ?? "—"}`} />
								<Chip size="small" label={`Others: ${detail.others ?? "—"}`} />
								<Chip size="small" label={`Prepared By: ${detail.prepared_by ?? "—"}`} />
							</Box>
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
