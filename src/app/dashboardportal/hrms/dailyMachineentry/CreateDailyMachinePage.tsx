"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
	InputAdornment,
} from "@mui/material";
import { X, Search } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

type Props = {
	open: boolean;
	onClose: () => void;
	onSaved?: () => void;
	editId?: number | string;
};

type FormState = {
	tran_date: string; // YYYY-MM-DD
	mc_code: string;
	mc_name: string; // display only, set after lookup
	mc_code_id: number | null;
	shift_a: string;
	shift_b: string;
	shift_c: string;
};

function emptyForm(): FormState {
	return {
		tran_date: new Date().toISOString().slice(0, 10),
		mc_code: "",
		mc_name: "",
		mc_code_id: null,
		shift_a: "",
		shift_b: "",
		shift_c: "",
	};
}

function getCoId(): string {
	if (typeof window === "undefined") return "";
	const sel = localStorage.getItem("sidebar_selectedCompany");
	return sel ? JSON.parse(sel).co_id : "";
}

function toNum(s: string): number {
	if (!s) return 0;
	const n = Number(s);
	return Number.isFinite(n) ? n : 0;
}

export default function CreateDailyMachinePage({
	open,
	onClose,
	onSaved,
	editId,
}: Props) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [lookingUp, setLookingUp] = useState(false);
	const [form, setForm] = useState<FormState>(emptyForm());
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const isEdit = editId !== undefined;
	const dialogTitle = isEdit
		? "Edit Daily Machine Entry"
		: "Create Daily Machine Entry";

	const total = useMemo(
		() => toNum(form.shift_a) + toNum(form.shift_b) + toNum(form.shift_c),
		[form.shift_a, form.shift_b, form.shift_c]
	);

	const loadData = useCallback(async () => {
		if (!isEdit) {
			setForm(emptyForm());
			return;
		}
		setLoading(true);
		try {
			const url = `${apiRoutesPortalMasters.DAILY_MACHINE_BY_ID}/${editId}`;
			const { data, error } = await fetchWithCookie(url, "GET");
			if (error || !data) throw new Error(error || "Failed to load entry");
			const rec = (data.data ?? data) as Record<string, unknown>;
			setForm({
				tran_date: String(rec.tran_date ?? "").slice(0, 10),
				mc_code: String(rec.mc_code ?? ""),
				mc_name: String(rec.mc_name ?? ""),
				mc_code_id: (rec.mc_code_id as number | null) ?? null,
				shift_a: rec.shift_a !== null && rec.shift_a !== undefined ? String(rec.shift_a) : "",
				shift_b: rec.shift_b !== null && rec.shift_b !== undefined ? String(rec.shift_b) : "",
				shift_c: rec.shift_c !== null && rec.shift_c !== undefined ? String(rec.shift_c) : "",
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error loading data";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [editId, isEdit]);

	useEffect(() => {
		if (open) {
			loadData();
		} else {
			setForm(emptyForm());
		}
	}, [open, loadData]);

	const lookupMcCode = useCallback(async () => {
		const code = form.mc_code.trim();
		if (!code) {
			setSnackbar({
				open: true,
				message: "Enter an MC Code first",
				severity: "error",
			});
			return;
		}
		const co_id = getCoId();
		if (!co_id) {
			setSnackbar({ open: true, message: "No company selected", severity: "error" });
			return;
		}
		setLookingUp(true);
		try {
			const url = `${apiRoutesPortalMasters.DAILY_MACHINE_LOOKUP_MC}?co_id=${encodeURIComponent(
				co_id
			)}&mc_code=${encodeURIComponent(code)}`;
			const { data, error } = await fetchWithCookie<{
				found: boolean;
				data: { mc_code_id: number; mc_code: string; mc_name: string } | null;
			}>(url, "GET");
			if (error || !data) throw new Error(error || "Lookup failed");
			if (!data.found || !data.data) {
				setForm((prev) => ({ ...prev, mc_code_id: null, mc_name: "" }));
				setSnackbar({
					open: true,
					message: "MC Code not found in machine master",
					severity: "error",
				});
				return;
			}
			setForm((prev) => ({
				...prev,
				mc_code: data.data!.mc_code,
				mc_code_id: data.data!.mc_code_id,
				mc_name: data.data!.mc_name ?? "",
			}));
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Lookup failed";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLookingUp(false);
		}
	}, [form.mc_code]);

	const handleMcCodeBlur = () => {
		if (form.mc_code && form.mc_code_id === null) {
			lookupMcCode();
		}
	};

	const handleSubmit = async () => {
		if (!form.tran_date) {
			setSnackbar({ open: true, message: "Date is required", severity: "error" });
			return;
		}
		if (!form.mc_code.trim()) {
			setSnackbar({ open: true, message: "MC Code is required", severity: "error" });
			return;
		}
		if (form.mc_code_id === null) {
			setSnackbar({
				open: true,
				message: "Please validate MC Code (click search or tab out)",
				severity: "error",
			});
			return;
		}

		setSaving(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const payload = {
				co_id,
				tran_date: form.tran_date,
				mc_code: form.mc_code,
				mc_code_id: form.mc_code_id,
				shift_a: toNum(form.shift_a),
				shift_b: toNum(form.shift_b),
				shift_c: toNum(form.shift_c),
			};

			const url = isEdit
				? `${apiRoutesPortalMasters.DAILY_MACHINE_EDIT}/${editId}`
				: apiRoutesPortalMasters.DAILY_MACHINE_CREATE;
			const method: "POST" | "PUT" = isEdit ? "PUT" : "POST";

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message: isEdit
					? "Daily machine entry updated successfully"
					: "Daily machine entry created successfully",
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
						<Box
							sx={{
								display: "grid",
								gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
								gap: 2,
								pt: 1,
							}}
						>
							<TextField
								label="Date"
								type="date"
								required
								value={form.tran_date}
								onChange={(e) =>
									setForm((p) => ({ ...p, tran_date: e.target.value }))
								}
								InputLabelProps={{ shrink: true }}
								fullWidth
							/>

							<TextField
								label="MC Code"
								required
								value={form.mc_code}
								onChange={(e) =>
									setForm((p) => ({
										...p,
										mc_code: e.target.value,
										mc_code_id: null,
										mc_name: "",
									}))
								}
								onBlur={handleMcCodeBlur}
								fullWidth
								InputProps={{
									endAdornment: (
										<InputAdornment position="end">
											<IconButton
												size="small"
												onClick={lookupMcCode}
												disabled={lookingUp}
												aria-label="Validate MC Code"
											>
												{lookingUp ? (
													<CircularProgress size={16} />
												) : (
													<Search size={16} />
												)}
											</IconButton>
										</InputAdornment>
									),
								}}
							/>

							<TextField
								label="MC Name"
								value={form.mc_name}
								disabled
								fullWidth
								sx={{ gridColumn: { xs: "auto", sm: "1 / span 2" } }}
							/>

							<TextField
								label="Shift A"
								type="number"
								value={form.shift_a}
								onChange={(e) =>
									setForm((p) => ({ ...p, shift_a: e.target.value }))
								}
								fullWidth
								inputProps={{ step: "0.01" }}
							/>
							<TextField
								label="Shift B"
								type="number"
								value={form.shift_b}
								onChange={(e) =>
									setForm((p) => ({ ...p, shift_b: e.target.value }))
								}
								fullWidth
								inputProps={{ step: "0.01" }}
							/>
							<TextField
								label="Shift C"
								type="number"
								value={form.shift_c}
								onChange={(e) =>
									setForm((p) => ({ ...p, shift_c: e.target.value }))
								}
								fullWidth
								inputProps={{ step: "0.01" }}
							/>

							<TextField
								label="Total MC"
								value={total.toFixed(2)}
								disabled
								fullWidth
							/>
						</Box>
					)}
				</DialogContent>

				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={onClose} disabled={saving}>
						Cancel
					</Button>
					<Button
						variant="contained"
						onClick={handleSubmit}
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
