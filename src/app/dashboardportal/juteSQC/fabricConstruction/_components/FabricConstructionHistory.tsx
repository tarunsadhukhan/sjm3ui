"use client";

import * as React from "react";
import { Box, IconButton, TextField, Tooltip } from "@mui/material";
import { Trash2 as DeleteIcon } from "lucide-react";
import { DataGrid, type GridColDef, type GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { FabricConstructionHistoryRow } from "../types";

type Props = {
	coId: string;
	// Bumped by the page after save/delete so the table refetches.
	version: number;
	onDelete: (id: number) => void;
};

function fmtDate(d: string | null): string {
	return d ? new Date(d).toLocaleDateString("en-IN") : "—";
}

function fmtNum(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

export default function FabricConstructionHistory({ coId, version, onDelete }: Props) {
	const [rows, setRows] = React.useState<FabricConstructionHistoryRow[]>([]);
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
		const url = `${apiRoutesPortalMasters.FABRIC_CONSTRUCTION_TABLE}?${params}`;
		void fetchWithCookie<{ data: FabricConstructionHistoryRow[]; total: number }>(url, "GET").then(
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

	const columns = React.useMemo<GridColDef<FabricConstructionHistoryRow>[]>(
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
				minWidth: 180,
				valueGetter: (_value, row) => row.item_name ?? row.item_code ?? `Item #${row.item_id}`,
			},
			{ field: "quality_text", headerName: "Quality Text", flex: 1, minWidth: 140 },
			{
				field: "std_oz_per_yd",
				headerName: "Std Oz/yd",
				width: 110,
				type: "number",
				valueFormatter: (value) => fmtNum(value as number | null),
			},
			{
				field: "std_mr_pct",
				headerName: "Std MR %",
				width: 100,
				type: "number",
				valueFormatter: (value) => fmtNum(value as number | null),
			},
			{ field: "sample_count", headerName: "Samples", width: 90, type: "number" },
			{
				field: "actions",
				headerName: "",
				width: 60,
				sortable: false,
				filterable: false,
				renderCell: (params) => (
					<Tooltip title="Delete block">
						<IconButton
							size="small"
							color="error"
							onClick={() => onDelete(params.row.fabric_const_id)}
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
				label="Search (cloth quality / quality text)"
				size="small"
				value={search}
				onChange={(e) => setSearch(e.target.value)}
				sx={{ maxWidth: 360 }}
			/>
			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<DataGrid
					autoHeight
					rows={rows}
					getRowId={(row) => row.fabric_const_id}
					columns={columns}
					loading={loading}
					paginationMode="server"
					rowCount={total}
					paginationModel={paginationModel}
					onPaginationModelChange={setPaginationModel}
					pageSizeOptions={[10, 25, 50]}
					disableRowSelectionOnClick
					density="compact"
					sx={{ minWidth: 760 }}
				/>
			</Box>
		</Box>
	);
}
