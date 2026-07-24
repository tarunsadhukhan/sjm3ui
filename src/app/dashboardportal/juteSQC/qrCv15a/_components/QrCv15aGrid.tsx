"use client";

import * as React from "react";
import { Box, Collapse, IconButton, Paper, Snackbar, Tooltip, Typography } from "@mui/material";
import { Trash2 as DeleteOutlineIcon, ChevronDown, ChevronRight } from "lucide-react";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { QrCv15aGroup } from "../types";

type Props = {
	coId: string;
	groups: QrCv15aGroup[];
	loading: boolean;
	onDeleted: () => void;
};

// Render a numeric stat to fixed dp, or "—" for null/undefined.
function fmt(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

// Flat 12-reading strip for one expanded test.
function GroupDetail({ group }: { group: QrCv15aGroup }) {
	const readings = group.readings ?? [];
	if (readings.length === 0) {
		return (
			<Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
				No readings recorded for this test.
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

export default function QrCv15aGrid({ coId, groups, loading, onDeleted }: Props) {
	const [snack, setSnack] = React.useState<string | null>(null);
	// Which test rows have their reading strip expanded (keyed by qr_cv_15a_id —
	// insert-only duplicates still get distinct server ids, so it is collision-free).
	const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});

	const toggleExpand = React.useCallback((id: number) => {
		setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
	}, []);

	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!confirm(`Delete QR-CV special test #${id}?`)) return;
			const url = `${apiRoutesPortalMasters.QR_CV_15A_DELETE}/${id}?co_id=${coId}`;
			const { error } = await fetchWithCookie<{ data: { message: string } }>(url, "DELETE");
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted QR-CV special test #${id}`);
			onDeleted();
		},
		[coId, onDeleted]
	);

	const columns = React.useMemo<GridColDef<QrCv15aGroup>[]>(
		() => [
			{
				field: "expand",
				headerName: "",
				width: 50,
				sortable: false,
				filterable: false,
				renderCell: (params) => {
					const open = !!expanded[params.row.qr_cv_15a_id];
					return (
						<Tooltip title={open ? "Hide readings" : "Show readings"}>
							<IconButton size="small" onClick={() => toggleExpand(params.row.qr_cv_15a_id)}>
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
					<Tooltip title="Delete test">
						<IconButton
							size="small"
							color="error"
							onClick={() => handleDelete(params.row.qr_cv_15a_id)}
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
				field: "drawing_machine_name",
				headerName: "3RD DRG MC",
				width: 130,
				valueGetter: (_value, row) =>
					row.drawing_mech_code ??
					row.drawing_machine_name ??
					(row.drawing_mc_id != null ? `MC #${row.drawing_mc_id}` : "—"),
			},
			{
				field: "machine_name",
				headerName: "SPG FRAME",
				width: 130,
				valueGetter: (_value, row) =>
					row.mech_code ?? row.machine_name ?? (row.mc_id != null ? `MC #${row.mc_id}` : "—"),
			},
			{
				field: "observed_count",
				headerName: "OBS COUNT",
				width: 110,
				type: "number",
				valueGetter: (_value, row) => row.observed_count ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "mr_pct",
				headerName: "MR %",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => row.mr_pct ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "max",
				headerName: "MAX",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => row.stats?.max ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "min",
				headerName: "MIN",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => row.stats?.min ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "avg_bs",
				headerName: "AVG B/S",
				width: 100,
				type: "number",
				valueGetter: (_value, row) => row.stats?.avg_bs ?? null,
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
				field: "qr_pct",
				headerName: "QR %",
				width: 90,
				type: "number",
				valueGetter: (_value, row) => row.stats?.qr_pct ?? null,
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
				field: "qr_at_min",
				headerName: "QR @ MIN",
				width: 100,
				type: "number",
				valueGetter: (_value, row) => row.stats?.qr_at_min ?? null,
				valueFormatter: (value) => fmt(value as number | null),
			},
			{
				field: "n",
				headerName: "N",
				width: 60,
				type: "number",
				valueGetter: (_value, row) => row.stats?.n ?? 0,
			},
		],
		[expanded, handleDelete, toggleExpand]
	);

	const expandedRows = React.useMemo(
		() => groups.filter((g) => expanded[g.qr_cv_15a_id]),
		[groups, expanded]
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{/* Per-test summary: operator-entered header values + server-computed stats */}
			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<DataGrid
					autoHeight
					rows={groups}
					getRowId={(row) => row.qr_cv_15a_id}
					columns={columns}
					loading={loading}
					disableRowSelectionOnClick
					density="comfortable"
					pageSizeOptions={[10, 25, 50]}
					initialState={{
						pagination: { paginationModel: { pageSize: 25, page: 0 } },
					}}
					sx={{ minWidth: 1400 }}
				/>
			</Box>

			{/* Expandable flat reading strips for any toggled-open tests */}
			{expandedRows.map((row) => (
				<Collapse key={row.qr_cv_15a_id} in unmountOnExit>
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
