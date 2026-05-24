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

const DI_OPTIONS: Option[] = [
	{ label: "Direct", value: "D" },
	{ label: "Indirect", value: "I" },
];

const FV_OPTIONS: Option[] = [
	{ label: "Fixed", value: "F" },
	{ label: "Variable", value: "V" },
];

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

export default function CreateDesigNormsSetPage({
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
			`${apiRoutesPortalMasters.DESIG_NORMS_SETUP}?${params}`,
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
					desig_id: "",
					direct_indirect: "D",
					fixed_variable: "F",
					shift_a: "",
					shift_b: "",
					shift_c: "",
					shift_g: "",
					norms: "",
					mc_id: "",
					no_of_mcs: "",
					no_of_hands: "",
				});
				setFormKey((prev) => prev + 1);
				return;
			}

			const detailUrl = `${apiRoutesPortalMasters.DESIG_NORMS_BY_ID}/${editId}`;
			const { data: detailData, error: detailErr } = await fetchWithCookie(
				detailUrl,
				"GET"
			);
			if (detailErr || !detailData) {
				throw new Error(detailErr || "Failed to load designation norm");
			}
			const rec = detailData.data ?? detailData;
			setInitialValues({
				desig_id: rec.desig_id != null ? String(rec.desig_id) : "",
				direct_indirect: rec.direct_indirect ?? "D",
				fixed_variable: rec.fixed_variable ?? "F",
				shift_a: rec.shift_a ?? "",
				shift_b: rec.shift_b ?? "",
				shift_c: rec.shift_c ?? "",
				shift_g: rec.shift_g ?? "",
				norms: rec.norms ?? "",
				mc_id: rec.mc_id != null ? String(rec.mc_id) : "",
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

	const isVariable = (values: Record<string, unknown>) =>
		(values.fixed_variable as string) !== "V";

	const schema = useMemo<Schema>(
		() => ({
			title: editId !== undefined ? "Edit Designation Norm" : "Create Designation Norm",
			fields: [
				{
					name: "desig_id",
					label: "Designation",
					type: "select",
					required: true,
					options: designationOptions,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "direct_indirect",
					label: "Direct / Indirect",
					type: "select",
					required: true,
					options: DI_OPTIONS,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "fixed_variable",
					label: "Fixed / Variable",
					type: "select",
					required: true,
					options: FV_OPTIONS,
					grid: { xs: 12, sm: 6 },
				},
				{
					name: "norms",
					label: "Norms",
					type: "text",
					grid: { xs: 12, sm: 6 },
				},
				{ name: "shift_a", label: "Shift A", type: "number", grid: { xs: 12, sm: 3 } },
				{ name: "shift_b", label: "Shift B", type: "number", grid: { xs: 12, sm: 3 } },
				{ name: "shift_c", label: "Shift C", type: "number", grid: { xs: 12, sm: 3 } },
				{ name: "shift_g", label: "Shift G", type: "number", grid: { xs: 12, sm: 3 } },
				{
					name: "mc_id",
					label: "Machine",
					type: "select",
					options: machineOptions,
					disabled: isVariable,
					grid: { xs: 12, sm: 4 },
				},
				{
					name: "no_of_mcs",
					label: "No. of Machines",
					type: "number",
					disabled: isVariable,
					grid: { xs: 12, sm: 4 },
				},
				{
					name: "no_of_hands",
					label: "No. of Hands",
					type: "number",
					disabled: isVariable,
					grid: { xs: 12, sm: 4 },
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

			const fixedVariable = (values.fixed_variable as string) || "F";
			const isVar = fixedVariable === "V";

			const selectedMachine = machines.find(
				(m) => String(m.mc_code_id) === String(values.mc_id)
			);

			const payload = {
				co_id,
				desig_id: values.desig_id ? Number(values.desig_id) : null,
				direct_indirect: values.direct_indirect,
				fixed_variable: fixedVariable,
				shift_a: values.shift_a === "" ? null : values.shift_a,
				shift_b: values.shift_b === "" ? null : values.shift_b,
				shift_c: values.shift_c === "" ? null : values.shift_c,
				shift_g: values.shift_g === "" ? null : values.shift_g,
				norms: values.norms || null,
				mc_id: isVar && values.mc_id ? Number(values.mc_id) : null,
				no_of_mcs: isVar && values.no_of_mcs !== "" ? values.no_of_mcs : null,
				no_of_hands:
					isVar && values.no_of_hands !== "" ? values.no_of_hands : null,
				mc_code: isVar && selectedMachine ? selectedMachine.mc_code : null,
				mc_type:
					isVar && selectedMachine && selectedMachine.machine_type != null
						? selectedMachine.machine_type
						: null,
			};

			let url: string;
			let method: "POST" | "PUT";

			if (editId !== undefined) {
				url = `${apiRoutesPortalMasters.DESIG_NORMS_EDIT}/${editId}`;
				method = "PUT";
			} else {
				url = apiRoutesPortalMasters.DESIG_NORMS_CREATE;
				method = "POST";
			}

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			setSnackbar({
				open: true,
				message:
					editId !== undefined
						? "Designation norm updated successfully"
						: "Designation norm created successfully",
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
		editId !== undefined ? "Edit Designation Norm" : "Create Designation Norm";

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
