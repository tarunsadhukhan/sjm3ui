"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateDesigNormsSetPage from "./CreateDesigNormsSetPage";

type DesigNormsRow = {
	id: number;
	desg_norms_mst_id: number;
	desig_id: number;
	designation_name: string;
	branch_id: number | null;
	branch_name: string | null;
	direct_indirect: string | null;
	fixed_variable: string | null;
	shift_a: number | null;
	shift_b: number | null;
	shift_c: number | null;
	norms: string | null;
	link_mc_code: string | null;
	no_of_mcs: number | null;
	no_of_hands: number | null;
	[key: string]: unknown;
};

const DI_LABEL: Record<string, string> = { D: "Direct", I: "Indirect" };
const FV_LABEL: Record<string, string> = { F: "Fixed", V: "Variable" };

export default function DesigNormsSetPage() {
	const [rows, setRows] = useState<DesigNormsRow[]>([]);
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
				`${apiRoutesPortalMasters.DESIG_NORMS_TABLE}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch designation norms");
			}

			const mapped: DesigNormsRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.desg_norms_mst_id as number,
					desg_norms_mst_id: r.desg_norms_mst_id as number,
					desig_id: r.desig_id as number,
					designation_name: (r.designation_name as string) ?? "",
					branch_id: (r.branch_id as number) ?? null,
					branch_name: (r.branch_name as string) ?? null,
					direct_indirect: (r.direct_indirect as string) ?? null,
					fixed_variable: (r.fixed_variable as string) ?? null,
					shift_a: (r.shift_a as number) ?? null,
					shift_b: (r.shift_b as number) ?? null,
					shift_c: (r.shift_c as number) ?? null,
					norms: (r.norms as string) ?? null,
					link_mc_code: (r.link_mc_code as string) ?? null,
					no_of_mcs: (r.no_of_mcs as number) ?? null,
					no_of_hands: (r.no_of_hands as number) ?? null,
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching designation norms";
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

	const handleEdit = useCallback((row: DesigNormsRow) => {
		setSelectedId(row.desg_norms_mst_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchList();
	}, [fetchList]);

	const columns = useMemo<GridColDef<DesigNormsRow>[]>(
		() => [
			{
				field: "designation_name",
				headerName: "Designation",
				flex: 1.5,
				minWidth: 160,
			},
			{
				field: "direct_indirect",
				headerName: "Direct/Indirect",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: string | null) =>
					value ? (DI_LABEL[value] ?? value) : "",
			},
			{
				field: "fixed_variable",
				headerName: "Fixed/Variable",
				flex: 1,
				minWidth: 130,
				valueFormatter: (value: string | null) =>
					value ? (FV_LABEL[value] ?? value) : "",
			},
			{ field: "shift_a", headerName: "Shift A", flex: 0.7, minWidth: 80 },
			{ field: "shift_b", headerName: "Shift B", flex: 0.7, minWidth: 80 },
			{ field: "shift_c", headerName: "Shift C", flex: 0.7, minWidth: 80 },
			{
				field: "link_mc_code",
				headerName: "Machine",
				flex: 1,
				minWidth: 110,
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
			{ field: "norms", headerName: "Norms", flex: 1.2, minWidth: 140 },
		],
		[]
	);

	return (
		<IndexWrapper
			title="Designation Norms Set"
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
				placeholder: "Search by designation, norms or machine code",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Designation Norm",
				onClick: handleCreate,
			}}
			onEdit={handleEdit}
		>
			<CreateDesigNormsSetPage
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
