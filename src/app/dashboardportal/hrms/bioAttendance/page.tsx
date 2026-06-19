"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import CreateBioAttendancePage from "./CreateBioAttendancePage";


type BioAttendanceRow = {
	id: number | string;
	bio_att_id: number;
	bio_att_log_id: number | null;
	emp_code: string;
	emp_anme: string;
	bio_id: number | null;
	log_date: string;
	device_direction: string;
	[key: string]: unknown;
};

function formatDateTime(value: unknown): string {
	if (!value) return "";
	const s = String(value);
	return s.length >= 19 ? s.slice(0, 19).replace("T", " ") : s;
}

export default function BioAttendancePage() {
	const [rows, setRows] = useState<BioAttendanceRow[]>([]);
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
			if (!selectedBranches.length) throw new Error("No branch selected");

			const queryParams = new URLSearchParams({
				co_id,
				branch_id: selectedBranches.join(","),
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
			});
			if (searchQuery) queryParams.append("search", searchQuery);

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.BIO_ATT_MANUAL_LIST}?${queryParams}`,
				"GET"
			);
			if (error || !data) throw new Error(error || "Failed to fetch entries");

			const mapped: BioAttendanceRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.bio_att_id as number,
					bio_att_id: r.bio_att_id as number,
					bio_att_log_id: (r.bio_att_log_id as number | null) ?? null,
					emp_code: (r.emp_code as string) ?? "",
					emp_anme: (r.emp_anme as string) ?? "",
					bio_id: (r.bio_id as number | null) ?? null,
					log_date: formatDateTime(r.log_date),
					device_direction: (r.device_direction as string) ?? "",
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
	}, [
		paginationModel.page,
		paginationModel.pageSize,
		searchQuery,
		getCoId,
		selectedBranches,
	]);

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
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
	}, []);

	const handleSaved = useCallback(
		(message: string) => {
			setSnackbar({ open: true, message, severity: "success" });
			fetchEntries();
		},
		[fetchEntries]
	);

	const columns = useMemo<GridColDef<BioAttendanceRow>[]>(
		() => [
			{ field: "log_date", headerName: "Log Date/Time", flex: 1.4, minWidth: 170 },
			{ field: "emp_code", headerName: "Emp Code", flex: 1, minWidth: 120 },
			{ field: "emp_anme", headerName: "Employee", flex: 1.6, minWidth: 180 },
			{
				field: "device_direction",
				headerName: "Direction",
				flex: 0.8,
				minWidth: 100,
				valueFormatter: (value) =>
					value === "in" ? "In" : value === "out" ? "Out" : String(value ?? ""),
			},
			{ field: "bio_id", headerName: "Bio ID", flex: 0.8, minWidth: 100 },
			{
				field: "bio_att_log_id",
				headerName: "Log ID",
				flex: 0.8,
				minWidth: 100,
				type: "number",
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Manual Bio Attendance"
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
				placeholder: "Search by emp code, name or direction",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Entry",
				onClick: handleCreate,
			}}
		>
			<CreateBioAttendancePage
				open={dialogOpen}
				onClose={handleDialogClose}
				onSaved={handleSaved}
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
