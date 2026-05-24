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
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";

// `?` placeholders are pre-replaced with named tokens so the substitution is
// unambiguous (the raw query has three positional `?` that map to different
// values). Token order matches the original WHERE clause.
const SQL_TEMPLATE = `SELECT dl.DeviceLogId, dl.DeviceId, dl.UserId, dl.LogDate,
       dl.Direction, em.EmployeeId, em.EmployeeCode,
       em.EmployeeName, em.CompanyId
FROM dbo.{table_name} dl
LEFT JOIN dbo.Employees em
  ON em.EmployeeCodeInDevice = dl.UserId
WHERE dl.LogDate > {from_date}
  AND em.CompanyId = 2
  AND dl.LogDate < {to_date}
  and dl.DeviceLogId>{device_log_id}
ORDER BY dl.DeviceLogId`;

const formatYmd = (d: Date) => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
};

const monthStartYmd = () => {
	const d = new Date();
	return formatYmd(new Date(d.getFullYear(), d.getMonth(), 1));
};

type Props = {
	open: boolean;
	onClose: () => void;
	getCoId: () => string;
};

export default function BioAttSqlCreateDialog({ open, onClose, getCoId }: Props) {
	const [fromDate, setFromDate] = useState(monthStartYmd());
	const [toDate, setToDate] = useState(formatYmd(new Date()));
	const [deviceLogId, setDeviceLogId] = useState("0");
	const [error, setError] = useState<string | null>(null);
	const [fetchingId, setFetchingId] = useState(false);

	useEffect(() => {
		if (open) {
			setFromDate(monthStartYmd());
			setToDate(formatYmd(new Date()));
			setDeviceLogId("0");
			setError(null);
		}
	}, [open]);

	// Month of the From Date drives both the table name and the max-log-id lookup.
	const fromMonth = fromDate ? fromDate.slice(0, 7) : "";

	useEffect(() => {
		if (!open || !fromMonth) return;
		const co_id = getCoId();
		if (!co_id) return;
		let cancelled = false;
		setFetchingId(true);
		(async () => {
			const { data, error: err } = await fetchWithCookie<{ max_id: number }>(
				`${apiRoutesPortalMasters.BIO_ATT_MAX_LOG_ID}?co_id=${encodeURIComponent(
					co_id,
				)}&month=${fromMonth}`,
				"GET",
			);
			if (cancelled) return;
			setFetchingId(false);
			if (err || !data) {
				setError(err || "Failed to fetch max device log id");
				return;
			}
			setDeviceLogId(String(data.max_id ?? 0));
		})();
		return () => {
			cancelled = true;
		};
	}, [open, fromMonth, getCoId]);

	const handleGenerate = useCallback(() => {
		setError(null);
		if (!fromDate || !toDate) {
			setError("From Date and To Date are required");
			return;
		}
		if (fromDate.slice(0, 7) !== toDate.slice(0, 7)) {
			setError("From Date and To Date must be in the same month");
			return;
		}
		const [yStr, mStr] = fromDate.split("-");
		const year = Number(yStr);
		const month = Number(mStr); // numeric, unpadded — matches DeviceLogs_<m>_<y>
		const tableName = `DeviceLogs_${month}_${year}`;
		const idVal = deviceLogId.trim() === "" ? "0" : deviceLogId.trim();

		// The query's upper bound is exclusive (dl.LogDate < ?), so push the
		// selected To Date out by one day to include punches on that date.
		const [ty, tm, td] = toDate.split("-").map(Number);
		const toDateExclusive = formatYmd(new Date(ty, tm - 1, td + 1));

		const sql = SQL_TEMPLATE.replace("{table_name}", tableName)
			.replace("{from_date}", `'${fromDate}'`)
			.replace("{to_date}", `'${toDateExclusive}'`)
			.replace("{device_log_id}", idVal);

		const blob = new Blob([sql], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `bio_att_sql_${tableName}.txt`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		onClose();
	}, [fromDate, toDate, deviceLogId, onClose]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>SQL Create — BIO Metric</DialogTitle>
			<DialogContent dividers>
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
					<TextField
						type="date"
						label="From Date"
						size="small"
						value={fromDate}
						onChange={(e) => setFromDate(e.target.value)}
						slotProps={{ inputLabel: { shrink: true } }}
						fullWidth
					/>
					<TextField
						type="date"
						label="To Date"
						size="small"
						value={toDate}
						onChange={(e) => setToDate(e.target.value)}
						slotProps={{ inputLabel: { shrink: true } }}
						fullWidth
					/>
					<TextField
						label="Device Log ID"
						size="small"
						value={deviceLogId}
						onChange={(e) => setDeviceLogId(e.target.value)}
						helperText={
							fetchingId
								? "Fetching max log id for the month…"
								: "Max bio_att_log_id for the selected month (editable)"
						}
						fullWidth
					/>
					{error ? <Alert severity="error">{error}</Alert> : null}
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" onClick={handleGenerate}>
					Generate &amp; Download
				</Button>
			</DialogActions>
		</Dialog>
	);
}
