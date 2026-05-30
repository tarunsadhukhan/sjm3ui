"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	Box,
	Snackbar,
	Alert,
	IconButton,
	Typography,
	CircularProgress,
} from "@mui/material";
import { X } from "lucide-react";
import { MuiForm, MuiFormMode } from "@/components/ui/muiform";
import type { Schema } from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

/**
 * Props for CreateJuteMukam dialog component
 */
type Props = {
	/** Whether the dialog is open */
	open: boolean;
	/** Callback to close the dialog */
	onClose: () => void;
	/** Callback after successful save (create or edit) */
	onSaved?: () => void;
	/** ID of the jute mukam to edit/view. If undefined, opens in create mode */
	editId?: number | string;
	/** Initial mode for the form */
	initialMode?: MuiFormMode;
};

/**
 * @component CreateJuteMukam
 * @description Dialog component for creating, editing, or viewing jute mukam records.
 * Supports mode switching between view and edit.
 *
 * @example
 * <CreateJuteMukam
 *   open={isDialogOpen}
 *   onClose={() => setDialogOpen(false)}
 *   onSaved={refreshList}
 *   editId={selectedId}
 *   initialMode="view"
 * />
 */
export default function CreateJuteMukam({
	open,
	onClose,
	onSaved,
	editId,
	initialMode = "create",
}: Props) {
	const [loadingSetup, setLoadingSetup] = useState(false);
	const [saving, setSaving] = useState(false);
	const [mode, setMode] = useState<MuiFormMode>(initialMode);
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	// Form state
	const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
	const [formKey, setFormKey] = useState(0);

	/**
	 * Get company ID from localStorage
	 */
	const getCoId = useCallback((): string => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
	}, []);

	/**
	 * Load setup data from API
	 */
	const loadSetup = useCallback(async () => {
		setLoadingSetup(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			if (editId !== undefined) {
				// Edit/View mode - get existing details
				const url = `${apiRoutesPortalMasters.JUTE_MUKAM_EDIT_SETUP}/${editId}?co_id=${co_id}`;
				const { data, error } = await fetchWithCookie(url, "GET");

				if (error || !data) {
					throw new Error(error || "Failed to load setup data");
				}

				if (data.jute_mukam_details) {
					const details = data.jute_mukam_details;
					setInitialValues({
						mukam_name: details.mukam_name ?? "",
					});
				}
			} else {
				// Create mode - empty initial values
				setInitialValues({
					mukam_name: "",
				});
			}

			setFormKey((prev) => prev + 1);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error loading setup";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoadingSetup(false);
		}
	}, [editId, getCoId]);

	useEffect(() => {
		if (open) {
			if (editId !== undefined) {
				setMode(initialMode === "create" ? "edit" : initialMode);
			} else {
				setMode("create");
			}
			loadSetup();
		} else {
			setInitialValues({});
			setFormKey(0);
		}
	}, [open, editId, initialMode, loadSetup]);

	const schema = useMemo<Schema>(
		() => ({
			title:
				editId !== undefined
					? mode === "view"
						? "View Jute Mukam"
						: "Edit Jute Mukam"
					: "Create Jute Mukam",
			fields: [
				{
					name: "mukam_name",
					label: "Mukam Name",
					type: "text",
					required: true,
					disabled: mode === "view",
					grid: { xs: 12 },
				},
			],
		}),
		[editId, mode]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const payload = {
				...values,
				co_id,
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.JUTE_MUKAM_EDIT}/${editId}?co_id=${co_id}`;
				method = "PUT";
			} else {
				url = `${apiRoutesPortalMasters.JUTE_MUKAM_CREATE}?co_id=${co_id}`;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);

			if (error) {
				throw new Error(error);
			}

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Jute mukam updated successfully"
						: "Jute mukam created successfully",
				severity: "success",
			});

			onSaved?.();
			onClose();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Save failed";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setSaving(false);
		}
	};

	const handleModeChange = (newMode: MuiFormMode) => {
		setMode(newMode);
	};

	const dialogTitle = useMemo(() => {
		if (editId !== undefined) {
			return mode === "view" ? "View Jute Mukam" : "Edit Jute Mukam";
		}
		return "Create Jute Mukam";
	}, [editId, mode]);

	return (
		<>
			<Dialog
				open={open}
				onClose={onClose}
				fullWidth
				maxWidth="sm"
				PaperProps={{
					sx: { borderRadius: 2 },
				}}
			>
				<DialogTitle
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						pb: 1,
					}}
				>
					<Typography variant="h6" component="span">
						{dialogTitle}
					</Typography>
					<IconButton onClick={onClose} size="small" aria-label="Close dialog">
						<X size={20} />
					</IconButton>
				</DialogTitle>

				<DialogContent dividers>
					{loadingSetup ? (
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								minHeight: 200,
							}}
						>
							<CircularProgress />
						</Box>
					) : (
						<Box sx={{ pt: 1 }}>
							<MuiForm
								key={formKey}
								schema={schema}
								mode={mode}
								initialValues={initialValues}
								onSubmit={handleSubmit}
								onModeChange={handleModeChange}
								submitLabel={saving ? "Saving..." : "Save"}
								cancelLabel="Cancel"
								onCancel={onClose}
								hideModeToggle={mode === "create"}
							/>
						</Box>
					)}
				</DialogContent>
			</Dialog>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert
					severity={snackbar.severity}
					onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
					sx={{ width: "100%" }}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</>
	);
}
