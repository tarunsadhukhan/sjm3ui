"use client";

import * as React from "react";
import { Alert, Chip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter } from "next/navigation";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { createStatusBasedEditCheck } from "@/utils/editability";

/**
 * @component JuteMRIndexPage
 * @description Index page displaying list of Jute Material Receipts (MR) with pagination and search.
 */

type JuteMRRow = {
	id: string | number;
	mr_no: string | null;
	mr_date: string;
	mr_date_raw?: string;
	branch_name: string;
	supplier_name: string;
	party_name: string | null;
	challan_no: string | null;
	gate_entry_no: string | null;
	mukam: string | null;
	vehicle_no: string | null;
	mr_weight: number | null;
	status: string;
};

const formatDate = (value?: string) => {
	if (!value) return "-";
	const trimmed = value.trim();
	let date: Date | null = null;
	const ymdMatch = trimmed.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
	if (ymdMatch) {
		const [, year, month, day] = ymdMatch;
		date = new Date(Number(year), Number(month) - 1, Number(day));
	} else {
		const parsed = new Date(trimmed);
		if (!Number.isNaN(parsed.getTime())) {
			date = parsed;
		}
	}
	if (!date || Number.isNaN(date.getTime())) {
		return trimmed;
	}
	return new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
};

const getStatusColor = (status: string): "success" | "error" | "warning" | "info" | "default" => {
	const normalized = status?.toLowerCase() ?? "";
	if (normalized.includes("approved") || normalized.includes("closed")) return "success";
	if (normalized.includes("rejected") || normalized.includes("cancelled")) return "error";
	if (normalized.includes("pending") || normalized.includes("open")) return "warning";
	if (normalized.includes("draft")) return "info";
	return "default";
};

export default function JuteMRIndexPage() {
	const router = useRouter();
	const { coId } = useSelectedCompanyCoId();
	const [rows, setRows] = React.useState<JuteMRRow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const columns = React.useMemo<GridColDef<JuteMRRow>[]>(
		() => [
			{
				field: "mr_no",
				headerName: "MR No",
				flex: 0.8,
				minWidth: 100,
				renderCell: (params: GridRenderCellParams<JuteMRRow, string | null>) => (
					<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
						{params.value ?? "-"}
					</Typography>
				),
			},
			{
				field: "mr_date",
				headerName: "MR Date",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteMRRow, string>) => (
					<Typography component="span" variant="body2">
						{params.value || formatDate(params.row.mr_date_raw) || "-"}
					</Typography>
				),
			},
			{
				field: "branch_name",
				headerName: "Branch",
				flex: 1,
				minWidth: 120,
			},
			{
				field: "supplier_name",
				headerName: "Supplier",
				flex: 1,
				minWidth: 140,
			},
			{
				field: "party_name",
				headerName: "Party",
				flex: 1,
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteMRRow, string | null>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "challan_no",
				headerName: "Challan No",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteMRRow, string | null>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "gate_entry_no",
				headerName: "Gate Entry No",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteMRRow, string | null>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "mukam",
				headerName: "Mukam",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteMRRow, string | null>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "vehicle_no",
				headerName: "Vehicle No",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteMRRow, string | null>) => (
					<Typography component="span" variant="body2">
						{params.value || "-"}
					</Typography>
				),
			},
			{
				field: "mr_weight",
				headerName: "MR Weight",
				minWidth: 110,
				type: "number",
				align: "right",
				headerAlign: "right",
				renderCell: (params: GridRenderCellParams<JuteMRRow, number | null>) => (
					<Typography component="span" variant="body2">
						{params.value != null ? params.value.toFixed(2) : "-"}
					</Typography>
				),
			},
			{
				field: "status",
				headerName: "Status",
				minWidth: 120,
				renderCell: (params: GridRenderCellParams<JuteMRRow, string>) => (
					<Chip size="small" color={getStatusColor(params.value ?? "")} label={params.value || "Open"} />
				),
			},
		],
		[]
	);

	const fetchJuteMRs = React.useCallback(async () => {
		if (!coId) {
			setErrorMessage("Company ID not available");
			return;
		}

		setLoading(true);
		setErrorMessage(null);

		try {
			const query = new URLSearchParams({
				co_id: coId,
				page: String(paginationModel.page + 1),
				limit: String(paginationModel.pageSize),
			});
			const trimmedSearch = searchValue.trim();
			if (trimmedSearch) query.set("search", trimmedSearch);

			const url = `${apiRoutesPortalMasters.JUTE_MR_TABLE}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const response = data as {
				data?: Array<Record<string, unknown>>;
				total?: number;
			};

			const rawRows = Array.isArray(response?.data) ? response.data : [];

			const mappedRows: JuteMRRow[] = rawRows.map((r: Record<string, unknown>) => {
				const rawDate = (r.jute_mr_date ?? "") as string;
				const normalizedRaw = typeof rawDate === "string" ? rawDate : rawDate ? String(rawDate) : "";

				return {
					id: (r.jute_mr_id ?? `jute-mr-${Math.random().toString(36).slice(2, 8)}`) as string | number,
					mr_no: ((r.mr_num ?? r.branch_mr_no ?? null) as string | null),
					mr_date_raw: normalizedRaw,
					mr_date: formatDate(normalizedRaw),
					branch_name: (r.branch_name ?? "") as string,
					supplier_name: (r.supplier_name ?? "") as string,
					party_name: (r.party_name ?? null) as string | null,
					challan_no: (r.challan_no ?? null) as string | null,
					gate_entry_no: (r.gate_entry_no ?? null) as string | null,
					mukam: (r.mukam ?? null) as string | null,
					vehicle_no: (r.vehicle_no ?? null) as string | null,
					mr_weight: (r.mr_weight ?? null) as number | null,
					status: (r.status ?? "Open") as string,
				};
			});

			setRows(mappedRows);
			const total = Number(response?.total ?? mappedRows.length ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load Jute Material Receipts";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [coId, paginationModel.page, paginationModel.pageSize, searchValue]);

	React.useEffect(() => {
		if (coId) {
			fetchJuteMRs();
		}
	}, [fetchJuteMRs, coId]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
		setSearchValue(value);
	}, []);

	const handleView = React.useCallback(
		(row: JuteMRRow) => {
			const id = row.id;
			if (!id) return;
			router.push(`/dashboardportal/jutePurchase/mr/edit?mode=view&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	const handleEdit = React.useCallback(
		(row: JuteMRRow) => {
			const id = row.id;
			if (!id) return;
			router.push(`/dashboardportal/jutePurchase/mr/edit?mode=edit&id=${encodeURIComponent(String(id))}`);
		},
		[router]
	);

	// Row is editable only in Draft or Open status
	const isRowEditable = React.useMemo(
		() => createStatusBasedEditCheck<JuteMRRow>({
			statusField: "status",
			editableStatuses: ["Draft", "Open"],
			caseInsensitive: true,
		}),
		[]
	);

	return (
		<IndexWrapper
			title="Jute Material Receipts"
			subtitle="Review existing jute material receipts."
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{
				value: searchValue,
				onChange: handleSearchChange,
				placeholder: "Search by MR number, supplier, party, challan, vehicle, or gate entry no.",
				debounceDelayMs: 500,
			}}
			onView={handleView}
			onEdit={handleEdit}
			isRowEditable={isRowEditable}
		>
			{errorMessage ? (
				<Alert severity="error" sx={{ mt: 2 }}>
					{errorMessage}
				</Alert>
			) : null}
		</IndexWrapper>
	);
}
