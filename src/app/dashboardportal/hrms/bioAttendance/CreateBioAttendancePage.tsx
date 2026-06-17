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

type EmployeeOption = {
	eb_id: number;
	emp_code: string;
	emp_name: string;
};

type Props = {
	open: boolean;
	onClose: () => void;
	onSaved?: (message: string) => void;
};

function getCoId(): string {
	if (typeof window === "undefined") return "";
	const sel = localStorage.getItem("sidebar_selectedCompany");
	return sel ? JSON.parse(sel).co_id : "";
}

/** Local "now" as a value for <input type="datetime-local"> (YYYY-MM-DDTHH:mm). */
function localNow(): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
		d.getHours()
	)}:${pad(d.getMinutes())}`;
}

export default function CreateBioAttendancePage({ open, onClose, onSaved }: Props) {
	const { selectedBranches } = useSidebarContext();

	const [saving, setSaving] = useState(false);
	const [employee, setEmployee] = useState<EmployeeOption | null>(null);
	const [logDate, setLogDate] = useState<string>(localNow());
	const [direction, setDirection] = useState<"In" | "Out">("In");

	const [options, setOptions] = useState<EmployeeOption[]>([]);
	const [inputValue, setInputValue] = useState("");
	const [searching, setSearching] = useState(false);

	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const resetForm = useCallback(() => {
		setEmployee(null);
		setLogDate(localNow());
		setDirection("In");
		setOptions([]);
		setInputValue("");
	}, []);

	useEffect(() => {
		if (open) resetForm();
	}, [open, resetForm]);

	// Debounced async employee search.
	useEffect(() => {
		if (!open) return;
		const term = inputValue.trim();
		const co_id = getCoId();
		if (!co_id || !selectedBranches.length) return;

		const handle = setTimeout(async () => {
			setSearching(true);
			try {
				const params = new URLSearchParams({
					co_id,
					branch_id: selectedBranches.join(","),
				});
				if (term) params.append("search", term);
				const { data, error } = await fetchWithCookie<{
					data: EmployeeOption[];
				}>(`${apiRoutesPortalMasters.BIO_ATT_EMP_SEARCH}?${params}`, "GET");
				if (error || !data) throw new Error(error || "Search failed");
				setOptions(data.data || []);
			} catch {
				setOptions([]);
			} finally {
				setSearching(false);
			}
		}, 350);

		return () => clearTimeout(handle);
	}, [inputValue, open, selectedBranches]);

	const handleSubmit = async () => {
		if (!employee) {
			setSnackbar({ open: true, message: "Select an employee", severity: "error" });
			return;
		}
		if (!logDate) {
			setSnackbar({ open: true, message: "Log date is required", severity: "error" });
			return;
		}
		const co_id = getCoId();
		if (!co_id) {
			setSnackbar({ open: true, message: "No company selected", severity: "error" });
			return;
		}
		if (!selectedBranches.length) {
			setSnackbar({ open: true, message: "No branch selected", severity: "error" });
			return;
		}

		setSaving(true);
		try {
			const payload = {
				co_id,
				branch_id: selectedBranches[0],
				eb_id: employee.eb_id,
				log_date: logDate.replace("T", " "),
				direction,
			};
			const { data, error } = await fetchWithCookie<{
				message: string;
				bio_id_resolved: boolean;
			}>(apiRoutesPortalMasters.BIO_ATT_MANUAL_CREATE, "POST", payload);
			if (error) throw new Error(error);

			const message =
				data && data.bio_id_resolved === false
					? "Entry saved (no Bio ID link found for this employee)"
					: "Manual bio-attendance entry saved";
			onSaved?.(message);
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
						Create Bio Attendance Entry
					</Typography>
					<IconButton onClick={onClose} size="small" aria-label="Close dialog">
						<X size={20} />
					</IconButton>
				</DialogTitle>

				<DialogContent dividers>
					<Box
						sx={{
							display: "grid",
							gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
							gap: 2,
							pt: 1,
						}}
					>
						<Autocomplete<EmployeeOption>
							sx={{ gridColumn: { xs: "auto", sm: "1 / span 2" } }}
							options={options}
							value={employee}
							onChange={(_e, val) => setEmployee(val)}
							inputValue={inputValue}
							onInputChange={(_e, val) => setInputValue(val)}
							loading={searching}
							isOptionEqualToValue={(opt, val) => opt.eb_id === val.eb_id}
							getOptionLabel={(opt) =>
								opt.emp_code ? `${opt.emp_code} — ${opt.emp_name}` : opt.emp_name
							}
							filterOptions={(x) => x}
							noOptionsText="Type to search employees"
							renderInput={(params) => (
								<TextField
									{...params}
									label="Employee (Eb No)"
									required
									InputProps={{
										...params.InputProps,
										endAdornment: (
											<>
												{searching ? <CircularProgress size={16} /> : null}
												{params.InputProps.endAdornment}
											</>
										),
									}}
								/>
							)}
						/>

						<TextField
							label="Log Date / Time"
							type="datetime-local"
							required
							value={logDate}
							onChange={(e) => setLogDate(e.target.value)}
							InputLabelProps={{ shrink: true }}
							fullWidth
						/>

						<TextField
							label="Direction"
							select
							required
							value={direction}
							onChange={(e) => setDirection(e.target.value as "In" | "Out")}
							fullWidth
						>
							<MenuItem value="In">In</MenuItem>
							<MenuItem value="Out">Out</MenuItem>
						</TextField>
					</Box>
				</DialogContent>

				<DialogActions sx={{ px: 3, pb: 2 }}>
					<Button onClick={onClose} disabled={saving}>
						Cancel
					</Button>
					<Button variant="contained" onClick={handleSubmit} disabled={saving}>
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
