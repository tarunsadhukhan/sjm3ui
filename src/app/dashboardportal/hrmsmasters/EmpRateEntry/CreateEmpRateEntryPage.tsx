"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Box,
	Snackbar,
	Alert,
	IconButton,
	Typography,
	CircularProgress,
	TextField,
	Button,
	Grid,
} from "@mui/material";
import { X } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

type Props = {
	open: boolean;
	onClose: () => void;
	onSaved?: () => void;
	editId?: number;
};

type FormState = {
	emp_code: string;
	employee_name: string;
	eb_id: number | null;
	rate: string;
	date_of_rate_update: string;
};

const EMPTY_FORM: FormState = {
	emp_code: "",
	employee_name: "",
	eb_id: null,
	rate: "",
	date_of_rate_update: "",
};

export default function CreateEmpRateEntryPage({
	open,
	onClose,
	onSaved,
	editId,
}: Props) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [lookingUp, setLookingUp] = useState(false);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const isEditMode = editId !== undefined;

	const getCoId = useCallback((): string => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
	}, []);

	const loadData = useCallback(async () => {
		if (!isEditMode) {
			setForm(EMPTY_FORM);
			return;
		}

		setLoading(true);
		try {
			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.EMP_RATE_BY_ID}/${editId}`,
				"GET"
			);
			if (error || !data) throw new Error(error || "Failed to load rate entry");

			const rec = data.data ?? data;
			setForm({
				emp_code: rec.emp_code ?? "",
				employee_name: rec.employee_name ?? "",
				eb_id: rec.eb_id ?? null,
				rate: rec.rate != null ? String(rec.rate) : "",
				date_of_rate_update: rec.date_of_rate_update ?? "",
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error loading data";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [editId, isEditMode]);

	useEffect(() => {
		if (open) {
			loadData();
		} else {
			setForm(EMPTY_FORM);
		}
	}, [open, loadData]);

	const handleLookup = async () => {
		const co_id = getCoId();
		if (!co_id) {
			setSnackbar({ open: true, message: "No company selected", severity: "error" });
			return;
		}
		if (!form.emp_code.trim()) {
			setSnackbar({ open: true, message: "Emp No is required", severity: "error" });
			return;
		}

		setLookingUp(true);
		try {
			const query = new URLSearchParams({
				co_id,
				emp_code: form.emp_code.trim(),
			});
			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.EMP_RATE_EMPLOYEE_LOOKUP}?${query}`,
				"GET"
			);
			if (error || !data) throw new Error(error || "Employee lookup failed");
			if (!data.found || !data.data) {
				setForm((prev) => ({ ...prev, employee_name: "", eb_id: null }));
				setSnackbar({ open: true, message: "Employee not found", severity: "error" });
				return;
			}
			setForm((prev) => ({
				...prev,
				employee_name: data.data.employee_name ?? "",
				eb_id: data.data.eb_id ?? null,
			}));
			setSnackbar({ open: true, message: "Employee validated", severity: "success" });
		} catch (err: unknown) {
			setForm((prev) => ({ ...prev, employee_name: "", eb_id: null }));
			setSnackbar({
				open: true,
				message: err instanceof Error ? err.message : "Lookup failed",
				severity: "error",
			});
		} finally {
			setLookingUp(false);
		}
	};

	const handleChange = (field: keyof FormState, value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }));
		// Clear resolved employee if emp_code is changed in create mode
		if (field === "emp_code" && !isEditMode) {
			setForm((prev) => ({ ...prev, emp_code: value, employee_name: "", eb_id: null }));
		}
	};

	const handleSubmit = async () => {
		const co_id = getCoId();
		if (!co_id) {
			setSnackbar({ open: true, message: "No company selected", severity: "error" });
			return;
		}
		if (!isEditMode && !form.eb_id) {
			setSnackbar({ open: true, message: "Please validate the Emp No first", severity: "error" });
			return;
		}
		if (!form.rate) {
			setSnackbar({ open: true, message: "Rate is required", severity: "error" });
			return;
		}
		if (!form.date_of_rate_update) {
			setSnackbar({ open: true, message: "Date of Rate Update is required", severity: "error" });
			return;
		}

		setSaving(true);
		try {
			let url: string;
			let method: "POST" | "PUT";
			let payload: Record<string, unknown>;

			if (isEditMode) {
				url = `${apiRoutesPortalMasters.EMP_RATE_UPDATE}/${editId}`;
				method = "PUT";
				payload = {
					rate: Number(form.rate),
					date_of_rate_update: form.date_of_rate_update,
				};
			} else {
				url = apiRoutesPortalMasters.EMP_RATE_CREATE;
				method = "POST";
				payload = {
					co_id: Number(co_id),
					eb_id: form.eb_id,
					emp_code: form.emp_code.trim(),
					rate: Number(form.rate),
					date_of_rate_update: form.date_of_rate_update,
				};
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message: isEditMode
					? "Rate entry updated successfully"
					: "Rate entry created successfully",
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

	const dialogTitle = isEditMode ? "Edit Employee Rate Entry" : "Create Employee Rate Entry";

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
					{loading ? (
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
							<Grid container spacing={2}>
								{/* Emp No + Validate button (create mode only) */}
								<Grid size={{ xs: 12, sm: isEditMode ? 6 : 8 }}>
									<TextField
										label="Emp No"
										value={form.emp_code}
										onChange={(e) => handleChange("emp_code", e.target.value)}
										disabled={isEditMode}
										required={!isEditMode}
										fullWidth
										size="small"
										onKeyDown={(e) => {
											if (e.key === "Enter" && !isEditMode) handleLookup();
										}}
									/>
								</Grid>
								{!isEditMode && (
									<Grid size={{ xs: 12, sm: 4 }} sx={{ display: "flex", alignItems: "center" }}>
										<Button
											variant="outlined"
											onClick={handleLookup}
											disabled={lookingUp || !form.emp_code.trim()}
											fullWidth
											size="small"
										>
											{lookingUp ? "Validating..." : "Validate"}
										</Button>
									</Grid>
								)}

								{/* Employee Name (readonly) */}
								<Grid size={{ xs: 12, sm: isEditMode ? 6 : 12 }}>
									<TextField
										label="Employee Name"
										value={form.employee_name}
										disabled
										fullWidth
										size="small"
										InputProps={{ readOnly: true }}
									/>
								</Grid>

								{/* Rate */}
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Rate"
										type="number"
										value={form.rate}
										onChange={(e) => handleChange("rate", e.target.value)}
										required
										fullWidth
										size="small"
										inputProps={{ min: 0, step: "any" }}
									/>
								</Grid>

								{/* Date of Rate Update */}
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Date of Rate Update"
										type="date"
										value={form.date_of_rate_update}
										onChange={(e) => handleChange("date_of_rate_update", e.target.value)}
										required
										fullWidth
										size="small"
										InputLabelProps={{ shrink: true }}
									/>
								</Grid>
							</Grid>
						</Box>
					)}
				</DialogContent>

				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={onClose} variant="outlined" size="small">
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						variant="contained"
						size="small"
						disabled={saving || loading}
					>
						{saving ? "Saving..." : "Save"}
					</Button>
				</DialogActions>
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
