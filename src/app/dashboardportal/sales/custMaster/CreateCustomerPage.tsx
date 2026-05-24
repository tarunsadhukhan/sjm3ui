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
import { MuiForm } from "@/components/ui/muiform";
import type { MuiFormMode, Schema } from "@/components/ui/muiform";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

type Props = {
	open: boolean;
	onClose: () => void;
	onSaved?: () => void;
	mode?: "create" | "edit";
	editId?: number | string;
};

export default function CreateCustomerPage({
	open,
	onClose,
	onSaved,
	mode = "create",
	editId,
}: Props) {
	const [loadingDetail, setLoadingDetail] = useState(false);
	const [saving, setSaving] = useState(false);
	const [formMode, setFormMode] = useState<MuiFormMode>("create");
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
	const [formKey, setFormKey] = useState(0);

	const loadDetail = useCallback(async () => {
		if (mode !== "edit" || editId === undefined) {
			setInitialValues({ customer_name: "", shr_name: "" });
			setFormKey((prev) => prev + 1);
			return;
		}
		setLoadingDetail(true);
		try {
			const url = `${apiRoutesPortalMasters.CUSTOMER_BY_ID}/${editId}`;
			const { data, error } = await fetchWithCookie(url, "GET");
			if (error || !data) throw new Error(error || "Failed to load customer");

			const rec = (data.data ?? data) as Record<string, unknown>;
			setInitialValues({
				customer_name: rec.customer_name ?? "",
				shr_name: rec.shr_name ?? "",
			});
			setFormKey((prev) => prev + 1);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error loading customer";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoadingDetail(false);
		}
	}, [mode, editId]);

	useEffect(() => {
		if (open) {
			setFormMode(mode === "edit" ? "edit" : "create");
			loadDetail();
		} else {
			setInitialValues({});
			setFormKey(0);
		}
	}, [open, mode, loadDetail]);

	const schema = useMemo<Schema>(
		() => ({
			title: mode === "edit" ? "Edit Customer" : "Create Customer",
			fields: [
				{
					name: "customer_name",
					label: "Customer Name",
					type: "text",
					required: true,
					grid: { xs: 12, sm: 8 },
				},
				{
					name: "shr_name",
					label: "Short Name",
					type: "text",
					grid: { xs: 12, sm: 4 },
					helperText: "Max 10 characters",
					customValidate: (value) => {
						const v = typeof value === "string" ? value : "";
						if (v.length > 10) return "Short name must be 10 characters or less";
						return null;
					},
				},
			],
		}),
		[mode]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const payload: Record<string, unknown> = {
				customer_name: values.customer_name,
				shr_name: values.shr_name || null,
			};

			let url: string;
			if (mode === "edit" && editId !== undefined) {
				payload.tbl_cust_mst_id = editId;
				url = apiRoutesPortalMasters.CUSTOMER_EDIT;
			} else {
				url = apiRoutesPortalMasters.CUSTOMER_CREATE;
			}

			const { error } = await fetchWithCookie(url, "POST", payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					mode === "edit"
						? "Customer updated successfully"
						: "Customer created successfully",
				severity: "success",
			});

			onSaved?.();
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Save failed";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setSaving(false);
		}
	};

	const dialogTitle = mode === "edit" ? "Edit Customer" : "Create Customer";

	return (
		<>
			<Dialog
				open={open}
				onClose={onClose}
				fullWidth
				maxWidth="sm"
				PaperProps={{ sx: { borderRadius: 2 } }}
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
					{loadingDetail ? (
						<Box
							sx={{
								display: "flex",
								justifyContent: "center",
								alignItems: "center",
								minHeight: 180,
							}}
						>
							<CircularProgress />
						</Box>
					) : (
						<Box sx={{ pt: 1 }}>
							<MuiForm
								key={formKey}
								schema={schema}
								mode={formMode}
								initialValues={initialValues}
								onSubmit={handleSubmit}
								submitLabel={saving ? "Saving..." : "Save"}
								cancelLabel="Cancel"
								onCancel={onClose}
								hideModeToggle
							/>
						</Box>
					)}
				</DialogContent>
			</Dialog>

			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert
					onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
					severity={snackbar.severity}
					variant="filled"
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</>
	);
}
