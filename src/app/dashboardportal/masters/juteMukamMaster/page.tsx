"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import CreateJuteMukam from "./createJuteMukam";
import type { MuiFormMode } from "@/components/ui/muiform";

/**
 * Type definition for a Jute Mukam row in the data grid
 */
type JuteMukamRow = {
	id: number | string;
	mukam_id: number;
	mukam_name: string;
	updated_by?: number;
	updated_date_time?: string;
	[key: string]: unknown;
};

/**
 * @component JuteMukamMasterPage
 * @description Index page for Jute Mukam Master - displays a paginated list of jute mukams.
 */
export default function JuteMukamMasterPage() {
	const [rows, setRows] = useState<JuteMukamRow[]>([]);
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

	// Dialog state
	const [dialogOpen, setDialogOpen] = useState(false);
	const [selectedId, setSelectedId] = useState<number | undefined>(undefined);
	const [dialogMode, setDialogMode] = useState<MuiFormMode>("create");

	/**
	 * Fetch jute mukams from the API
	 */
	const fetchJuteMukams = useCallback(async () => {
		setLoading(true);
		try {
			const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
			const co_id = selectedCompany ? JSON.parse(selectedCompany).co_id : "";

			if (!co_id) {
				throw new Error("No company selected");
			}

			const queryParams = new URLSearchParams({
				page: String((paginationModel.page ?? 0) + 1),
				limit: String(paginationModel.pageSize ?? 10),
				co_id,
			});

			if (searchQuery) {
				queryParams.append("search", searchQuery);
			}

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.JUTE_MUKAM_TABLE}?${queryParams}`,
				"GET"
			);

			if (error || !data) {
				throw new Error(error || "Failed to fetch jute mukams");
			}

			const mapped: JuteMukamRow[] = (data.data || []).map((r: Record<string, unknown>) => ({
				...r,
				id: r.mukam_id as number,
				mukam_id: r.mukam_id as number,
				mukam_name: (r.mukam_name as string) ?? "",
				updated_date_time: r.updated_date_time
					? new Date(r.updated_date_time as string).toLocaleDateString()
					: "-",
			}));

			setRows(mapped);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error fetching jute mukams";
			setSnackbar({
				open: true,
				message,
				severity: "error",
			});
		} finally {
			setLoading(false);
		}
	}, [paginationModel.page, paginationModel.pageSize, searchQuery]);

	useEffect(() => {
		fetchJuteMukams();
	}, [fetchJuteMukams]);

	const handlePaginationModelChange = (newModel: GridPaginationModel) => {
		setPaginationModel(newModel);
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchQuery(value);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	};

	const handleSnackbarClose = () => {
		setSnackbar((prev) => ({ ...prev, open: false }));
	};

	const handleCreate = useCallback(() => {
		setSelectedId(undefined);
		setDialogMode("create");
		setDialogOpen(true);
	}, []);

	const handleView = useCallback((row: JuteMukamRow) => {
		setSelectedId(row.mukam_id);
		setDialogMode("view");
		setDialogOpen(true);
	}, []);

	const handleEdit = useCallback((row: JuteMukamRow) => {
		setSelectedId(row.mukam_id);
		setDialogMode("edit");
		setDialogOpen(true);
	}, []);

	const handleDialogClose = useCallback(() => {
		setDialogOpen(false);
		setSelectedId(undefined);
	}, []);

	const handleSaved = useCallback(() => {
		fetchJuteMukams();
	}, [fetchJuteMukams]);

	const columns = useMemo<GridColDef<JuteMukamRow>[]>(
		() => [
			{
				field: "mukam_name",
				headerName: "Mukam Name",
				flex: 2,
				minWidth: 250,
			},
			{
				field: "updated_date_time",
				headerName: "Last Updated",
				flex: 1,
				minWidth: 150,
			},
		],
		[]
	);

	return (
		<IndexWrapper
			title="Jute Mukam Master"
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
				placeholder: "Search by mukam name",
				debounceDelayMs: 500,
			}}
			createAction={{
				label: "Create Jute Mukam",
				onClick: handleCreate,
			}}
			onView={handleView}
			onEdit={handleEdit}
		>
			<CreateJuteMukam
				open={dialogOpen}
				onClose={handleDialogClose}
				onSaved={handleSaved}
				editId={selectedId}
				initialMode={dialogMode}
			/>
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={handleSnackbarClose}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert severity={snackbar.severity} onClose={handleSnackbarClose} sx={{ width: "100%" }}>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</IndexWrapper>
	);
}
