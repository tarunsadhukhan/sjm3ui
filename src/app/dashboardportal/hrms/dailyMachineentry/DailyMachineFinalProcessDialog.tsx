"use client";
import React, { useState } from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	TextField,
	Stack,
} from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";

interface Props {
	open: boolean;
	onClose: () => void;
	onSuccess: (message: string) => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const getCoId = (): string => {
	if (typeof window === "undefined") return "";
	const sel = localStorage.getItem("sidebar_selectedCompany");
	return sel ? JSON.parse(sel).co_id : "";
};

export default function DailyMachineFinalProcessDialog({
	open,
	onClose,
	onSuccess,
}: Props) {
	const { selectedBranches } = useSidebarContext();
	const [tranDate, setTranDate] = useState<string>(todayIso());
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async () => {
		setError(null);
		const co_id = getCoId();
		if (!co_id) {
			setError("No company selected");
			return;
		}
		const branch_id = selectedBranches[0];
		if (!branch_id) {
			setError("Please select a branch");
			return;
		}
		setBusy(true);
		try {
			const url = `${apiRoutesPortalMasters.DAILY_MACHINE_FINAL_PROCESS}?co_id=${co_id}`;
			const { data, error: err } = await fetchWithCookie<{ message: string }>(
				url,
				"POST",
				{ tran_date: tranDate, branch_id }
			);
			if (err || !data) throw new Error(err || "Process failed");
			onSuccess(data.message || "Process completed");
			onClose();
		} catch (e: unknown) {
			setError(e instanceof Error ? e.message : "Process failed");
		} finally {
			setBusy(false);
		}
	};

	return (
		<Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
			<DialogTitle>Daily Machine — Final Process</DialogTitle>
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					<TextField
						type="date"
						label="Transaction Date"
						value={tranDate}
						onChange={(e) => setTranDate(e.target.value)}
						InputLabelProps={{ shrink: true }}
						fullWidth
					/>
					{error && (
						<div style={{ color: "#d32f2f", fontSize: "0.875rem" }}>{error}</div>
					)}
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={busy}>
					Cancel
				</Button>
				<Button onClick={handleSubmit} variant="contained" disabled={busy}>
					{busy ? "Processing…" : "Run"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
