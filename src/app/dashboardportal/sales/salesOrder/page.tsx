"use client";

import * as React from "react";
import { Alert, Chip, Typography } from "@mui/material";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useRouter } from "next/navigation";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type SORow = {
	id: string | number;
	sales_no: string;
	branch_id?: string | number;
	sales_order_date: string;
	sales_order_date_raw?: string;
	customer_name: string;
	order_value: number | null;
	branch_name: string;
	quotation_no: string | null;
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
	return new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(date);
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

export default function SalesOrderIndexPage() {
	const router = useRouter();
	const { selectedBranches } = useSidebarContext();
	const [rows, setRows] = React.useState<SORow[]>([]);
	const [totalRows, setTotalRows] = React.useState(0);
	const [loading, setLoading] = React.useState(false);
	const [paginationModel, setPaginationModel] = React.useState<GridPaginationModel>({ page: 0, pageSize: 10 });
	const [searchValue, setSearchValue] = React.useState("");
	const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

	const columns = React.useMemo<GridColDef[]>(() => [
		{
			field: "sales_no",
			headerName: "SO Number",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<SORow, string>) => (
				<Typography component="span" variant="body2" color="primary" sx={{ fontWeight: 600 }}>
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "sales_order_date",
			headerName: "Order Date",
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<SORow, string>) => (
				<Typography component="span" variant="body2">
					{params.value || formatDate(typeof params.row.sales_order_date_raw === "string" ? params.row.sales_order_date_raw : "") || "-"}
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
			field: "order_value",
			headerName: "Order Value",
			minWidth: 120,
			renderCell: (params: GridRenderCellParams<SORow, number | null>) => (
				<Typography component="span" variant="body2">
					{formatCurrency(params.value)}
				</Typography>
			),
		},
		{
			field: "branch_name",
			headerName: "Branch",
			flex: 1,
			minWidth: 160,
		},
		{
			field: "quotation_no",
			headerName: "Quotation No",
			flex: 1,
			minWidth: 140,
			renderCell: (params: GridRenderCellParams<SORow, string | null>) => (
				<Typography component="span" variant="body2">
					{params.value || "-"}
				</Typography>
			),
		},
		{
			field: "status",
			headerName: "Status",
			minWidth: 130,
			renderCell: (params: GridRenderCellParams<SORow, string>) => (
				<Chip size="small" color={params.value === "Approved" ? "success" : params.value === "Rejected" ? "error" : "default"} label={params.value || "Pending"} />
			),
		},
	], []);

	const fetchSalesOrders = React.useCallback(async () => {
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

			const url = `${apiRoutesPortalMasters.SALES_ORDER_TABLE}?${query.toString()}`;
			const { data, error } = await fetchWithCookie(url, "GET");

			if (error) {
				throw new Error(error);
			}

			const rawRows = Array.isArray((data as any)?.data) ? (data as any).data : Array.isArray(data) ? data : [];
			const mappedRows: SORow[] = rawRows.map((row: any) => {
				const rawDate = row.sales_order_date ?? row.salesOrderDate ?? row.created_at ?? "";
				const normalizedRaw = typeof rawDate === "string" ? rawDate : rawDate ? String(rawDate) : "";
				return {
					id: row.sales_order_id ?? row.id ?? row.salesOrderId ?? `${row.sales_no ?? "so"}-${Math.random().toString(36).slice(2, 8)}`,
					sales_no: row.sales_no ?? row.salesNo ?? "",
					branch_id: row.branch_id ?? row.branchId ?? row.branch ?? undefined,
					sales_order_date_raw: normalizedRaw,
					sales_order_date: formatDate(normalizedRaw),
					customer_name: row.customer_name ?? row.customerName ?? row.party_name ?? row.partyName ?? "",
					order_value: row.order_value ?? row.orderValue ?? row.net_amount ?? row.netAmount ?? null,
					branch_name: row.branch_name ?? row.branchName ?? row.branch ?? "",
					quotation_no: row.quotation_no ?? row.quotationNo ?? null,
					status: row.status ?? row.status_name ?? row.current_status ?? "Pending",
					status_id: row.status_id ?? row.statusId ?? null,
				};
			});

			setRows(mappedRows);
			const total = Number((data as any)?.total ?? mappedRows.length ?? 0);
			setTotalRows(Number.isNaN(total) ? mappedRows.length : total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load sales orders";
			setErrorMessage(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchValue, selectedBranches]);

	React.useEffect(() => {
		fetchSalesOrders();
	}, [fetchSalesOrders]);

	const handlePaginationModelChange = (model: GridPaginationModel) => {
		setPaginationModel(model);
	};

	const handleSearchChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const value = event.target.value;
		setPaginationModel(prev => ({ ...prev, page: 0 }));
		setSearchValue(value);
	}, []);

	const handleCreateSO = React.useCallback(() => {
		router.push("/dashboardportal/sales/salesOrder/createSalesOrder");
	}, [router]);

	const handleView = React.useCallback(
		(row: SORow) => {
			const id = row.id ?? row.sales_no;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/sales/salesOrder/createSalesOrder?mode=view&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router]
	);

	const handleEdit = React.useCallback(
		(row: SORow) => {
			const id = row.id ?? row.sales_no;
			if (!id) return;
			const branchId = row.branch_id ? `&branch_id=${encodeURIComponent(String(row.branch_id))}` : "";
			router.push(`/dashboardportal/sales/salesOrder/createSalesOrder?mode=edit&id=${encodeURIComponent(String(id))}${branchId}`);
		},
		[router]
	);

	return (
		<IndexWrapper
			title="Sales Orders"
			subtitle="Review existing sales orders or create a new one."
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{ value: searchValue, onChange: handleSearchChange, placeholder: "Search by SO number, customer, or branch", debounceDelayMs: 1000 }}
			createAction={{ onClick: handleCreateSO, label: "Create Sales Order" }}
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
