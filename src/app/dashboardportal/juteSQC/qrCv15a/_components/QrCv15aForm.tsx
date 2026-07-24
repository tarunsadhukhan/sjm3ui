"use client";

import * as React from "react";
import { Alert, Autocomplete, Box, Button, Divider, Snackbar, TextField, Typography } from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { sampleStdDev } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import { QR_CV_15A_SAMPLE_SIZE, type QrCv15aSetup } from "../types";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: QrCv15aSetup;
	onSaved: () => void;
};

const emptyReadings = (): string[] => Array.from({ length: QR_CV_15A_SAMPLE_SIZE }, () => "");

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

// "" or non-numeric → null (server stores NULL for blank cells).
function toNum(s: string): number | null {
	if (s === "") return null;
	const v = Number(s);
	return Number.isFinite(v) ? v : null;
}

export default function QrCv15aForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [drawingMcId, setDrawingMcId] = React.useState<number | "">("");
	const [machineId, setMachineId] = React.useState<number | "">("");
	const [yarnItemId, setYarnItemId] = React.useState<number | "">("");
	// Special-purpose variant: observed_count + MR% are OPERATOR-ENTERED (not from R-08-16).
	const [observedCount, setObservedCount] = React.useState("");
	const [mrPct, setMrPct] = React.useState("");
	const [readings, setReadings] = React.useState<string[]>(emptyReadings);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	// Live preview (server recomputes at read and is authoritative). Blanks ignored.
	const numericReadings = React.useMemo(
		() =>
			readings
				.filter((r) => r !== "")
				.map((r) => Number(r))
				.filter((n) => Number.isFinite(n)),
		[readings]
	);

	const n = numericReadings.length;
	const avgBs = n > 0 ? numericReadings.reduce((acc, v) => acc + v, 0) / n : null;
	const maxVal = n > 0 ? Math.max(...numericReadings) : null;
	const minVal = n > 0 ? Math.min(...numericReadings) : null;
	const stdDev = sampleStdDev(numericReadings);
	const obsNum = toNum(observedCount);
	// QR% = (avg b/s / observed_count) × 100; null when observed_count is 0/blank.
	const qrPct = avgBs != null && obsNum != null && obsNum !== 0 ? (avgBs / obsNum) * 100 : null;
	// CV% = (std_dev / QR%) × 100; null when QR% is 0/null.
	const cvPct = stdDev != null && qrPct != null && qrPct !== 0 ? (stdDev / qrPct) * 100 : null;
	// QR @ min = (min / observed_count) × 100.
	const qrAtMin = minVal != null && obsNum != null && obsNum !== 0 ? (minVal / obsNum) * 100 : null;

	const setReading = (i: number, value: string) =>
		setReadings((prev) => prev.map((r, idx) => (idx === i ? value : r)));

	const clearReadings = () => setReadings(emptyReadings());

	// Backend requires item_id; both machine pickers and header numbers are optional.
	const formInvalid = !yarnItemId || n === 0;

	const handleSave = async () => {
		if (!yarnItemId) {
			setError("Select a yarn quality.");
			return;
		}
		if (n === 0) {
			setError("Enter at least one b/s reading.");
			return;
		}
		setSaving(true);
		setError(null);
		const body = {
			co_id: Number(coId),
			branch_id: Number(branchId),
			entry_date: entryDate,
			entries: [
				{
					drawing_mc_id: drawingMcId === "" ? null : Number(drawingMcId),
					mc_id: machineId === "" ? null : Number(machineId),
					item_id: Number(yarnItemId),
					observed_count: obsNum,
					mr_pct: toNum(mrPct),
					readings: readings.map(toNum),
				},
			],
		};
		const { error: err } = await fetchWithCookie<{ data: { saved: number } }>(
			apiRoutesPortalMasters.QR_CV_15A_SAVE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		const yarn = setup.yarn_items.find((y) => y.item_id === Number(yarnItemId));
		setSnack(`Saved QR-CV special test for ${yarn?.item_name ?? yarnItemId}`);
		// Keep machines/yarn/header fields so the inspector can punch many tests quickly.
		clearReadings();
		onSaved();
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: {
						xs: "1fr",
						sm: "repeat(2, minmax(0, 1fr))",
						md: "repeat(3, minmax(0, 1fr))",
					},
				}}
			>
				<Autocomplete
					options={setup.yarn_items}
					getOptionLabel={(y) => `${y.item_name ?? ""} (${y.item_code ?? ""})`}
					value={setup.yarn_items.find((y) => y.item_id === yarnItemId) ?? null}
					onChange={(_, newVal) => setYarnItemId(newVal ? newVal.item_id : "")}
					size="small"
					renderInput={(params) => <TextField {...params} label="Yarn" />}
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
				/>
				<Autocomplete
					options={setup.machines}
					getOptionLabel={(m) => `${m.machine_name} (${m.mech_code ?? ""})`}
					value={setup.machines.find((m) => m.machine_id === drawingMcId) ?? null}
					onChange={(_, newVal) => setDrawingMcId(newVal ? newVal.machine_id : "")}
					size="small"
					clearOnEscape
					renderInput={(params) => <TextField {...params} label="3rd Drawing Machine" />}
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
				/>
				<Autocomplete
					options={setup.machines}
					getOptionLabel={(m) => `${m.machine_name} (${m.mech_code ?? ""})`}
					value={setup.machines.find((m) => m.machine_id === machineId) ?? null}
					onChange={(_, newVal) => setMachineId(newVal ? newVal.machine_id : "")}
					size="small"
					clearOnEscape
					renderInput={(params) => <TextField {...params} label="Spinning Frame (MC No.)" />}
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
				/>
				<TextField
					type="number"
					label="Observed Count"
					value={observedCount}
					onChange={(e) => setObservedCount(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
					helperText="operator-entered"
				/>
				<TextField
					type="number"
					label="MR %"
					value={mrPct}
					onChange={(e) => setMrPct(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
					helperText="operator-entered"
				/>
			</Box>

			<Divider />

			{/* 12 flat b/s readings — blanks are stored as NULL. */}
			<Typography variant="subtitle2">B/S Readings ({QR_CV_15A_SAMPLE_SIZE})</Typography>
			<Box
				sx={{
					display: "grid",
					gap: 1.5,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						sm: "repeat(4, minmax(0, 1fr))",
						md: "repeat(6, minmax(0, 1fr))",
					},
				}}
			>
				{readings.map((r, i) => (
					<TextField
						key={i}
						type="number"
						label={`R${i + 1}`}
						value={r}
						onChange={(e) => setReading(i, e.target.value)}
						size="small"
						fullWidth
						inputProps={{ step: "any", min: 0 }}
					/>
				))}
			</Box>

			<Divider />

			{/* Live preview — server recomputes all stats at read (R-08-15 formula + QR @ min). */}
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						sm: "repeat(3, minmax(0, 1fr))",
						md: "repeat(4, minmax(0, 1fr))",
					},
				}}
			>
				<TextField
					label="Avg B/S"
					value={avgBs != null ? round2(avgBs).toFixed(2) : ""}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
				/>
				<TextField
					label="Max"
					value={maxVal != null ? round2(maxVal).toFixed(2) : ""}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
				/>
				<TextField
					label="Min"
					value={minVal != null ? round2(minVal).toFixed(2) : ""}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
				/>
				<TextField
					label="Std Dev"
					value={stdDev != null ? round2(stdDev).toFixed(2) : ""}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="sample (n-1)"
				/>
				<TextField
					label="QR %"
					value={qrPct != null ? round2(qrPct).toFixed(2) : ""}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="avg B/S ÷ obs × 100"
				/>
				<TextField
					label="CV %"
					value={cvPct != null ? round2(cvPct).toFixed(2) : ""}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="std dev ÷ QR% × 100"
				/>
				<TextField
					label="QR @ Min"
					value={qrAtMin != null ? round2(qrAtMin).toFixed(2) : ""}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="min ÷ obs × 100"
				/>
			</Box>

			<Typography variant="caption" color="text.secondary">
				Preview only — the server recomputes all stats from the stored readings.
			</Typography>

			{error ? (
				<Alert severity="error" onClose={() => setError(null)}>
					{error}
				</Alert>
			) : null}

			<Box
				sx={{
					position: { xs: "sticky", md: "static" },
					bottom: 0,
					bgcolor: "background.paper",
					py: 1,
					display: "flex",
					justifyContent: { xs: "stretch", md: "flex-end" },
				}}
			>
				<Button
					variant="contained"
					startIcon={<SaveIcon size={18} />}
					onClick={handleSave}
					disabled={formInvalid || saving}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save"}
				</Button>
			</Box>

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
