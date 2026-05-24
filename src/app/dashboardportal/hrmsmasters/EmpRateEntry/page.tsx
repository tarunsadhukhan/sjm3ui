"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert, Button } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateEmpRateEntryPage from "./CreateEmpRateEntryPage";
import ExcelUploadDialog from "./ExcelUploadDialog";

type EmpRateRow = {
	id: number;
	rate_id: number;
	eb_id: number;
	emp_code: string;
	employee_name: string;
	branch_name: string;
	rate: number;
	date_of_rate_update: string;
	[key: string]: unknown;
};

export default function EmpRateEntryListPage() {
	const [rows, setRows] = useState<EmpRateRow[]>([]);
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

	const fetchEmpRates = useCallback(async () => {
		setLoading(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const queryParams = new URLSearchParams({
				co_id,
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
			});

			if (searchQuery) {
				queryParams.append("search", searchQuery);
			}

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.EMP_RATE_LIST}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch employee rate entries");
			}

			const mapped: EmpRateRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.rate_id as number,
					rate_id: r.rate_id as number,
					eb_id: r.eb_id as number,
					emp_code: (r.emp_code as string) ?? "",
					employee_name: (r.employee_name as string) ?? "",
					branch_name: (r.branch_name as string) ?? "",
					rate: r.rate as number,
					date_of_rate_update: (r.date_of_rate_update as string) ?? "",
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching employee rate entries";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, getCoId]);

	useEffect(() => {
		fetchEmpRates();
	}, [fetchEmpRates]);

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

	const handleEdit = useCallback((row: EmpRateRow) => {
		setSelectedId(row.rate_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchEmpRates();
	}, [fetchEmpRates]);

	const [uploadOpen, setUploadOpen] = useState(false);

	const handleExcelUploadClick = useCallback(() => {
		setUploadOpen(true);
	}, []);

	const handleUploadClose = useCallback(() => {
		setUploadOpen(false);
	}, []);

	const handleUploaded = useCallback(() => {
		fetchEmpRates();
	}, [fetchEmpRates]);

	const columns = useMemo<GridColDef<EmpRateRow>[]>(
		() => [
			{
				field: "emp_code",
				headerName: "Emp No",
				flex: 1,
				minWidth: 120,
			},
			{
				field: "employee_name",
				headerName: "Employee Name",
				flex: 2,
				minWidth: 180,
			},
			{
				field: "branch_name",
				headerName: "Branch",
				flex: 1.5,
				minWidth: 140,
			},
			{
				field: "rate",
				headerName: "Rate",
				flex: 1,
				minWidth: 100,
			},
			{
				field: "date_of_rate_update",
				headerName: "Date of Rate Update",
				flex: 1.5,
				minWidth: 160,
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Employee Rate Entry"
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
				placeholder: "Search by emp code or name",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Rate Entry",
				onClick: handleCreate,
			}}
			extraActions={
				<Button variant="outlined" onClick={handleExcelUploadClick}>
					Excel Upload
				</Button>
			}
			onEdit={handleEdit}
		>
			<CreateEmpRateEntryPage
				open={dialogOpen}
				onClose={handleDialogClose}
				onSaved={handleSaved}
				editId={selectedId}
			/>
			<ExcelUploadDialog
				open={uploadOpen}
				onClose={handleUploadClose}
				onUploaded={handleUploaded}
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
