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

type Option = { label: string; value: string };

type Props = {
	open: boolean;
	onClose: () => void;
	onSaved?: () => void;
	editId?: number | string;
};

type EmployeeOpt = {
	eb_id: number;
	emp_code: string | null;
	full_name: string | null;
};

export default function CreateBioEmpLinkPage({
	open,
	onClose,
	onSaved,
	editId,
}: Props) {
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [mode, setMode] = useState<MuiFormMode>("create");
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const [initialValues, setInitialValues] = useState<Record<string, unknown>>({});
	const [formKey, setFormKey] = useState(0);
	const [employees, setEmployees] = useState<EmployeeOpt[]>([]);

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
		const branch_id = getBranchIds();
		const params = new URLSearchParams({ co_id });
		if (branch_id) params.append("branch_id", branch_id);
		const { data, error } = await fetchWithCookie(
			`${apiRoutesPortalMasters.BIO_EMP_LINK_SETUP}?${params}`,
			"GET"
		);
		if (error || !data) {
			throw new Error(error || "Failed to load setup data");
		}
		setEmployees((data.employees as EmployeeOpt[]) ?? []);
	}, [getCoId, getBranchIds]);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			await loadSetup();

			if (editId === undefined) {
				setInitialValues({
					master_id: "",
					bio_dev_id: "",
				});
				setFormKey((prev) => prev + 1);
				return;
			}

			const detailUrl = `${apiRoutesPortalMasters.BIO_EMP_LINK_BY_ID}/${editId}`;
			const { data: detailData, error: detailErr } = await fetchWithCookie(
				detailUrl,
				"GET"
			);
			if (detailErr || !detailData) {
				throw new Error(detailErr || "Failed to load record");
			}
			const rec = detailData.data ?? detailData;
			setInitialValues({
				master_id: rec.master_id != null ? String(rec.master_id) : "",
				bio_dev_id: rec.bio_dev_id ?? "",
			});
			setFormKey((prev) => prev + 1);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error loading data";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [editId, loadSetup]);

	useEffect(() => {
		if (open) {
			setMode(editId !== undefined ? "edit" : "create");
			loadData();
		} else {
			setInitialValues({});
			setFormKey(0);
		}
	}, [open, editId, loadData]);

	const employeeOptions = useMemo<Option[]>(
		() =>
			employees.map((e) => ({
				label: e.emp_code ? `${e.emp_code} — ${e.full_name ?? ""}` : String(e.full_name ?? e.eb_id),
				value: String(e.eb_id),
			})),
		[employees]
	);

	const schema = useMemo<Schema>(
		() => ({
			title: editId !== undefined ? "Edit Bio Link" : "Create Bio Link",
			fields: [
				{
					name: "master_id",
					label: "Employee",
					type: "select",
					required: true,
					options: employeeOptions,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "bio_dev_id",
					label: "Bio Device ID",
					type: "number",
					required: true,
					grid: { xs: 12, sm: 6 },
				},
			],
		}),
		[editId, employeeOptions]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const payload = {
				co_id,
				master_id: values.master_id ? Number(values.master_id) : null,
				bio_dev_id: values.bio_dev_id === "" ? null : Number(values.bio_dev_id),
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.BIO_EMP_LINK_EDIT}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.BIO_EMP_LINK_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Bio link updated successfully"
						: "Bio link created successfully",
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

	const dialogTitle = editId !== undefined ? "Edit Bio Link" : "Create Bio Link";

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
							<MuiForm
								key={formKey}
								schema={schema}
								mode={mode}
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
