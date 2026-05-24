"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateManMachineMstPage from "./CreateManMachineMstPage";

type ManMachineMstRow = {
	id: number;
	mc_occu_line_mst_id: number;
	mc_id: number;
	desig_id: number;
	mc_code: string | null;
	mc_name: string | null;
	designation_name: string | null;
	branch_id: number | null;
	branch_name: string | null;
	no_of_mcs: number | null;
	no_of_hands: number | null;
	[key: string]: unknown;
};

export default function ManMachineMstPage() {
	const [rows, setRows] = useState<ManMachineMstRow[]>([]);
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

	const fetchList = useCallback(async () => {
		setLoading(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const branch_id = getBranchIds();
			const queryParams = new URLSearchParams({
				co_id,
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
			});
			if (branch_id) queryParams.append("branch_id", branch_id);
			if (searchQuery) queryParams.append("search", searchQuery);

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.MAN_MACHINE_MST_TABLE}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch man-machine list");
			}

			const mapped: ManMachineMstRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.mc_occu_line_mst_id as number,
					mc_occu_line_mst_id: r.mc_occu_line_mst_id as number,
					mc_id: r.mc_id as number,
					desig_id: r.desig_id as number,
					mc_code: (r.mc_code as string) ?? null,
					mc_name: (r.mc_name as string) ?? null,
					designation_name: (r.designation_name as string) ?? null,
					branch_id: (r.branch_id as number) ?? null,
					branch_name: (r.branch_name as string) ?? null,
					no_of_mcs: (r.no_of_mcs as number) ?? null,
					no_of_hands: (r.no_of_hands as number) ?? null,
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching man-machine list";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, getCoId, getBranchIds]);

	useEffect(() => {
		fetchList();
	}, [fetchList]);

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

	const handleEdit = useCallback((row: ManMachineMstRow) => {
		setSelectedId(row.mc_occu_line_mst_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchList();
	}, [fetchList]);

	const columns = useMemo<GridColDef<ManMachineMstRow>[]>(
		() => [
			{
				field: "mc_code",
				headerName: "Machine Code",
				flex: 1,
				minWidth: 130,
			},
			{
				field: "mc_name",
				headerName: "Machine Name",
				flex: 1.4,
				minWidth: 160,
			},
			{
				field: "designation_name",
				headerName: "Designation",
				flex: 1.4,
				minWidth: 160,
			},
			{
				field: "branch_name",
				headerName: "Branch",
				flex: 1,
				minWidth: 130,
			},
			{
				field: "no_of_mcs",
				headerName: "No. of Machines",
				flex: 0.9,
				minWidth: 130,
			},
			{
				field: "no_of_hands",
				headerName: "No. of Hands",
				flex: 0.9,
				minWidth: 120,
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Man-Machine Master"
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
				placeholder: "Search by machine code, name or designation",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Man-Machine Link",
				onClick: handleCreate,
			}}
			onEdit={handleEdit}
		>
			<CreateManMachineMstPage
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
