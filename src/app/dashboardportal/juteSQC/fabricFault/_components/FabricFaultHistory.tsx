"use client";

import * as React from "react";
import { Box, IconButton, TextField, Tooltip } from "@mui/material";
import { Trash2 as DeleteIcon } from "lucide-react";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { FabricFaultHistoryRow } from "../types";

type Props = {
	coId: string;
	// Bumped by the page after save/delete so the table refetches.
	version: number;
	onDelete: (id: number) => void;
};

function fmtDate(d: string | null): string {
	return d ? new Date(d).toLocaleDateString("en-IN") : "—";
}

export default function FabricFaultHistory({ coId, version, onDelete }: Props) {
	const [rows, setRows] = React.useState<FabricFaultHistoryRow[]>([]);
	const [total, setTotal] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({
		page: 0,
		pageSize: 10,
	});
	const [search, setSearch] = React.useState("");
	const [debounced, setDebounced] = React.useState("");

	React.useEffect(() => {
		const t = setTimeout(() => setDebounced(search), 400);
		return () => clearTimeout(t);
	}, [search]);

	// New search → back to page 0 (identity-stable when already there).
	React.useEffect(() => {
		setPaginationModel((p) => (p.page === 0 ? p : { ...p, page: 0 }));
	}, [debounced]);

	React.useEffect(() => {
		if (!coId) return;
		let cancelled = false;
		setLoading(true);
		const params = new URLSearchParams({
			co_id: coId,
			page: String(paginationModel.page + 1),
			limit: String(paginationModel.pageSize),
		});
		if (debounced) params.append("search", debounced);
		const url = `${apiRoutesPortalMasters.FABRIC_FAULT_TABLE}?${params}`;
		void fetchWithCookie<{ data: FabricFaultHistoryRow[]; total: number }>(url, "GET").then(
			({ data, error }) => {
				if (cancelled) return;
				setRows(error ? [] : data?.data ?? []);
				setTotal(error ? 0 : data?.total ?? 0);
				setLoading(false);
			}
		);
		return () => {
			cancelled = true;
		};
	}, [coId, paginationModel.page, paginationModel.pageSize, debounced, version]);

	const columns = React.useMemo<GridColDef<FabricFaultHistoryRow>[]>(
		() => [
			{
				field: "entry_date",
				headerName: "Date",
				width: 110,
				valueFormatter: (value) => fmtDate(value as string | null),
			},
			{
				field: "item_name",
				headerName: "Cloth Quality",
				flex: 1,
				minWidth: 160,
				valueGetter: (_value, row) =>
					row.item_name ?? (row.item_id != null ? `Item #${row.item_id}` : "—"),
			},
			{
				field: "loom_name",
				headerName: "Loom",
				flex: 1,
				minWidth: 120,
				valueGetter: (_value, row) =>
					row.loom_name ?? (row.loom_id != null ? `Loom #${row.loom_id}` : "—"),
			},
			{ field: "spell_code", headerName: "Spell", width: 90 },
			{ field: "piece_total", headerName: "Piece Total", width: 110, type: "number" },
			{
				field: "actions",
				headerName: "",
				width: 60,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Tooltip title="Delete piece">
						<IconButton
							size="small"
							color="error"
							onClick={() => onDelete(params.row.fabric_fault_id)}
							sx={{ minWidth: 40, minHeight: 40 }}
						>
							<DeleteIcon size={16} />
						</IconButton>
					</Tooltip>
				),
			},
		],
		[onDelete]
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
			<TextField
				label="Search (quality / loom / spell / inspector)"
				size="small"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				sx={{ maxWidth: 360 }}
			/>
			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<DataGrid
					autoHeight
					rows={rows}
					getRowId={(row) => row.fabric_fault_id}
					columns={columns}
					loading={loading}
					paginationMode="server"
					rowCount={total}
					paginationModel={paginationModel}
					onPaginationModelChange={setPaginationModel}
					pageSizeOptions={[10, 25, 50]}
					disableRowSelectionOnClick
					density="compact"
					sx={{ minWidth: 700 }}
				/>
			</Box>
		</Box>
	);
}
