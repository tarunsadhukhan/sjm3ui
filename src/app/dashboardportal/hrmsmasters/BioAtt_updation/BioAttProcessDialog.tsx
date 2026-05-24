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

function triggerBlobDownload(blob: Blob, filename: string) {
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	window.URL.revokeObjectURL(url);
}

export default function BioAttProcessDialog({ open, onClose, onSuccess }: Props) {
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
		const co_id = getCoId();
		if (!co_id) {
			setError("No company selected");
			return;
		}
		setBusy(true);
		setError(null);
		try {
			const url = `${apiRoutesPortalMasters.BIO_ATT_PROCESS}?co_id=${encodeURIComponent(
				co_id
			)}`;
			const resp = await axios.post(
				url,
				{ tran_date: tranDate },
				{
					withCredentials: true,
					headers: { "x-forwarded-host": "sls.vowerp.co.in" },
					responseType: "blob",
					validateStatus: (s) => s >= 200 && s < 500,
				}
			);

			const ct = String(resp.headers["content-type"] ?? "");
			const isXlsx = ct.includes("spreadsheetml");

			if (resp.status >= 300 && !isXlsx) {
				const text = await (resp.data as Blob).text();
				let detail = `Process failed (${resp.status})`;
				try {
					const parsed = JSON.parse(text);
					detail = parsed?.detail ?? detail;
				} catch {
					/* fallthrough */
				}
				setError(detail);
				return;
			}

			if (isXlsx) {
				const filename = `unmatched_emp_codes_${tranDate}.xlsx`;
				triggerBlobDownload(resp.data as Blob, filename);
				const unmatched = resp.headers["x-unmatched-count"] ?? "?";
				const headerMsg = resp.headers["x-process-message"] as string | undefined;
				const msg =
					headerMsg ??
					`Processed matched records. ${unmatched} unmatched emp_code(s) downloaded as Excel.`;
				onSuccess?.(msg);
				onClose();
				return;
			}

			const text = await (resp.data as Blob).text();
			const data = text ? JSON.parse(text) : {};
			const msg =
				data?.message ??
				(typeof data?.processed === "number"
					? `Processed ${data.processed} row(s) for ${tranDate}.`
					: `Processing completed for ${tranDate}.`);
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
	}, [tranDate, onSuccess, onClose]);

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
			<DialogTitle>Process Bio Attendance</DialogTitle>
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
				<Button variant="contained" onClick={handleUpdate} disabled={busy}>
					{busy ? "Processing..." : "Update"}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
