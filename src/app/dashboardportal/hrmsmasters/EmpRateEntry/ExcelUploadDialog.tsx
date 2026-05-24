"use client";
import React, { useCallback, useRef, useState } from "react";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Typography,
} from "@mui/material";
import axios from "axios";
import { apiRoutesPortalMasters } from "@/utils/api";

type UploadResponse =
	| {
			success: true;
			message: string;
			deleted: number;
			inserted: number;
			total: number;
	  }
	| {
			success: false;
			message: string;
			invalid_count: number;
			invalid_file: string;
			invalid_filename: string;
	  };

type Props = {
	open: boolean;
	onClose: () => void;
	onUploaded: () => void;
};

function getCoId(): string {
	if (typeof window === "undefined") return "";
	const sel = localStorage.getItem("sidebar_selectedCompany");
	return sel ? JSON.parse(sel).co_id : "";
}

function downloadBase64(base64: string, filename: string) {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	const blob = new Blob([bytes], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export default function ExcelUploadDialog({ open, onClose, onUploaded }: Props) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [info, setInfo] = useState<string | null>(null);

	const reset = useCallback(() => {
		setSelectedFile(null);
		setError(null);
		setInfo(null);
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
		setInfo(null);
		const f = e.target.files?.[0] ?? null;
		setSelectedFile(f);
	};

	const handleUpload = useCallback(async () => {
		if (!selectedFile) {
			setError("Please choose an Excel file");
			return;
		}
		const co_id = getCoId();
		if (!co_id) {
			setError("No company selected");
			return;
		}

		setBusy(true);
		setError(null);
		setInfo(null);
		try {
			const formData = new FormData();
			formData.append("file", selectedFile);

			const url = `${apiRoutesPortalMasters.EMP_RATE_EXCEL_UPLOAD}?co_id=${encodeURIComponent(co_id)}`;
			const resp = await axios.post<UploadResponse>(url, formData, {
				withCredentials: true,
				validateStatus: (s) => s >= 200 && s < 500,
			});
			if (resp.status >= 300) {
				const detail =
					(resp.data as unknown as { detail?: string })?.detail ??
					`Upload failed (${resp.status})`;
				setError(detail);
				return;
			}

			const data = resp.data;
			if (!data.success) {
				downloadBase64(data.invalid_file, data.invalid_filename);
				setError(
					`Upload failed: ${data.invalid_count} invalid row(s). The annotated file with red-highlighted rows has been downloaded — please correct the rows and re-upload.`,
				);
				return;
			}

			setInfo(
				`Upload successful. Inserted: ${data.inserted}${
					data.deleted > 0 ? `, replaced existing: ${data.deleted}` : ""
				} (total ${data.total}).`,
			);
			onUploaded();
			setTimeout(() => {
				reset();
				onClose();
			}, 1500);
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
		} finally {
			setBusy(false);
		}
	}, [selectedFile, onUploaded, onClose, reset]);

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
			<DialogTitle>Upload Employee Rate (Excel)</DialogTitle>
			<DialogContent dividers>
				<Box className="flex flex-col gap-3">
					<Typography variant="body2" color="text.secondary">
						Required columns: <b>emp_code</b>, <b>rate</b>,{" "}
						<b>rate_date</b> (YYYY-MM-DD or DD-MM-YYYY).
					</Typography>
					<Typography variant="caption" color="text.secondary">
						emp_code is validated against the employee master. If any row is
						invalid the upload is rejected and an Excel file with the offending
						rows highlighted in red will be downloaded. For valid uploads, any
						existing rate for the same employee + date is replaced.
					</Typography>

					<Box className="flex items-center gap-2">
						<input
							ref={fileInputRef}
							type="file"
							accept=".xls,.xlsx"
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
					{info ? <Alert severity="success">{info}</Alert> : null}

					{busy ? (
						<Box className="flex items-center gap-2">
							<CircularProgress size={18} />
							<Typography variant="body2">Uploading…</Typography>
						</Box>
					) : null}
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
