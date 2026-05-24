"use client";
import React, { useCallback, useRef, useState } from "react";
import {
	Alert,
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Typography,
} from "@mui/material";
import axios, { AxiosError } from "axios";
import { apiRoutesPortalMasters } from "@/utils/api";

type Props = {
	open: boolean;
	onClose: () => void;
	/** Called after the server finishes inserting the rows. */
	onSuccess?: (message: string) => void;
};

function getCoId(): string {
	if (typeof window === "undefined") return "";
	const sel = localStorage.getItem("sidebar_selectedCompany");
	return sel ? JSON.parse(sel).co_id : "";
}

export default function BioAttUploadDialog({ open, onClose, onSuccess }: Props) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const reset = useCallback(() => {
		setSelectedFile(null);
		setError(null);
		setBusy(false);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, []);

	const handleClose = useCallback(() => {
		if (busy) return;
		reset();
		onClose();
	}, [busy, onClose, reset]);

	const handlePick = () => fileInputRef.current?.click();

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setError(null);
		const f = e.target.files?.[0] ?? null;
		setSelectedFile(f);
	};

	const handleUpload = useCallback(async () => {
		if (!selectedFile) {
			setError("Please choose a CSV/Excel file");
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
			const formData = new FormData();
			formData.append("file", selectedFile);

			const url = `${apiRoutesPortalMasters.BIO_ATT_UPLOAD}?co_id=${encodeURIComponent(co_id)}`;
			const resp = await axios.post<{
				message: string;
				inserted: number;
				total: number;
			}>(url, formData, {
				withCredentials: true,
				headers: { "x-forwarded-host": "sls.vowerp.co.in" },
				validateStatus: (s) => s >= 200 && s < 500,
			});
			if (resp.status >= 300) {
				const detail =
					(resp.data as unknown as { detail?: string })?.detail ??
					`Upload failed (${resp.status})`;
				setError(detail);
				return;
			}
			onSuccess?.(resp.data.message);
			reset();
			onClose();
		} catch (e) {
			const ax = e as AxiosError<{ detail?: string }>;
			setError(ax.response?.data?.detail ?? (e instanceof Error ? e.message : String(e)));
		} finally {
			setBusy(false);
		}
	}, [selectedFile, onSuccess, onClose, reset]);

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
			<DialogTitle>Upload Bio Attendance (CSV / Excel)</DialogTitle>
			<DialogContent dividers>
				<Box className="flex flex-col gap-3">
					<Typography variant="body2" color="text.secondary">
						Upload the SQL-Server DeviceLogs export produced by the “SQL
						Create” query. Every row is inserted directly into the bio
						attendance table (no de-duplication). Required columns:
						DeviceLogId, UserId, LogDate, Direction, EmployeeCode,
						EmployeeName, DeviceId.
					</Typography>

					<Box className="flex items-center gap-2">
						<input
							ref={fileInputRef}
							type="file"
							accept=".csv,.xls,.xlsx"
							style={{ display: "none" }}
							onChange={handleFileChange}
						/>
						<Button variant="outlined" onClick={handlePick} disabled={busy}>
							Choose File
						</Button>
						<Typography variant="body2">
							{selectedFile ? selectedFile.name : "No file chosen"}
						</Typography>
					</Box>

					{error ? <Alert severity="error">{error}</Alert> : null}
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} disabled={busy}>
					Close
				</Button>
				<Button
					variant="contained"
					onClick={handleUpload}
					disabled={busy || !selectedFile}
				>
					Upload
				</Button>
			</DialogActions>
		</Dialog>
	);
}
