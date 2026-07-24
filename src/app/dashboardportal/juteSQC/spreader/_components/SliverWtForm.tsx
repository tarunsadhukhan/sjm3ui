"use client";

import * as React from "react";
import { Alert, Autocomplete, Box, Button, MenuItem, Paper, Snackbar, TextField, Typography } from "@mui/material";
import { Plus as AddIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	SLIVER_DEFAULT_SAMPLE_LENGTH_YDS,
	SLIVER_DEFAULT_WEIGHT_BASIS,
	SLIVER_WT_MAX_READINGS,
	type SliverWtCreatePayload,
	type SpreaderSetup,
} from "../types/spreaderSqcTypes";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: SpreaderSetup;
	onSaved: () => void;
};

const EMPTY_READINGS = () => Array<string>(SLIVER_WT_MAX_READINGS).fill("");

/**
 * R-08-03 entry form: 1-12 paired sliver-weight (lb/100yds) + MR% readings.
 * Blank reading slots are skipped; a filled weight requires its MR% partner.
 * Server moisture-corrects and persists stats (std MR% from the quality master).
 */
export default function SliverWtForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [spellId, setSpellId] = React.useState<number | "">("");
	const [category, setCategory] = React.useState("");
	const [machineId, setMachineId] = React.useState<number | "">("");
	const [itemId, setItemId] = React.useState<number | "">("");
	const [sampleLength, setSampleLength] = React.useState(String(SLIVER_DEFAULT_SAMPLE_LENGTH_YDS));
	const [weightBasis, setWeightBasis] = React.useState(SLIVER_DEFAULT_WEIGHT_BASIS);
	const [weights, setWeights] = React.useState<string[]>(EMPTY_READINGS);
	const [mrs, setMrs] = React.useState<string[]>(EMPTY_READINGS);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const setReading = (list: "wt" | "mr", index: number, value: string) => {
		const setter = list === "wt" ? setWeights : setMrs;
		setter((prev) => {
			const next = [...prev];
			next[index] = value;
			return next;
		});
	};

	// Filled pairs (weight slot non-blank). MR partner is validated on save.
	const filledIdx = weights
		.map((w, i) => (w !== "" ? i : -1))
		.filter((i) => i >= 0);
	const filledWeights = filledIdx.map((i) => Number(weights[i]));
	const avgObs = filledWeights.length
		? filledWeights.reduce((a, b) => a + b, 0) / filledWeights.length
		: null;

	const formInvalid =
		filledIdx.length === 0 ||
		filledIdx.some((i) => Number(weights[i]) <= 0 || mrs[i] === "" || Number(mrs[i]) < 0);

	const handleSave = async () => {
		if (formInvalid) {
			setError("Enter at least 1 reading; each filled weight must be > 0 with its MR% (>= 0).");
			return;
		}
		setSaving(true);
		setError(null);
		const body: SliverWtCreatePayload = {
			co_id: Number(coId),
			branch_id: branchId,
			entry_date: entryDate,
			spell_id: spellId === "" ? null : Number(spellId),
			category: category.trim() === "" ? null : category.trim(),
			mc_id: machineId === "" ? null : Number(machineId),
			item_id: itemId === "" ? null : Number(itemId),
			sample_length_yds: sampleLength === "" ? null : Number(sampleLength),
			weight_basis: weightBasis.trim() === "" ? null : weightBasis.trim(),
			observed_weights: filledIdx.map((i) => Number(weights[i])),
			mr_pcts: filledIdx.map((i) => Number(mrs[i])),
		};
		const { error: err } = await fetchWithCookie<{
			data: { message: string; spreader_sliver_wt_id: number };
		}>(apiRoutesPortalMasters.SPREADER_SLIVER_WT_CREATE, "POST", body);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Sliver weight sample saved");
		// Keep header pickers so the inspector can punch many samples quickly.
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
						md: "repeat(3, minmax(0, 1fr))",
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
				<TextField
					label="Category"
					value={category}
					onChange={(e) => setCategory(e.target.value)}
					size="small"
					fullWidth
				/>
				<Autocomplete
					options={setup.machines}
					getOptionLabel={(m) => (m.mech_code ? `${m.machine_name} (${m.mech_code})` : m.machine_name)}
					value={setup.machines.find((m) => m.machine_id === machineId) ?? null}
					onChange={(_, newVal) => setMachineId(newVal ? newVal.machine_id : "")}
					size="small"
					renderInput={(params) => <TextField {...params} label="Spreader Machine" />}
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
					type="number"
					label="Sample Length (yds)"
					value={sampleLength}
					onChange={(e) => setSampleLength(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					label="Weight Basis"
					value={weightBasis}
					onChange={(e) => setWeightBasis(e.target.value)}
					size="small"
					fullWidth
				/>
			</Box>

			<Typography variant="subtitle2">
				Readings — up to {SLIVER_WT_MAX_READINGS} sliver weights ({weightBasis || SLIVER_DEFAULT_WEIGHT_BASIS})
				with MR% each; blanks are skipped
			</Typography>
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
				{weights.map((w, i) => (
					<Paper key={i} variant="outlined" sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1 }}>
						<Typography variant="caption" color="text.secondary">
							S{i + 1}
						</Typography>
						<TextField
							type="number"
							label="Wt"
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
				{filledIdx.length} reading{filledIdx.length === 1 ? "" : "s"} · Avg observed:{" "}
				{avgObs != null ? avgObs.toFixed(2) : "—"} (corrected stats computed on save)
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
