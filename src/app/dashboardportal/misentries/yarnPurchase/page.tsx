"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateYarnPurchasePage from "./CreateYarnPurchasePage";

type YarnPurchaseRow = {
	id: number;
	tbl_yarn_tran_id: number;
	tran_date: string;
	tran_type: number;
	quality_id: number;
	spg_quality: string;
	weight: number;
	branch_id: number;
	branch_name: string;
	[key: string]: unknown;
};

export default function YarnPurchaseListPage() {
	const [rows, setRows] = useState<YarnPurchaseRow[]>([]);
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
	const [selectedId, setSelectedId] = useState<number | undefined>(undefined);

	const getCoId = useCallback((): string => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
	}, []);

	const getBranchIds = useCallback((): string => {
		const raw = localStorage.getItem("sidebar_selectedBranches");
		if (!raw) return "";
		try {
			const branches = JSON.parse(raw) as number[];
			return Array.isArray(branches) && branches.length > 0
				? branches.join(",")
				: "";
		} catch {
			return "";
		}
	}, []);

	const fetchYarnPurchases = useCallback(async () => {
		setLoading(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const queryParams = new URLSearchParams({
				co_id,
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
			});

			const branch_id = getBranchIds();
			if (branch_id) queryParams.append("branch_id", branch_id);

			if (searchQuery) {
				queryParams.append("search", searchQuery);
			}

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.YARN_PURCHASE_LIST}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch yarn purchase entries");
			}

			const mapped: YarnPurchaseRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.tbl_yarn_tran_id as number,
					tbl_yarn_tran_id: r.tbl_yarn_tran_id as number,
					tran_date: (r.tran_date as string) ?? "",
					tran_type: (r.tran_type as number) ?? 1,
					quality_id: r.quality_id as number,
					spg_quality: (r.spg_quality as string) ?? "",
					weight: r.weight as number,
					branch_id: r.branch_id as number,
					branch_name: (r.branch_name as string) ?? "",
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching yarn purchase entries";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, getCoId, getBranchIds]);

	useEffect(() => {
		fetchYarnPurchases();
	}, [fetchYarnPurchases]);

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
		setSelectedId(undefined);
		setDialogOpen(true);
	}, []);

	const handleEdit = useCallback((row: YarnPurchaseRow) => {
		setSelectedId(row.tbl_yarn_tran_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchYarnPurchases();
	}, [fetchYarnPurchases]);

	const columns = useMemo<GridColDef<YarnPurchaseRow>[]>(
		() => [
			{
				field: "tran_date",
				headerName: "Date",
				flex: 1,
				minWidth: 120,
			},
			{
				field: "tran_type",
				headerName: "Tran Type",
				flex: 1,
				minWidth: 110,
				valueGetter: (_value, row) =>
					row.tran_type === 1 ? "Purchase" : "Sales",
			},
			{
				field: "spg_quality",
				headerName: "Quality",
				flex: 2,
				minWidth: 180,
			},
			{
				field: "weight",
				headerName: "Weight",
				flex: 1,
				minWidth: 120,
				type: "number",
			},
			{
				field: "branch_name",
				headerName: "Branch",
				flex: 1.5,
				minWidth: 140,
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Yarn Purchase"
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
				placeholder: "Search by quality or branch",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Yarn Purchase",
				onClick: handleCreate,
			}}
			onEdit={handleEdit}
		>
			<CreateYarnPurchasePage
				open={dialogOpen}
				onClose={handleDialogClose}
				onSaved={handleSaved}
				editId={selectedId}
			/>
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={handleSnackbarClose}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert
					severity={snackbar.severity}
					onClose={handleSnackbarClose}
					sx={{ width: "100%" }}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</IndexWrapper>
	);
}
