"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
	Snackbar,
	Alert,
	IconButton,
	Tooltip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Button,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import CreateMcStoppagePage from "./CreateMcStoppagePage";

type McStoppageRow = {
	id: number | string;
	tbl_mc_stop_id: number;
	stop_date: string;
	spell_id: number | null;
	mc_id: number | null;
	spell_name: string;
	machine_name: string;
	stop_hours: number;
	[key: string]: unknown;
};

function formatDate(value: unknown): string {
	if (!value) return "";
	const s = String(value);
	return s.length >= 10 ? s.slice(0, 10) : s;
}

function toNumber(value: unknown): number {
	if (value === null || value === undefined || value === "") return 0;
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
}

export default function McStoppagePage() {
	const [rows, setRows] = useState<McStoppageRow[]>([]);
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
	const [deleteId, setDeleteId] = useState<number | null>(null);
	const [deleting, setDeleting] = useState(false);

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
				`${apiRoutesPortalMasters.MC_STOPPAGE_LIST}?${queryParams}`,
				"GET"
			);
			if (error || !data) throw new Error(error || "Failed to fetch entries");

			const mapped: McStoppageRow[] = (data.data || []).map(
				(r: Record<string, unknown>) => ({
					...r,
					id: r.tbl_mc_stop_id as number,
					tbl_mc_stop_id: r.tbl_mc_stop_id as number,
					stop_date: formatDate(r.stop_date),
					spell_id: (r.spell_id as number | null) ?? null,
					mc_id: (r.mc_id as number | null) ?? null,
					spell_name: (r.spell_name as string) ?? "",
					machine_name: (r.machine_name as string) ?? "",
					stop_hours: toNumber(r.stop_hours),
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
		setSelectedId(undefined);
		setDialogOpen(true);
	}, []);

	const handleEdit = useCallback((row: McStoppageRow) => {
		setSelectedId(row.tbl_mc_stop_id);
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(
		(message: string) => {
			setSnackbar({ open: true, message, severity: "success" });
			fetchEntries();
		},
		[fetchEntries]
	);

	const handleConfirmDelete = useCallback(async () => {
		if (deleteId === null) return;
		setDeleting(true);
		try {
			const { error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.MC_STOPPAGE_DELETE}/${deleteId}`,
				"DELETE"
			);
			if (error) throw new Error(error);
			setSnackbar({
				open: true,
				message: "Machine stoppage entry deleted",
				severity: "success",
			});
			setDeleteId(null);
			fetchEntries();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Delete failed";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setDeleting(false);
		}
	}, [deleteId, fetchEntries]);

	const columns = useMemo<GridColDef<McStoppageRow>[]>(
		() => [
			{ field: "stop_date", headerName: "Date", flex: 1, minWidth: 120 },
			{ field: "spell_name", headerName: "Spell", flex: 1, minWidth: 130 },
			{ field: "machine_name", headerName: "Machine", flex: 1.6, minWidth: 180 },
			{
				field: "stop_hours",
				headerName: "Stop Hours",
				flex: 1,
				minWidth: 120,
				type: "number",
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Machine Stoppage"
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
				placeholder: "Search by machine or spell",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Entry",
				onClick: handleCreate,
			}}
			onEdit={handleEdit}
			renderRowActions={(row) => (
				<Tooltip title="Delete">
					<IconButton
						size="small"
						color="error"
						onClick={() => setDeleteId(row.tbl_mc_stop_id)}
					>
						<Trash2 size={16} />
					</IconButton>
				</Tooltip>
			)}
		>
			<CreateMcStoppagePage
				open={dialogOpen}
				onClose={handleDialogClose}
				onSaved={handleSaved}
				editId={selectedId}
			/>
			<Dialog
				open={deleteId !== null}
				onClose={() => (deleting ? undefined : setDeleteId(null))}
				maxWidth="xs"
				fullWidth
			>
				<DialogTitle>Delete Machine Stoppage</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Are you sure you want to delete this stoppage entry? This cannot be
						undone.
					</DialogContentText>
				</DialogContent>
				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={() => setDeleteId(null)} disabled={deleting}>
						Cancel
					</Button>
					<Button
						variant="contained"
						color="error"
						onClick={handleConfirmDelete}
						disabled={deleting}
					>
						{deleting ? "Deleting..." : "Delete"}
					</Button>
				</DialogActions>
			</Dialog>
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
