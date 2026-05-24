"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateElectricityDGPage from "./CreateElectricityDGPage";

type ElectricityDGRow = {
	id: number;
	tbl_other_ent_id: number;
	tran_date: string;
	elec_unit: number;
	dg_unit: number;
	wip_data: number;
	dust_boiler: number;
	branch_id: number;
	branch_name: string;
	[key: string]: unknown;
};

export default function ElectricityDGListPage() {
	const [rows, setRows] = useState<ElectricityDGRow[]>([]);
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

	const fetchEntries = useCallback(async () => {
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
				`${apiRoutesPortalMasters.ELECTRICITY_DG_LIST}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch electricity/DG entries");
			}

			const mapped: ElectricityDGRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.tbl_other_ent_id as number,
					tbl_other_ent_id: r.tbl_other_ent_id as number,
					tran_date: (r.tran_date as string) ?? "",
					elec_unit: (r.elec_unit as number) ?? 0,
					dg_unit: (r.dg_unit as number) ?? 0,
					wip_data: (r.wip_data as number) ?? 0,
					dust_boiler: (r.dust_boiler as number) ?? 0,
					branch_id: r.branch_id as number,
					branch_name: (r.branch_name as string) ?? "",
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching electricity/DG entries";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, getCoId, getBranchIds]);

	useEffect(() => {
		fetchEntries();
	}, [fetchEntries]);

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

	const handleEdit = useCallback((row: ElectricityDGRow) => {
		setSelectedId(row.tbl_other_ent_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchEntries();
	}, [fetchEntries]);

	const columns = useMemo<GridColDef<ElectricityDGRow>[]>(
		() => [
			{
				field: "tran_date",
				headerName: "Date",
				flex: 1,
				minWidth: 120,
			},
			{
				field: "branch_name",
				headerName: "Branch",
				flex: 1.5,
				minWidth: 140,
			},
			{
				field: "elec_unit",
				headerName: "Electricity Unit",
				flex: 1,
				minWidth: 130,
				type: "number",
			},
			{
				field: "dg_unit",
				headerName: "DG Unit",
				flex: 1,
				minWidth: 110,
				type: "number",
			},
			{
				field: "wip_data",
				headerName: "WIP",
				flex: 1,
				minWidth: 110,
				type: "number",
			},
			{
				field: "dust_boiler",
				headerName: "Dust Boiler",
				flex: 1,
				minWidth: 120,
				type: "number",
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Electricity / DG"
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
				placeholder: "Search by branch",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Entry",
				onClick: handleCreate,
			}}
			onEdit={handleEdit}
		>
			<CreateElectricityDGPage
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
