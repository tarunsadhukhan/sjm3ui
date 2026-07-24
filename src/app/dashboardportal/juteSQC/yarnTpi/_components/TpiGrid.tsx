"use client";

import * as React from "react";
import { Box, Collapse, IconButton, Paper, Snackbar, Tooltip, Typography } from "@mui/material";
import { Trash2 as DeleteOutlineIcon, ChevronDown, ChevronRight } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { TpiGroup } from "../types";

type Props = {
	coId: string;
	groups: TpiGroup[];
	loading: boolean;
	onDeleted: () => void;
};

// Render a numeric stat to fixed dp, or "—" for null/undefined.
function fmt(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

// Flat 20-reading strip for one expanded study.
function GroupDetail({ group }: { group: TpiGroup }) {
	const readings = group.readings ?? [];
	if (readings.length === 0) {
		return (
			<Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
				No readings recorded for this study.
			</Typography>
		);
	}
	return (
		<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, py: 1 }}>
			{readings.map((r, i) => (
				<Box
					key={i}
					sx={{
						border: 1,
						borderColor: "divider",
						borderRadius: 1,
						px: 1.5,
						py: 0.5,
						minWidth: 64,
						textAlign: "center",
					}}
				>
					<Typography variant="caption" color="text.secondary" display="block">
						R{r.reading_no ?? i + 1}
					</Typography>
					<Typography variant="body2">{fmt(r.reading_val)}</Typography>
				</Box>
			))}
		</Box>
	);
}

export default function TpiGrid({ coId, groups, loading, onDeleted }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	// Which study rows have their reading strip expanded (keyed by yarn_tpi_id —
	// insert-only duplicates still get distinct server ids, so it is collision-free).
	const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});

	const toggleExpand = React.useCallback((id: number) => {
		setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
	}, []);

	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!confirm(`Delete TPI study #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.YARN_TPI_DELETE}/${id}?co_id=${coId}`;
			const { error } = await fetchWithCookie<{ data: { message: string } }>(url, "DELETE");
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted TPI study #${id}`);
			onDeleted();
		},
		[coId, onDeleted]
	);

	const columns = React.useMemo<GridColDef<TpiGroup>[]>(
		() => [
			{
				field: "expand",
				headerName: "",
				width: 50,
				sortable: false,
				filterable: false,
				renderCell: (params) => {
					const open = !!expanded[params.row.yarn_tpi_id];
					return (
						<Tooltip title={open ? "Hide readings" : "Show readings"}>
							<IconButton size="small" onClick={() => toggleExpand(params.row.yarn_tpi_id)}>
								{open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
							</IconButton>
						</Tooltip>
					);
				},
			},
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
							onClick={() => handleDelete(params.row.yarn_tpi_id)}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteOutlineIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
			{
				field: "item_name",
				headerName: "QUALITY",
				width: 180,
				valueGetter: (_value, row) => row.item_name ?? row.item_code ?? `Yarn #${row.item_id}`,
			},
			{
				field: "machine_name",
				headerName: "MC No.",
				width: 140,
				valueGetter: (_value, row) =>
					row.mech_code ?? row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—"),
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
				valueGetter: (_value, row) => row.stats?.std_tpi ?? row.std_tpi ?? null,
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
				field: "avg_tpi",
				headerName: "AVG TPI",
				width: 100,
				type: "number",
				valueGetter: (_value, row) => row.stats?.avg_tpi ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "std_dev",
				headerName: "STD DEV",
				width: 100,
				type: "number",
				valueGetter: (_value, row) => row.stats?.std_dev ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "cv_pct",
				headerName: "CV %",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => row.stats?.cv_pct ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "min_tpi",
				headerName: "MIN",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => row.stats?.min_tpi ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "max_tpi",
				headerName: "MAX",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => row.stats?.max_tpi ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "tpi_diff",
				headerName: "DIFF",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => row.stats?.tpi_diff ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "n",
				headerName: "N",
				width: 60,
				type: "number",
				valueGetter: (_value, row) => row.stats?.n ?? 0,
			},
			{
				field: "prepared_by",
				headerName: "PREPARED BY",
				width: 140,
				valueGetter: (_value, row) => row.prepared_by ?? "—",
			},
		],
		[expanded, handleDelete, toggleExpand]
	);

	const expandedRows = React.useMemo(
		() => groups.filter((g) => expanded[g.yarn_tpi_id]),
		[groups, expanded]
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{/* Per-study summary: header snapshots + server-computed stats */}
			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<DataGrid
					autoHeight
					rows={groups}
					getRowId={(row) => row.yarn_tpi_id}
					columns={columns}
					loading={loading}
					disableRowSelectionOnClick
					density="comfortable"
					pageSizeOptions={[10, 25, 50]}
					initialState={{
						pagination: { paginationModel: { pageSize: 25, page: 0 } },
					}}
					sx={{ minWidth: 1300 }}
				/>
			</Box>

			{/* Expandable flat reading strips for any toggled-open studies */}
			{expandedRows.map((row) => (
				<Collapse key={row.yarn_tpi_id} in unmountOnExit>
					<Paper variant="outlined" sx={{ p: 2 }}>
						<Typography variant="subtitle2" sx={{ mb: 1, color: "text.secondary" }}>
							Readings — {row.item_name ?? row.item_code ?? `Yarn #${row.item_id}`}
							{" · "}
							{row.mech_code ?? row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—")}
						</Typography>
						<GroupDetail group={row} />
					</Paper>
				</Collapse>
			))}

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
