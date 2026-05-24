"use client";

import * as React from "react";
import { Alert, Chip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter } from "next/navigation";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type DORow = {
	id: string | number;
	delivery_order_no: string;
	branch_id?: string | number;
	do_date: string;
	do_date_raw?: string;
	expected_delivery_date?: string;
	customer_name: string;
	net_amount: number | null;
	branch_name: string;
	status: string;
	status_id?: number | null;
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
	return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const formatCurrency = (value: number | null | undefined) => {
	if (value === null || value === undefined) return "-";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(value);
};

export default function DeliveryOrderIndexPage() {
	const router = useRouter();
	const { selectedBranches } = useSidebarContext();
	const [rows, setRows] = React.useState<DORow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const columns = React.useMemo<GridColDef[]>(() => [
		{
			field: "delivery_order_no",
			headerName: "DO Number",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<DORow, string>) => (
				<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "do_date",
			headerName: "DO Date",
			minWidth: 130,
			renderCell: (params: GridRenderCellParams<DORow, string>) => (
				<Typography component="span" variant="body2">
					{params.value || formatDate(typeof params.row.do_date_raw === "string" ? params.row.do_date_raw : "") || "-"}
				</Typography>
			),
		},
		{
			field: "expected_delivery_date",
			headerName: "Expected Delivery",
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<DORow, string>) => (
				<Typography component="span" variant="body2">
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "customer_name",
			headerName: "Customer",
			flex: 1,
			minWidth: 160,
		},
		{
			field: "net_amount",
			headerName: "Amount",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<DORow, number | null>) => (
				<Typography component="span" variant="body2">
					{formatCurrency(params.value)}
				</Typography>
			),
		},
		{
			field: "branch_name",
			headerName: "Branch",
			flex: 1,
			minWidth: 140,
		},
		{
			field: "status",
			headerName: "Status",
			minWidth: 130,
			renderCell: (params: GridRenderCellParams<DORow, string>) => (
				<Chip size="small" color={params.value === "Approved" ? "success" : params.value === "Rejected" ? "error" : "default"} label={params.value || "Draft"} />
			),
		},
	], []);

	const fetchDOs = React.useCallback(async () => {
		setLoading(true);
		setErrorMessage(null);

		try {
			let co_id = "";
			try {
				const storedCompany = localStorage.getItem("sidebar_selectedCompany");
				if (storedCompany) {
					const parsed = JSON.parse(storedCompany);
					co_id = parsed?.co_id ? String(parsed.co_id) : "";
				}
			} catch {
				co_id = "";
			}

			const query = new URLSearchParams({
				page: String(paginationModel.page + 1),
				limit: String(paginationModel.pageSize),
			});
			if (co_id) query.set("co_id", co_id);
			if (selectedBranches.length === 1) query.set("branch_id", String(selectedBranches[0]));
			const trimmedSearch = searchValue.trim();
			if (trimmedSearch) query.set("search", trimmedSearch);

			const url = `${apiRoutesPortalMasters.DELIVERY_ORDER_TABLE}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const rawRows = Array.isArray((data as any)?.data) ? (data as any).data : Array.isArray(data) ? data : [];
			const mappedRows: DORow[] = rawRows.map((row: any) => {
				const rawDate = row.delivery_order_date ?? row.do_date ?? row.created_at ?? "";
				const normalizedRaw = typeof rawDate === "string" ? rawDate : rawDate ? String(rawDate) : "";
				const rawExpected = row.expected_delivery_date ?? "";
				return {
					id: row.sales_delivery_order_id ?? row.id ?? `do-${Math.random().toString(36).slice(2, 8)}`,
					delivery_order_no: row.delivery_order_no ?? row.do_no ?? "",
					branch_id: row.branch_id ?? undefined,
					do_date_raw: normalizedRaw,
					do_date: formatDate(normalizedRaw),
					expected_delivery_date: formatDate(typeof rawExpected === "string" ? rawExpected : ""),
					customer_name: row.customer_name ?? row.party_name ?? row.supp_name ?? "",
					net_amount: row.net_amount ?? row.total_amount ?? null,
					branch_name: row.branch_name ?? "",
					status: row.status ?? row.status_name ?? "Draft",
					status_id: row.status_id ?? row.statusId ?? null,
				};
			});

			setRows(mappedRows);
			const total = Number((data as any)?.total ?? mappedRows.length ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load delivery orders";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue, selectedBranches]);

	React.useEffect(() => {
		fetchDOs();
	}, [fetchDOs]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel(prev => ({ ...prev, page: 0 }));
		setSearchValue(value);
	}, []);

	const handleCreateDO = React.useCallback(() => {
		router.push("/dashboardportal/sales/deliveryOrder/createDeliveryOrder");
	}, [router]);

	const handleView = React.useCallback(
		(row: DORow) => {
			const id = row.id;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/sales/deliveryOrder/createDeliveryOrder?mode=view&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router],
	);

	const handleEdit = React.useCallback(
		(row: DORow) => {
			const id = row.id;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/sales/deliveryOrder/createDeliveryOrder?mode=edit&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router],
	);

	return (
		<IndexWrapper
			title="Delivery Orders"
			subtitle="Review existing delivery orders or create a new one."
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{ value: searchValue, onChange: handleSearchChange, placeholder: "Search by DO number, customer, or branch", debounceDelayMs: 1000 }}
			createAction={{ onClick: handleCreateDO, label: "Create Delivery Order" }}
			onView={handleView}
			onEdit={handleEdit}
			isRowEditable={(row) => Number(row.status_id) !== 3}
		>
			{errorMessage ? (
				<Alert severity="error" sx={{ mt: 2 }}>
					{errorMessage}
				</Alert>
			) : null}
		</IndexWrapper>
	);
}
