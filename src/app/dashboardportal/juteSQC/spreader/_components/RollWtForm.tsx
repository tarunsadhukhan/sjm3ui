"use client";

import * as React from "react";
import { Alert, Autocomplete, Box, Button, MenuItem, Paper, Snackbar, TextField, Typography } from "@mui/material";
import { Plus as AddIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	ROLL_WT_SAMPLE_SIZE,
	type RollWtCreatePayload,
	type SpreaderSetup,
} from "../types/spreaderSqcTypes";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: SpreaderSetup;
	onSaved: () => void;
};

const EMPTY_READINGS = () => Array<string>(ROLL_WT_SAMPLE_SIZE).fill("");

/**
 * R-08-04 entry form: exactly 10 roll-weight (kg) + 10 MR% paired readings.
 * The server moisture-corrects each reading (std MR% comes from the quality
 * master satellite, not exposed here) and persists all stats — the corrected
 * series has no client preview by design; only the observed average is shown.
 */
export default function RollWtForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [spellId, setSpellId] = React.useState<number | "">("");
	const [machineId, setMachineId] = React.useState<number | "">("");
	const [itemId, setItemId] = React.useState<number | "">("");
	const [feederName, setFeederName] = React.useState("");
	const [weights, setWeights] = React.useState<string[]>(EMPTY_READINGS);
	const [mrs, setMrs] = React.useState<string[]>(EMPTY_READINGS);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const selectedMachine = setup.machines.find((m) => m.machine_id === machineId) ?? null;

	const setReading = (list: "wt" | "mr", index: number, value: string) => {
		const setter = list === "wt" ? setWeights : setMrs;
		setter((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	};

	// All 10 pairs are required: weight > 0, MR% >= 0.
	const weightsValid = weights.every((w) => w !== "" && Number(w) > 0);
	const mrsValid = mrs.every((m) => m !== "" && Number(m) >= 0);
	const formInvalid = !weightsValid || !mrsValid;

	// Live preview on the OBSERVED series only (server recomputes and is authoritative).
	const filledWeights = weights.filter((w) => w !== "" && Number(w) > 0).map(Number);
	const avgObs = filledWeights.length
		? filledWeights.reduce((a, b) => a + b, 0) / filledWeights.length
		: null;
	const filledMrs = mrs.filter((m) => m !== "").map(Number);
	const avgMr = filledMrs.length ? filledMrs.reduce((a, b) => a + b, 0) / filledMrs.length : null;

	const handleSave = async () => {
		if (formInvalid) {
			setError(`Enter all ${ROLL_WT_SAMPLE_SIZE} roll weights (> 0) and MR% readings.`);
			return;
		}
		setSaving(true);
		setError(null);
		const body: RollWtCreatePayload = {
			co_id: Number(coId),
			branch_id: branchId,
			entry_date: entryDate,
			spell_id: spellId === "" ? null : Number(spellId),
			mc_id: machineId === "" ? null : Number(machineId),
			item_id: itemId === "" ? null : Number(itemId),
			feeder_name: feederName.trim() === "" ? null : feederName.trim(),
			roll_weights: weights.map(Number),
			mr_pcts: mrs.map(Number),
		};
		const { error: err } = await fetchWithCookie<{
			data: { message: string; spreader_roll_wt_id: number };
		}>(apiRoutesPortalMasters.SPREADER_ROLL_WT_CREATE, "POST", body);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Roll weight sample saved");
		// Keep spell/machine/quality/feeder so the inspector can punch many samples quickly.
		setWeights(EMPTY_READINGS());
		setMrs(EMPTY_READINGS());
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
					select
					label="Spell (optional)"
					value={spellId}
					onChange={(e) => setSpellId(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
					fullWidth
				>
					<MenuItem value="">
						<em>None</em>
					</MenuItem>
					{setup.spells.map((s) => (
						<MenuItem key={s.spell_id} value={s.spell_id}>
							{s.spell_name ? `${s.spell_name} (${s.spell_code})` : s.spell_code}
						</MenuItem>
					))}
				</TextField>
				<Autocomplete
					options={setup.machines}
					getOptionLabel={(m) => (m.mech_code ? `${m.machine_name} (${m.mech_code})` : m.machine_name)}
					value={selectedMachine}
					onChange={(_, newVal) => setMachineId(newVal ? newVal.machine_id : "")}
					size="small"
					renderInput={(params) => (
						<TextField
							{...params}
							label="Spreader Machine"
							helperText={
								selectedMachine?.wt_per_roll != null
									? `Std roll wt: ${Number(selectedMachine.wt_per_roll).toFixed(2)}`
									: " "
							}
						/>
					)}
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
				/>
				<Autocomplete
					options={setup.qualities}
					getOptionLabel={(q) => q.item_name ?? q.item_code ?? `Item #${q.item_id}`}
					value={setup.qualities.find((q) => q.item_id === itemId) ?? null}
					onChange={(_, newVal) => setItemId(newVal ? newVal.item_id : "")}
					size="small"
					renderInput={(params) => <TextField {...params} label="Jute Quality" />}
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
				/>
				<TextField
					label="Feeder Name"
					value={feederName}
					onChange={(e) => setFeederName(e.target.value)}
					size="small"
					fullWidth
				/>
			</Box>

			<Typography variant="subtitle2">
				Readings — {ROLL_WT_SAMPLE_SIZE} roll weights (kg) with MR% each
			</Typography>
			<Box
				sx={{
					display: "grid",
					gap: 1.5,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						sm: "repeat(5, minmax(0, 1fr))",
					},
				}}
			>
				{weights.map((w, i) => (
					<Paper key={i} variant="outlined" sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1 }}>
						<Typography variant="caption" color="text.secondary">
							R{i + 1}
						</Typography>
						<TextField
							type="number"
							label="Wt (kg)"
							value={w}
							onChange={(e) => setReading("wt", i, e.target.value)}
							size="small"
							inputProps={{ step: "any", min: 0 }}
						/>
						<TextField
							type="number"
							label="MR %"
							value={mrs[i]}
							onChange={(e) => setReading("mr", i, e.target.value)}
							size="small"
							inputProps={{ step: "any", min: 0 }}
						/>
					</Paper>
				))}
			</Box>

			<Typography variant="body2" color="text.secondary">
				Avg observed: {avgObs != null ? avgObs.toFixed(2) : "—"} kg · Avg MR%:{" "}
				{avgMr != null ? avgMr.toFixed(2) : "—"} (corrected stats + bands computed on save)
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
					startIcon={<AddIcon size={18} />}
					onClick={handleSave}
					disabled={formInvalid || saving}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save Sample"}
				</Button>
			</Box>

			<Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack ?? ""} />
		</Box>
	);
}
