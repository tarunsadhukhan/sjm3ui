"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import Button from "@mui/material/Button";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import CreateDailyMachinePage from "./CreateDailyMachinePage";
import DailyMachineFinalProcessDialog from "./DailyMachineFinalProcessDialog";

type DailyMachineRow = {
	id: number | string;
	daily_sum_mc_id: number;
	tran_date: string;
	mc_code: string;
	mc_name: string;
	shift_a: number;
	shift_b: number;
	shift_c: number;
	total_mc: number;
	[key: string]: unknown;
};

function formatDate(value: unknown): string {
	if (!value) return "";
	const s = String(value);
	// keep YYYY-MM-DD only
	return s.length >= 10 ? s.slice(0, 10) : s;
}

function toNumber(value: unknown): number {
	if (value === null || value === undefined || value === "") return 0;
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

export default function DailyMachineEntryPage() {
	const [rows, setRows] = useState<DailyMachineRow[]>([]);
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
	const [finalProcessOpen, setFinalProcessOpen] = useState(false);

	const { selectedBranches } = useSidebarContext();

	const getCoId = useCallback((): string => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
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
			if (searchQuery) queryParams.append("search", searchQuery);
			if (selectedBranches.length) {
				queryParams.append("branch_id", selectedBranches.join(","));
			}

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.DAILY_MACHINE_TABLE}?${queryParams}`,
				"GET"
			);
			if (error || !data) throw new Error(error || "Failed to fetch entries");

			const mapped: DailyMachineRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.daily_sum_mc_id as number,
					daily_sum_mc_id: r.daily_sum_mc_id as number,
					tran_date: formatDate(r.tran_date),
					mc_code: (r.mc_code as string) ?? "",
					mc_name: (r.mc_name as string) ?? "",
					shift_a: toNumber(r.shift_a),
					shift_b: toNumber(r.shift_b),
					shift_c: toNumber(r.shift_c),
					total_mc: toNumber(r.total_mc),
				})
			);

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error fetching entries";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery, getCoId, selectedBranches]);

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

	const handleEdit = useCallback((row: DailyMachineRow) => {
		setSelectedId(row.daily_sum_mc_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchEntries();
	}, [fetchEntries]);

	const columns = useMemo<GridColDef<DailyMachineRow>[]>(
		() => [
			{ field: "tran_date", headerName: "Date", flex: 1, minWidth: 110 },
			{ field: "mc_code", headerName: "MC Code", flex: 1, minWidth: 110 },
			{ field: "mc_name", headerName: "MC Name", flex: 2, minWidth: 200 },
			{
				field: "shift_a",
				headerName: "Shift A",
				flex: 1,
				minWidth: 100,
				type: "number",
			},
			{
				field: "shift_b",
				headerName: "Shift B",
				flex: 1,
				minWidth: 100,
				type: "number",
			},
			{
				field: "shift_c",
				headerName: "Shift C",
				flex: 1,
				minWidth: 100,
				type: "number",
			},
			{
				field: "total_mc",
				headerName: "Total MC",
				flex: 1,
				minWidth: 110,
				type: "number",
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Daily Machine Entry"
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
				placeholder: "Search by date, mc code or name",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Entry",
				onClick: handleCreate,
			}}
			extraActions={
				<Button
					variant="outlined"
					onClick={() => setFinalProcessOpen(true)}
				>
					Final Process
				</Button>
			}
			onEdit={handleEdit}
		>
			<CreateDailyMachinePage
				open={dialogOpen}
				onClose={handleDialogClose}
				onSaved={handleSaved}
				editId={selectedId}
			/>
			<DailyMachineFinalProcessDialog
				open={finalProcessOpen}
				onClose={() => setFinalProcessOpen(false)}
				onSuccess={(message) => {
					setSnackbar({ open: true, message, severity: "success" });
					fetchEntries();
				}}
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
