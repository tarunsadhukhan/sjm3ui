"use client";

import * as React from "react";
import {
	Alert,
	Box,
	Button,
	MenuItem,
	Snackbar,
	TextField,
	Typography,
} from "@mui/material";
import { Plus as AddIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import type { HumiditySetup } from "../types";

type Props = {
	coId: string;
	branchId: number;
	setup: HumiditySetup;
	onSaved: () => void;
};

type SpotDraft = {
	spot_label: string;
	reading_time: string;
	temp_c: string;
	rh_pct: string;
};

const blankSpot = (): SpotDraft => ({
	spot_label: "",
	reading_time: "",
	temp_c: "",
	rh_pct: "",
});

/**
 * Entry form for one Humidity reading-set: (date, department, round) with 1..3
 * spot readings (temp °C + RH%). Spot label and time are optional per spot; a
 * spot row counts only when temp or RH is filled (then both are required).
 * Averages are server-computed at save.
 */
export default function HumidityEntryForm({ coId, branchId, setup, onSaved }: Props) {
	const spotsPerRound = setup.spots_per_round > 0 ? setup.spots_per_round : 3;

	const [reportDate, setReportDate] = React.useState<string>(todayISO());
	const [deptId, setDeptId] = React.useState<number | "">("");
	const [roundNo, setRoundNo] = React.useState<number | "">("");
	const [preparedBy, setPreparedBy] = React.useState<string>("");
	const [spots, setSpots] = React.useState<SpotDraft[]>(() =>
		Array.from({ length: spotsPerRound }, blankSpot)
	);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	React.useEffect(() => {
		setSpots((prev) =>
			prev.length === spotsPerRound ? prev : Array.from({ length: spotsPerRound }, blankSpot)
		);
	}, [spotsPerRound]);

	const handleSpotChange = (index: number, field: keyof SpotDraft, value: string) => {
		setSpots((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
	};

	// A spot is "active" once temp or RH has anything in it; both are then required.
	const activeSpots = spots.filter((s) => s.temp_c.trim() !== "" || s.rh_pct.trim() !== "");
	const activeParsed = activeSpots.map((s) => ({
		spot_label: s.spot_label.trim() || null,
		reading_time: s.reading_time || null,
		temp_c: Number(s.temp_c),
		rh_pct: Number(s.rh_pct),
	}));
	const spotsValid =
		activeParsed.length >= 1 &&
		activeParsed.every(
			(s) =>
				Number.isFinite(s.temp_c) &&
				s.temp_c > 0 &&
				Number.isFinite(s.rh_pct) &&
				s.rh_pct > 0 &&
				s.rh_pct <= 100
		);

	const avgTempPreview = spotsValid
		? activeParsed.reduce((a, s) => a + s.temp_c, 0) / activeParsed.length
		: null;
	const avgRhPreview = spotsValid
		? activeParsed.reduce((a, s) => a + s.rh_pct, 0) / activeParsed.length
		: null;

	const handleSave = async () => {
		// Backend allows a null dept, but the by-date sheet is grouped per
		// department — require it in the UI so every row lands in a group.
		if (deptId === "") {
			setError("Select a department.");
			return;
		}
		if (roundNo === "") {
			setError("Select a round.");
			return;
		}
		if (activeParsed.length === 0) {
			setError("Enter at least one spot reading (temperature and RH%).");
			return;
		}
		if (!spotsValid) {
			setError("Each filled spot needs a positive temperature and an RH% in (0, 100].");
			return;
		}
		setSaving(true);
		setError(null);
		const { error: err } = await fetchWithCookie(
			apiRoutesPortalMasters.HUMIDITY_CREATE,
			"POST",
			{
				co_id: Number(coId),
				branch_id: branchId,
				report_date: reportDate,
				dept_id: Number(deptId),
				round_no: Number(roundNo),
				prepared_by: preparedBy.trim() || null,
				spots: activeParsed,
			}
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack(`Saved humidity reading-set for ${reportDate}`);
		setSpots(Array.from({ length: spotsPerRound }, blankSpot));
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
				<TextField
					type="date"
					label="Date"
					value={reportDate}
					onChange={(e) => setReportDate(e.target.value)}
					size="small"
					fullWidth
					slotProps={{ inputLabel: { shrink: true } }}
				/>
				<TextField
					select
					label="Department"
					value={deptId}
					onChange={(e) => setDeptId(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
					fullWidth
				>
					{setup.departments.map((d) => (
						<MenuItem key={d.dept_id} value={d.dept_id}>
							{d.dept_desc}
						</MenuItem>
					))}
				</TextField>
				<TextField
					select
					label="Round"
					value={roundNo}
					onChange={(e) => setRoundNo(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
					fullWidth
				>
					{setup.rounds.map((r) => (
						<MenuItem key={r.round_no} value={r.round_no}>
							{r.label}
						</MenuItem>
					))}
				</TextField>
				<TextField
					label="Prepared By (optional)"
					value={preparedBy}
					onChange={(e) => setPreparedBy(e.target.value)}
					size="small"
					fullWidth
				/>
			</Box>

			<Typography variant="subtitle2">
				Spot readings (1 to {spotsPerRound}; a filled spot needs both temperature and RH%)
			</Typography>
			{spots.map((s, i) => (
				<Box
					key={i}
					sx={{
						display: "grid",
						gap: 1.5,
						gridTemplateColumns: {
							xs: "repeat(2, minmax(0, 1fr))",
							md: "repeat(4, minmax(0, 1fr))",
						},
					}}
				>
					<TextField
						label={`Spot ${i + 1} label (optional)`}
						value={s.spot_label}
						onChange={(e) => handleSpotChange(i, "spot_label", e.target.value)}
						size="small"
					/>
					<TextField
						type="time"
						label="Time (optional)"
						value={s.reading_time}
						onChange={(e) => handleSpotChange(i, "reading_time", e.target.value)}
						size="small"
						slotProps={{ inputLabel: { shrink: true } }}
					/>
					<TextField
						type="number"
						label="Temp (°C)"
						value={s.temp_c}
						onChange={(e) => handleSpotChange(i, "temp_c", e.target.value)}
						size="small"
						slotProps={{ htmlInput: { step: 0.1, min: 0 } }}
					/>
					<TextField
						type="number"
						label="RH (%)"
						value={s.rh_pct}
						onChange={(e) => handleSpotChange(i, "rh_pct", e.target.value)}
						size="small"
						slotProps={{ htmlInput: { step: 0.1, min: 0, max: 100 } }}
					/>
				</Box>
			))}

			{avgTempPreview != null && avgRhPreview != null ? (
				<Typography variant="body2" color="text.secondary">
					Avg Temp: <b>{avgTempPreview.toFixed(2)} °C</b> · Avg RH:{" "}
					<b>{avgRhPreview.toFixed(2)} %</b> ({activeParsed.length} spot
					{activeParsed.length > 1 ? "s" : ""})
				</Typography>
			) : null}

			{error ? (
				<Alert severity="error" onClose={() => setError(null)}>
					{error}
				</Alert>
			) : null}

			<Box sx={{ display: "flex", justifyContent: { xs: "stretch", md: "flex-end" } }}>
				<Button
					variant="contained"
					startIcon={<AddIcon size={18} />}
					onClick={handleSave}
					disabled={saving}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save reading-set"}
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
