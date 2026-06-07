"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	TextField,
	Typography,
} from "@mui/material";
import axios, { AxiosError } from "axios";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type Props = {
	open: boolean;
	onClose: () => void;
	onSuccess?: (message: string) => void;
};

type EtrackProcessResponse = {
	status: string;
	tran_date: string;
	branch_id: number;
	is_off_day: boolean;
	emp_code_updated: number;
	bio_att_log_id_filled: number;
	device_id_updated: number;
	resolve: {
		resolved: number;
		updated: number;
		from_daily_attendance: number;
		fallback_official: number;
		no_source: number;
	};
	process: {
		spell_a_inserted: number;
		spell_b_inserted: number;
		total_inserted: number;
	};
};

function getCoId(): string {
	if (typeof window === "undefined") return "";
	const sel = localStorage.getItem("sidebar_selectedCompany");
	return sel ? JSON.parse(sel).co_id : "";
}

export default function BioAttEtrackProcessDDialog({ open, onClose, onSuccess }: Props) {
	const { selectedBranches } = useSidebarContext();
	const [tranDate, setTranDate] = useState<string>(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<EtrackProcessResponse | null>(null);

	useEffect(() => {
		if (open) {
			setTranDate(new Date().toISOString().slice(0, 10));
			setError(null);
			setResult(null);
			setBusy(false);
		}
	}, [open]);

	const handleClose = useCallback(() => {
		if (busy) return;
		onClose();
	}, [busy, onClose]);

	const handleProcessD = useCallback(async () => {
		if (!tranDate) {
			setError("Date is required");
			return;
		}
		if (!selectedBranches || selectedBranches.length === 0) {
			setError("Please select a branch from the sidebar");
			return;
		}
		const branchId = Number(selectedBranches[0]);
		if (!Number.isFinite(branchId) || branchId <= 0) {
			setError("Invalid branch selected");
			return;
		}
		const co_id = getCoId();
		if (!co_id) {
			setError("No company selected");
			return;
		}

		setBusy(true);
		setError(null);
		setResult(null);

		try {
			const url = `${apiRoutesPortalMasters.BIO_ATT_ETRACK_PROCESS_D}?co_id=${encodeURIComponent(co_id)}`;
			const resp = await axios.post<EtrackProcessResponse>(
				url,
				{ tran_date: tranDate, branch_id: branchId },
				{
					withCredentials: true,
					validateStatus: (s) => s >= 200 && s < 500,
				},
			);

			if (resp.status >= 300) {
				const detail =
					(resp.data as unknown as { detail?: string })?.detail ??
					`Etrack Process failed (${resp.status})`;
				setError(String(detail));
				return;
			}

			setResult(resp.data);
			onSuccess?.(
				`Etrack Process (D): emp_code updated on ${resp.data.emp_code_updated} bio row(s), ` +
				`bio_att_log_id filled on ${resp.data.bio_att_log_id_filled} row(s), ` +
				`device_id set on ${resp.data.device_id_updated} row(s), ` +
				`resolved ${resp.data.resolve.resolved} emp(s), ` +
				`updated ${resp.data.resolve.updated} bio rows, ` +
				`inserted ${resp.data.process.total_inserted} attendance row(s) for ${tranDate}.`,
			);
		} catch (err) {
			const ax = err as AxiosError<{ detail?: string }>;
			setError(
				ax.response?.data?.detail ?? ax.message ?? "Etrack Process failed",
			);
		} finally {
			setBusy(false);
		}
	}, [tranDate, selectedBranches, onSuccess]);

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
			<DialogTitle>Etrack Process (D)</DialogTitle>
			<DialogContent dividers>
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
					<TextField
						type="date"
						label="Date"
						size="small"
						value={tranDate}
						onChange={(e) => setTranDate(e.target.value)}
						slotProps={{ inputLabel: { shrink: true } }}
						disabled={busy}
						fullWidth
						required
					/>
					<Typography variant="caption" color="text.secondary">
						Branch: {selectedBranches?.[0] ? `ID ${selectedBranches[0]}` : "None selected (select from sidebar)"}
					</Typography>

					{error && <Alert severity="error">{error}</Alert>}

					{result && (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
							<Alert severity="success">Processing complete for {result.tran_date}</Alert>
							<Divider />
							<Typography variant="body2" fontWeight={600}>Emp Code (bio_id → master_data)</Typography>
							<Typography variant="body2">Bio rows updated: {result.emp_code_updated}</Typography>
							<Divider />
							<Typography variant="body2" fontWeight={600}>Bio Att Log Id (blank fill)</Typography>
							<Typography variant="body2">Rows filled: {result.bio_att_log_id_filled}</Typography>
							<Divider />
							<Typography variant="body2" fontWeight={600}>Device Id (in→22 / else 14)</Typography>
							<Typography variant="body2">Rows updated: {result.device_id_updated}</Typography>
							<Divider />
							<Typography variant="body2" fontWeight={600}>Resolve (eb_id fill)</Typography>
							<Typography variant="body2">Employees resolved: {result.resolve.resolved}</Typography>
							<Typography variant="body2">Bio rows updated: {result.resolve.updated}</Typography>
							<Typography variant="body2">Source — Daily Att: {result.resolve.from_daily_attendance} | Official: {result.resolve.fallback_official} | None: {result.resolve.no_source}</Typography>
							<Divider />
							<Typography variant="body2" fontWeight={600}>Process (daily_attendance_process_table)</Typography>
							<Typography variant="body2">Spell A: {result.process.spell_a_inserted} | Spell B: {result.process.spell_b_inserted} | Total: {result.process.total_inserted}</Typography>
							{result.is_off_day && (
								<Alert severity="info" sx={{ py: 0 }}>Weekly off day — rows marked as Off.</Alert>
							)}
						</Box>
					)}
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} disabled={busy}>
					Close
				</Button>
				<Button variant="contained" color="secondary" onClick={handleProcessD} disabled={busy}>
					{busy ? "Processing..." : "Process"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
