"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateCustomerPage from "./CreateCustomerPage";

type CustomerRow = {
	id: number | string;
	tbl_cust_mst_id: number;
	customer_name: string;
	shr_name: string;
	updated_date_time: string;
	[key: string]: unknown;
};

const formatDateTime = (val: unknown): string => {
	if (!val) return "";
	const d = new Date(String(val));
	if (Number.isNaN(d.getTime())) return String(val);
	return d.toLocaleString();
};

export default function CustomerMasterPage() {
	const [rows, setRows] = useState<CustomerRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalRows, setTotalRows] = useState(0);
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		pageSize: 10,
		page: 0,
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const [dialogOpen, setDialogOpen] = useState(false);
	const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
	const [editingId, setEditingId] = useState<number | string | undefined>(undefined);

	const fetchCustomers = useCallback(async () => {
		setLoading(true);
		try {
			const queryParams = new URLSearchParams({
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
			});
			if (searchQuery) queryParams.append("search", searchQuery);

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.CUSTOMER_TABLE}?${queryParams}`,
				"GET"
			);
			if (error || !data) throw new Error(error || "Failed to fetch customers");

			const mapped: CustomerRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: (r.tbl_cust_mst_id as number) ?? (r.id as number),
					tbl_cust_mst_id: r.tbl_cust_mst_id as number,
					customer_name: (r.customer_name as string) ?? "",
					shr_name: (r.shr_name as string) ?? "",
					updated_date_time: (r.updated_date_time as string) ?? "",
				})
			);

			setRows(mapped);
			setTotalRows(data.total ?? data.total_count ?? mapped.length);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching customers";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery]);

	useEffect(() => {
		fetchCustomers();
	}, [fetchCustomers]);

	const handlePaginationModelChange = (newModel: GridPaginationModel) => {
		setPaginationModel(newModel);
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	};

	const handleSnackbarClose = () => {
		setSnackbar((prev) => ({ ...prev, open: false }));
	};

	const handleCreate = useCallback(() => {
		setEditingId(undefined);
		setDialogMode("create");
		setDialogOpen(true);
	}, []);

	const handleEdit = useCallback((row: CustomerRow) => {
		setEditingId(row.tbl_cust_mst_id ?? row.id);
		setDialogMode("edit");
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setEditingId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		setDialogOpen(false);
		fetchCustomers();
	}, [fetchCustomers]);

	const columns = useMemo<GridColDef<CustomerRow>[]>(
		() => [
			{
				field: "customer_name",
				headerName: "Customer Name",
				flex: 2,
				minWidth: 240,
			},
			{
				field: "shr_name",
				headerName: "Short Name",
				flex: 1,
				minWidth: 140,
			},
			{
				field: "updated_date_time",
				headerName: "Last Updated",
				flex: 1,
				minWidth: 180,
				valueFormatter: (value) => formatDateTime(value),
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Customer Master"
			rows={rows}
			columns={columns}
			rowCount={totalRows}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			search={{
				value: searchQuery,
				onChange: handleSearchChange,
				placeholder: "Search by customer or short name",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Customer",
				onClick: handleCreate,
			}}
			onView={handleEdit}
			onEdit={handleEdit}
		>
			<CreateCustomerPage
				open={dialogOpen}
				mode={dialogMode}
				editId={editingId}
				onClose={handleDialogClose}
				onSaved={handleSaved}
			/>
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={handleSnackbarClose}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert
					onClose={handleSnackbarClose}
					severity={snackbar.severity}
					variant="filled"
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</IndexWrapper>
	);
}
