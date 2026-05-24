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

type DesignationOpt = {
	designation_id: number;
	desig: string;
	branch_id?: number | null;
};

type MachineOpt = {
	mc_code_id: number;
	mc_code: string;
	mc_name?: string | null;
	machine_type?: number | null;
};

export default function CreateManMachineMstPage({
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
	const [designations, setDesignations] = useState<DesignationOpt[]>([]);
	const [machines, setMachines] = useState<MachineOpt[]>([]);

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
			`${apiRoutesPortalMasters.MAN_MACHINE_MST_SETUP}?${params}`,
			"GET"
		);
		if (error || !data) {
			throw new Error(error || "Failed to load setup data");
		}
		setDesignations((data.designations as DesignationOpt[]) ?? []);
		setMachines((data.machines as MachineOpt[]) ?? []);
	}, [getCoId, getBranchIds]);

	const loadData = useCallback(async () => {
		setLoading(true);
		try {
			await loadSetup();

			if (editId === undefined) {
				setInitialValues({
					mc_id: "",
					desig_id: "",
					no_of_mcs: "",
					no_of_hands: "",
				});
				setFormKey((prev) => prev + 1);
				return;
			}

			const detailUrl = `${apiRoutesPortalMasters.MAN_MACHINE_MST_BY_ID}/${editId}`;
			const { data: detailData, error: detailErr } = await fetchWithCookie(
				detailUrl,
				"GET"
			);
			if (detailErr || !detailData) {
				throw new Error(detailErr || "Failed to load record");
			}
			const rec = detailData.data ?? detailData;
			setInitialValues({
				mc_id: rec.mc_id != null ? String(rec.mc_id) : "",
				desig_id: rec.desig_id != null ? String(rec.desig_id) : "",
				no_of_mcs: rec.no_of_mcs ?? "",
				no_of_hands: rec.no_of_hands ?? "",
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

	const designationOptions = useMemo<Option[]>(
		() =>
			designations.map((d) => ({
				label: d.desig,
				value: String(d.designation_id),
			})),
		[designations]
	);

	const machineOptions = useMemo<Option[]>(
		() =>
			machines.map((m) => ({
				label: m.mc_name ? `${m.mc_code} — ${m.mc_name}` : m.mc_code,
				value: String(m.mc_code_id),
			})),
		[machines]
	);

	const schema = useMemo<Schema>(
		() => ({
			title:
				editId !== undefined ? "Edit Man-Machine Link" : "Create Man-Machine Link",
			fields: [
				{
					name: "mc_id",
					label: "Machine",
					type: "select",
					required: true,
					options: machineOptions,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "desig_id",
					label: "Designation",
					type: "select",
					required: true,
					options: designationOptions,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "no_of_mcs",
					label: "No. of Machines",
					type: "number",
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "no_of_hands",
					label: "No. of Hands",
					type: "number",
					grid: { xs: 12, sm: 6 },
				},
			],
		}),
		[editId, designationOptions, machineOptions]
	);

	const handleSubmit = async (values: Record<string, unknown>) => {
		setSaving(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			const payload = {
				co_id,
				mc_id: values.mc_id ? Number(values.mc_id) : null,
				desig_id: values.desig_id ? Number(values.desig_id) : null,
				no_of_mcs: values.no_of_mcs === "" ? null : values.no_of_mcs,
				no_of_hands: values.no_of_hands === "" ? null : values.no_of_hands,
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.MAN_MACHINE_MST_EDIT}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.MAN_MACHINE_MST_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Man-Machine link updated successfully"
						: "Man-Machine link created successfully",
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

	const dialogTitle =
		editId !== undefined ? "Edit Man-Machine Link" : "Create Man-Machine Link";

	return (
		<>
			<Dialog
				open={open}
				onClose={onClose}
				fullWidth
				maxWidth="md"
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
