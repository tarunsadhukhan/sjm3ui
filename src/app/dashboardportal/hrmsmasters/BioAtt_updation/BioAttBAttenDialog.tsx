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

type Props = {
	open: boolean;
	onClose: () => void;
	onSuccess?: (message: string) => void;
};

type BAttenResponse = {
	status: string;
	tran_date: string;
	is_off_day: boolean;
	basic_rows: number;
	inserted: number;
};

function getCoId(): string {
	if (typeof window === "undefined") return "";
	const sel = localStorage.getItem("sidebar_selectedCompany");
	return sel ? JSON.parse(sel).co_id : "";
}

export default function BioAttBAttenDialog({ open, onClose, onSuccess }: Props) {
	const [tranDate, setTranDate] = useState<string>(() =>
		new Date().toISOString().slice(0, 10),
	);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<BAttenResponse | null>(null);

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

	const handleProcess = useCallback(async () => {
		if (!tranDate) {
			setError("Date is required");
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
			const url = `${apiRoutesPortalMasters.BIO_ATT_B_ATTEN}?co_id=${encodeURIComponent(co_id)}`;
			const resp = await axios.post<BAttenResponse>(
				url,
				{ tran_date: tranDate },
				{
					withCredentials: true,
					validateStatus: (s) => s >= 200 && s < 500,
				},
			);

			if (resp.status >= 300) {
				const detail =
					(resp.data as unknown as { detail?: string })?.detail ??
					`B Atten failed (${resp.status})`;
				setError(String(detail));
				return;
			}

			setResult(resp.data);
			onSuccess?.(
				`B Atten: read ${resp.data.basic_rows} basic row(s), inserted ${resp.data.inserted} attendance row(s) for ${tranDate}.`,
			);
		} catch (err) {
			const ax = err as AxiosError<{ detail?: string }>;
			setError(
				ax.response?.data?.detail ?? ax.message ?? "B Atten failed",
			);
		} finally {
			setBusy(false);
		}
	}, [tranDate, onSuccess]);

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
			<DialogTitle>B Atten — push basic to attendance_process</DialogTitle>
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
						Reads <code>daily_attendance_basic</code> rows for the date and
						(re)writes one spell row per employee into{" "}
						<code>daily_attendance_process_table</code>.
					</Typography>

					{error && <Alert severity="error">{error}</Alert>}

					{result && (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
							<Alert severity="success">Done for {result.tran_date}</Alert>
							<Divider />
							<Typography variant="body2">
								Basic rows read: {result.basic_rows}
							</Typography>
							<Typography variant="body2">
								Attendance rows inserted: {result.inserted}
							</Typography>
							{result.is_off_day && (
								<Alert severity="info" sx={{ py: 0 }}>
									Weekly off day — rows marked as Off.
								</Alert>
							)}
						</Box>
					)}
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} disabled={busy}>
					Close
				</Button>
				<Button
					variant="contained"
					color="secondary"
					onClick={handleProcess}
					disabled={busy}
				>
					{busy ? "Processing..." : "Process"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
