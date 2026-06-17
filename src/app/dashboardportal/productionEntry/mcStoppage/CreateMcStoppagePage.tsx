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
	TextField,
	Button,
	Autocomplete,
	MenuItem,
	CircularProgress,
} from "@mui/material";
import { X } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type SpellOption = { spell_id: number; spell_name: string };
type MachineOption = {
	machine_id: number;
	machine_name: string;
	dept_name?: string | null;
};

type Props = {
	open: boolean;
	onClose: () => void;
	onSaved?: (message: string) => void;
	editId?: number | string;
};

type FormState = {
	stop_date: string;
	spell_id: number | "";
	mc_id: number | null;
	stop_hours: string;
};

function getCoId(): string {
	if (typeof window === "undefined") return "";
	const sel = localStorage.getItem("sidebar_selectedCompany");
	return sel ? JSON.parse(sel).co_id : "";
}

function emptyForm(): FormState {
	return {
		stop_date: new Date().toISOString().slice(0, 10),
		spell_id: "",
		mc_id: null,
		stop_hours: "",
	};
}

export default function CreateMcStoppagePage({
	open,
	onClose,
	onSaved,
	editId,
}: Props) {
	const { selectedBranches } = useSidebarContext();

	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState<FormState>(emptyForm());
	const [spells, setSpells] = useState<SpellOption[]>([]);
	const [machines, setMachines] = useState<MachineOption[]>([]);
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const isEdit = editId !== undefined;
	const dialogTitle = isEdit
		? "Edit Machine Stoppage"
		: "Create Machine Stoppage";

	const selectedMachine =
		machines.find((m) => m.machine_id === form.mc_id) ?? null;

	const loadSetupAndData = useCallback(async () => {
		const co_id = getCoId();
		if (!co_id || !selectedBranches.length) {
			setSnackbar({
				open: true,
				message: "Select a company and branch first",
				severity: "error",
			});
			return;
		}
		setLoading(true);
		try {
			// Options.
			const params = new URLSearchParams({
				co_id,
				branch_id: selectedBranches.join(","),
			});
			const { data: setup, error: setupErr } = await fetchWithCookie<{
				spells: SpellOption[];
				machines: MachineOption[];
			}>(`${apiRoutesPortalMasters.MC_STOPPAGE_SETUP}?${params}`, "GET");
			if (setupErr || !setup) throw new Error(setupErr || "Failed to load options");
			setSpells(setup.spells || []);
			setMachines(setup.machines || []);

			// Existing row (edit).
			if (isEdit) {
				const { data, error } = await fetchWithCookie(
					`${apiRoutesPortalMasters.MC_STOPPAGE_BY_ID}/${editId}`,
					"GET"
				);
				if (error || !data) throw new Error(error || "Failed to load entry");
				const rec = (data.data ?? data) as Record<string, unknown>;
				setForm({
					stop_date: String(rec.stop_date ?? "").slice(0, 10),
					spell_id: (rec.spell_id as number | null) ?? "",
					mc_id: (rec.mc_id as number | null) ?? null,
					stop_hours:
						rec.stop_hours !== null && rec.stop_hours !== undefined
							? String(rec.stop_hours)
							: "",
				});
			} else {
				setForm(emptyForm());
			}
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error loading data";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [editId, isEdit, selectedBranches]);

	useEffect(() => {
		if (open) {
			loadSetupAndData();
		} else {
			setForm(emptyForm());
		}
	}, [open, loadSetupAndData]);

	const handleSubmit = async () => {
		if (!form.stop_date) {
			setSnackbar({ open: true, message: "Date is required", severity: "error" });
			return;
		}
		if (form.spell_id === "") {
			setSnackbar({ open: true, message: "Spell is required", severity: "error" });
			return;
		}
		if (form.mc_id === null) {
			setSnackbar({ open: true, message: "Machine is required", severity: "error" });
			return;
		}
		const hours = Number(form.stop_hours);
		if (form.stop_hours === "" || !Number.isFinite(hours) || hours < 0) {
			setSnackbar({
				open: true,
				message: "Stop hours must be a non-negative number",
				severity: "error",
			});
			return;
		}

		setSaving(true);
		try {
			const payload = {
				stop_date: form.stop_date,
				spell_id: form.spell_id,
				mc_id: form.mc_id,
				stop_hours: hours,
			};
			const url = isEdit
				? `${apiRoutesPortalMasters.MC_STOPPAGE_EDIT}/${editId}`
				: apiRoutesPortalMasters.MC_STOPPAGE_CREATE;
			const method: "POST" | "PUT" = isEdit ? "PUT" : "POST";

			const { error } = await fetchWithCookie(url, method, payload);
			if (error) throw new Error(error);

			onSaved?.(
				isEdit
					? "Machine stoppage entry updated"
					: "Machine stoppage entry created"
			);
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
								label="Stop Date"
								type="date"
								required
								value={form.stop_date}
								onChange={(e) =>
									setForm((p) => ({ ...p, stop_date: e.target.value }))
								}
								InputLabelProps={{ shrink: true }}
								fullWidth
							/>

							<TextField
								label="Spell"
								select
								required
								value={form.spell_id === "" ? "" : String(form.spell_id)}
								onChange={(e) =>
									setForm((p) => ({
										...p,
										spell_id: e.target.value === "" ? "" : Number(e.target.value),
									}))
								}
								fullWidth
							>
								{spells.map((s) => (
									<MenuItem key={s.spell_id} value={String(s.spell_id)}>
										{s.spell_name}
									</MenuItem>
								))}
							</TextField>

							<Autocomplete<MachineOption>
								sx={{ gridColumn: { xs: "auto", sm: "1 / span 2" } }}
								options={machines}
								value={selectedMachine}
								onChange={(_e, val) =>
									setForm((p) => ({ ...p, mc_id: val?.machine_id ?? null }))
								}
								isOptionEqualToValue={(opt, val) =>
									opt.machine_id === val.machine_id
								}
								getOptionLabel={(opt) =>
									opt.dept_name
										? `${opt.machine_name} (${opt.dept_name})`
										: opt.machine_name
								}
								renderInput={(params) => (
									<TextField {...params} label="Machine" required />
								)}
							/>

							<TextField
								label="Stop Hours"
								type="number"
								required
								value={form.stop_hours}
								onChange={(e) =>
									setForm((p) => ({ ...p, stop_hours: e.target.value }))
								}
								inputProps={{ step: "0.001", min: "0" }}
								helperText="Decimal hours, e.g. 1.500 = 1h 30m"
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
