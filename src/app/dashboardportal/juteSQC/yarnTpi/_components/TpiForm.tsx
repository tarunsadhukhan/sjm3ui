"use client";

import * as React from "react";
import { Alert, Autocomplete, Box, Button, Divider, Snackbar, TextField, Typography } from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { sampleStdDev } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import { TPI_SAMPLE_SIZE, type TpiSetup } from "../types";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: TpiSetup;
	onSaved: () => void;
};

const emptyReadings = (): string[] => Array.from({ length: TPI_SAMPLE_SIZE }, () => "");

function round2(x: number): number {
	return Math.round(x * 100) / 100;
}

// "" or non-numeric → null (server stores NULL for blank cells).
function toNum(s: string): number | null {
	if (s === "") return null;
	const v = Number(s);
	return Number.isFinite(v) ? v : null;
}

export default function TpiForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [machineId, setMachineId] = React.useState<number | "">("");
	const [yarnItemId, setYarnItemId] = React.useState<number | "">("");
	const [countLbs, setCountLbs] = React.useState("");
	const [stdTpi, setStdTpi] = React.useState("");
	const [tpValue, setTpValue] = React.useState("");
	const [preparedBy, setPreparedBy] = React.useState("");
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
	const avgTpi = n > 0 ? numericReadings.reduce((acc, v) => acc + v, 0) / n : null;
	const maxVal = n > 0 ? Math.max(...numericReadings) : null;
	const minVal = n > 0 ? Math.min(...numericReadings) : null;
	const stdDev = sampleStdDev(numericReadings);
	// CV% = (std dev / avg TPI) × 100
	const cvPct = stdDev != null && avgTpi != null && avgTpi !== 0 ? (stdDev / avgTpi) * 100 : null;
	// Diff = avg TPI − standard TPI (header snapshot).
	const stdTpiNum = toNum(stdTpi);
	const tpiDiff = avgTpi != null && stdTpiNum != null ? avgTpi - stdTpiNum : null;

	const setReading = (i: number, value: string) =>
		setReadings((prev) => prev.map((r, idx) => (idx === i ? value : r)));

	const clearReadings = () => setReadings(emptyReadings());

	// Backend requires item_id; mc_id and header numbers are optional.
	const formInvalid = !yarnItemId || n === 0;

	const handleSave = async () => {
		if (!yarnItemId) {
			setError("Select a yarn quality.");
			return;
		}
		if (n === 0) {
			setError("Enter at least one TPI reading.");
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
					mc_id: machineId === "" ? null : Number(machineId),
					item_id: Number(yarnItemId),
					count_lbs: toNum(countLbs),
					std_tpi: stdTpiNum,
					tp_value: toNum(tpValue),
					prepared_by: preparedBy || null,
					readings: readings.map(toNum),
				},
			],
		};
		const { error: err } = await fetchWithCookie<{ data: { saved: number } }>(
			apiRoutesPortalMasters.YARN_TPI_SAVE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		const yarn = setup.yarn_items.find((y) => y.item_id === Number(yarnItemId));
		setSnack(`Saved TPI study for ${yarn?.item_name ?? yarnItemId}`);
		// Keep machine/yarn/header fields so the inspector can punch many studies quickly.
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
						md: "repeat(4, minmax(0, 1fr))",
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
					value={setup.machines.find((m) => m.machine_id === machineId) ?? null}
					onChange={(_, newVal) => setMachineId(newVal ? newVal.machine_id : "")}
					size="small"
					clearOnEscape
					renderInput={(params) => <TextField {...params} label="Machine (MC No.)" />}
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
				/>
				<TextField
					type="number"
					label="Count (lbs)"
					value={countLbs}
					onChange={(e) => setCountLbs(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					type="number"
					label="Standard TPI"
					value={stdTpi}
					onChange={(e) => setStdTpi(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					type="number"
					label="TP Value"
					value={tpValue}
					onChange={(e) => setTpValue(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					label="Prepared By"
					value={preparedBy}
					onChange={(e) => setPreparedBy(e.target.value)}
					size="small"
					fullWidth
				/>
			</Box>

			<Divider />

			{/* 20 flat TPI readings — blanks are stored as NULL. */}
			<Typography variant="subtitle2">TPI Readings ({TPI_SAMPLE_SIZE})</Typography>
			<Box
				sx={{
					display: "grid",
					gap: 1.5,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						sm: "repeat(4, minmax(0, 1fr))",
						md: "repeat(5, minmax(0, 1fr))",
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

			{/* Live preview — server recomputes avg/std dev/CV%/min/max/diff at read. */}
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						sm: "repeat(3, minmax(0, 1fr))",
						md: "repeat(6, minmax(0, 1fr))",
					},
				}}
			>
				<TextField
					label="Avg TPI"
					value={avgTpi != null ? round2(avgTpi).toFixed(2) : ""}
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
					label="CV %"
					value={cvPct != null ? round2(cvPct).toFixed(2) : ""}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="std dev ÷ avg × 100"
				/>
				<TextField
					label="TPI Diff"
					value={tpiDiff != null ? round2(tpiDiff).toFixed(2) : ""}
					size="small"
					fullWidth
					InputProps={{ readOnly: true }}
					helperText="avg − std TPI"
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
