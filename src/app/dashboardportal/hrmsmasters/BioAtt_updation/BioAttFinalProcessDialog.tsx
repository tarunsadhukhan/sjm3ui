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
	TextField,
} from "@mui/material";
import axios, { AxiosError } from "axios";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

type Props = {
	open: boolean;
	onClose: () => void;
	onSuccess?: (message: string) => void;
};

function getCoId(): string {
	if (typeof window === "undefined") return "";
	const sel = localStorage.getItem("sidebar_selectedCompany");
	return sel ? JSON.parse(sel).co_id : "";
}

export default function BioAttFinalProcessDialog({ open, onClose, onSuccess }: Props) {
	const { selectedBranches } = useSidebarContext();
	const [tranDate, setTranDate] = useState<string>(() =>
		new Date().toISOString().slice(0, 10)
	);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (open) {
			setTranDate(new Date().toISOString().slice(0, 10));
			setError(null);
			setBusy(false);
		}
	}, [open]);

	const handleClose = useCallback(() => {
		if (busy) return;
		onClose();
	}, [busy, onClose]);

	const handleUpdate = useCallback(async () => {
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
		try {
			const url = `${apiRoutesPortalMasters.BIO_ATT_FINAL_PROCESS}?co_id=${encodeURIComponent(
				co_id
			)}`;
			const resp = await axios.post(
				url,
				{ tran_date: tranDate, branch_id: branchId },
				{
					withCredentials: true,
					headers: { "x-forwarded-host": "sls.vowerp.co.in" },
					validateStatus: (s) => s >= 200 && s < 500,
				}
			);

			if (resp.status >= 300) {
				const detail =
					(resp.data && (resp.data as { detail?: string }).detail) ??
					`Final Process failed (${resp.status})`;
				setError(String(detail));
				return;
			}

			const data = resp.data as {
				message?: string;
				inserted?: number;
				skipped?: number;
			};
			const msg =
				data?.message ??
				`Final processed (inserted ${data?.inserted ?? 0}, skipped ${data?.skipped ?? 0}) for ${tranDate}.`;
			onSuccess?.(msg);
			onClose();
		} catch (e) {
			const ax = e as AxiosError<{ detail?: string }>;
			setError(
				ax.response?.data?.detail ??
					(e instanceof Error ? e.message : String(e))
			);
		} finally {
			setBusy(false);
		}
	}, [tranDate, selectedBranches, onSuccess, onClose]);

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
			<DialogTitle>Final Process Bio Attendance</DialogTitle>
			<DialogContent dividers>
				<Box className="flex flex-col gap-3 pt-1">
					<TextField
						label="Date"
						type="date"
						value={tranDate}
						onChange={(e) => setTranDate(e.target.value)}
						InputLabelProps={{ shrink: true }}
						fullWidth
						required
						disabled={busy}
					/>
					{error ? <Alert severity="error">{error}</Alert> : null}
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} disabled={busy}>
					Cancel
				</Button>
				<Button variant="contained" color="success" onClick={handleUpdate} disabled={busy}>
					{busy ? "Processing..." : "Update"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
