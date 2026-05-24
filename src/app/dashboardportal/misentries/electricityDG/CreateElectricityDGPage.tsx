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
	Autocomplete,
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

type BranchOption = {
	branch_id: number;
	branch_name: string;
};

type FormState = {
	tran_date: string;
	branch_id: number | null;
	elec_unit: string;
	dg_unit: string;
	wip_data: string;
	dust_boiler: string;
};

const EMPTY_FORM: FormState = {
	tran_date: "",
	branch_id: null,
	elec_unit: "",
	dg_unit: "",
	wip_data: "",
	dust_boiler: "",
};

export default function CreateElectricityDGPage({
	open,
	onClose,
	onSaved,
	editId,
}: Props) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [branchOptions, setBranchOptions] = useState<BranchOption[]>([]);
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

	const loadSetup = useCallback(async () => {
		const co_id = getCoId();
		if (!co_id) return;
		try {
			const params = new URLSearchParams({ co_id });
			const branch_id = getBranchIds();
			if (branch_id) params.append("branch_id", branch_id);

			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.ELECTRICITY_DG_SETUP}?${params}`,
				"GET"
			);
			if (error || !data) throw new Error(error || "Failed to load setup data");

			const branches: BranchOption[] = (data.branches || []).map(
				(r: Record<string, unknown>) => ({
					branch_id: r.branch_id as number,
					branch_name: (r.branch_name as string) ?? "",
				})
			);
			setBranchOptions(branches);
		} catch (err: unknown) {
			const message =
				err instanceof Error ? err.message : "Error loading setup data";
			setSnackbar({ open: true, message, severity: "error" });
		}
	}, [getCoId, getBranchIds]);

	const loadData = useCallback(async () => {
		if (!isEditMode) {
			setForm(EMPTY_FORM);
			return;
		}

		setLoading(true);
		try {
			const { data, error } = await fetchWithCookie(
				`${apiRoutesPortalMasters.ELECTRICITY_DG_BY_ID}/${editId}`,
				"GET"
			);
			if (error || !data) throw new Error(error || "Failed to load entry");

			const rec = data.data ?? data;
			setForm({
				tran_date: rec.tran_date ?? "",
				branch_id: rec.branch_id ?? null,
				elec_unit: rec.elec_unit != null ? String(rec.elec_unit) : "",
				dg_unit: rec.dg_unit != null ? String(rec.dg_unit) : "",
				wip_data: rec.wip_data != null ? String(rec.wip_data) : "",
				dust_boiler: rec.dust_boiler != null ? String(rec.dust_boiler) : "",
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
			loadSetup();
			loadData();
		} else {
			setForm(EMPTY_FORM);
		}
	}, [open, loadData, loadSetup]);

	useEffect(() => {
		if (branchOptions.length === 1) {
			setForm((prev) =>
				prev.branch_id == null
					? { ...prev, branch_id: branchOptions[0].branch_id }
					: prev
			);
		}
	}, [branchOptions]);

	const handleChange = (
		field: keyof FormState,
		value: string | number | null
	) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async () => {
		const co_id = getCoId();
		if (!co_id) {
			setSnackbar({ open: true, message: "No company selected", severity: "error" });
			return;
		}
		if (!form.tran_date) {
			setSnackbar({ open: true, message: "Date is required", severity: "error" });
			return;
		}
		if (!form.branch_id) {
			setSnackbar({ open: true, message: "Branch is required", severity: "error" });
			return;
		}

		setSaving(true);
		try {
			let url: string;
			let method: "POST" | "PUT";
			const payload: Record<string, unknown> = {
				co_id: Number(co_id),
				tran_date: form.tran_date,
				branch_id: form.branch_id,
				elec_unit: form.elec_unit ? Number(form.elec_unit) : 0,
				dg_unit: form.dg_unit ? Number(form.dg_unit) : 0,
				wip_data: form.wip_data ? Number(form.wip_data) : 0,
				dust_boiler: form.dust_boiler ? Number(form.dust_boiler) : 0,
			};

			if (isEditMode) {
				url = `${apiRoutesPortalMasters.ELECTRICITY_DG_UPDATE}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.ELECTRICITY_DG_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message: isEditMode
					? "Entry updated successfully"
					: "Entry created successfully",
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

	const dialogTitle = isEditMode
		? "Edit Electricity / DG Entry"
		: "Create Electricity / DG Entry";

	const selectedBranch =
		branchOptions.find((b) => b.branch_id === form.branch_id) ?? null;

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
								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Date"
										type="date"
										value={form.tran_date}
										onChange={(e) => handleChange("tran_date", e.target.value)}
										required
										fullWidth
										size="small"
										InputLabelProps={{ shrink: true }}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<Autocomplete
										options={branchOptions}
										value={selectedBranch}
										onChange={(_e, val) =>
											handleChange("branch_id", val?.branch_id ?? null)
										}
										getOptionLabel={(opt) => opt.branch_name}
										isOptionEqualToValue={(opt, val) =>
											opt.branch_id === val.branch_id
										}
										size="small"
										renderInput={(params) => (
											<TextField {...params} label="Branch" required />
										)}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Electricity Unit"
										type="number"
										value={form.elec_unit}
										onChange={(e) => handleChange("elec_unit", e.target.value)}
										fullWidth
										size="small"
										inputProps={{ min: 0, step: 1 }}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="DG Unit"
										type="number"
										value={form.dg_unit}
										onChange={(e) => handleChange("dg_unit", e.target.value)}
										fullWidth
										size="small"
										inputProps={{ min: 0, step: 1 }}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="WIP"
										type="number"
										value={form.wip_data}
										onChange={(e) => handleChange("wip_data", e.target.value)}
										fullWidth
										size="small"
										inputProps={{ min: 0, step: "any" }}
									/>
								</Grid>

								<Grid size={{ xs: 12, sm: 6 }}>
									<TextField
										label="Dust Boiler"
										type="number"
										value={form.dust_boiler}
										onChange={(e) => handleChange("dust_boiler", e.target.value)}
										fullWidth
										size="small"
										inputProps={{ min: 0, step: 1 }}
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
