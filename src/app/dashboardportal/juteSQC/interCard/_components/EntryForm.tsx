"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Divider,
	MenuItem,
	Snackbar,
	TextField,
	Typography,
} from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { sampleStdDev } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import type { CardSliverSetup } from "../types";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: CardSliverSetup;
	onSaved: () => void;
};

// EXACTLY 4 sliver cuts (LB per 5 yds) + the parallel 4 MR% readings per reading-set.
const SAMPLE_SIZE = 4;
// Card-sliver default STD MR% (batch carries no single std) — preview only, server recomputes.
const STD_MR_PCT = 20;

const emptyReadings = (): string[] => Array.from({ length: SAMPLE_SIZE }, () => "");

export default function EntryForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [section, setSection] = React.useState<string>("");
	const [mcId, setMcId] = React.useState<number | "">("");
	const [spellId, setSpellId] = React.useState<number | "">("");
	const [batchPlanId, setBatchPlanId] = React.useState<number | "">("");
	const [weights, setWeights] = React.useState<string[]>(emptyReadings);
	const [mrs, setMrs] = React.useState<string[]>(emptyReadings);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const setWeight = (i: number, value: string) =>
		setWeights((prev) => prev.map((w, idx) => (idx === i ? value : w)));
	const setMr = (i: number, value: string) =>
		setMrs((prev) => prev.map((m, idx) => (idx === i ? value : m)));

	// Live preview — server recomputes on save (avg-then-correct path) and is authoritative.
	const preview = React.useMemo(() => {
		const wNums = weights.map((w) => Number(w));
		const mNums = mrs.map((m) => Number(m));
		const complete =
			weights.every((w) => w !== "") &&
			mrs.every((m) => m !== "") &&
			wNums.every((n) => Number.isFinite(n) && n > 0) &&
			mNums.every((n) => Number.isFinite(n) && n >= 0);
		if (!complete) return null;

		const avgWt = wNums.reduce((a, b) => a + b, 0) / SAMPLE_SIZE;
		const avgMr = mNums.reduce((a, b) => a + b, 0) / SAMPLE_SIZE;
		const corrWt = (avgWt * (100 + STD_MR_PCT)) / (100 + avgMr);
		const corrected = wNums.map((w, i) => (w * (100 + STD_MR_PCT)) / (100 + mNums[i]));
		const sdev = sampleStdDev(corrected) ?? 0;
		const cvPct = corrWt > 0 ? (sdev / corrWt) * 100 : 0;
		return { avgWt, avgMr, corrWt, sdev, cvPct };
	}, [weights, mrs]);

	const formInvalid = !section || !mcId || !spellId || !batchPlanId || preview == null;

	const handleSave = async () => {
		if (formInvalid) {
			setError(
				"Select section, machine, spell and batch, and enter all 4 weight + 4 MR% readings (weights > 0)."
			);
			return;
		}
		setSaving(true);
		setError(null);
		const body = {
			co_id: Number(coId),
			branch_id: branchId,
			entry_date: entryDate,
			// ponytail: one row per save (backend accepts many)
			rows: [
				{
					section,
					mc_id: Number(mcId),
					spell_id: Number(spellId),
					batch_plan_id: Number(batchPlanId),
					weights: weights.map(Number),
					mr_pcts: mrs.map(Number),
				},
			],
		};
		const { error: err } = await fetchWithCookie<{ data: { count: number } }>(
			apiRoutesPortalMasters.CARD_SLIVER_WT_CREATE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Card sliver reading saved");
		// Keep section/machine/spell/batch so the inspector can punch many sets quickly.
		setWeights(emptyReadings());
		setMrs(emptyReadings());
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
					label="Section"
					size="small"
					value={section}
					onChange={(e) => setSection(e.target.value)}
				>
					{setup.sections.map((s) => (
						<MenuItem key={s} value={s}>
							{s}
						</MenuItem>
					))}
				</TextField>
				<Autocomplete
					options={setup.machines}
					getOptionLabel={(m) => `${m.machine_name}${m.mech_code ? ` (${m.mech_code})` : ""}`}
					value={setup.machines.find((m) => m.machine_id === mcId) ?? null}
					onChange={(_, val) => setMcId(val ? val.machine_id : "")}
					size="small"
					renderInput={(params) => <TextField {...params} label="Machine (MC No.)" />}
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
				/>
				<TextField
					select
					label="Spell"
					size="small"
					value={spellId}
					onChange={(e) => setSpellId(e.target.value === "" ? "" : Number(e.target.value))}
				>
					{setup.spells.map((s) => (
						<MenuItem key={s.spell_id} value={s.spell_id}>
							{s.spell_code}
						</MenuItem>
					))}
				</TextField>
				<Autocomplete
					options={setup.batches}
					getOptionLabel={(b) => b.plan_name ?? `Batch #${b.batch_plan_id}`}
					value={setup.batches.find((b) => b.batch_plan_id === batchPlanId) ?? null}
					onChange={(_, val) => setBatchPlanId(val ? val.batch_plan_id : "")}
					size="small"
					renderInput={(params) => <TextField {...params} label="Batch" />}
					isOptionEqualToValue={(opt, val) => opt.batch_plan_id === val.batch_plan_id}
				/>
			</Box>

			<Divider />

			{/* 4 sliver-cut weights + the parallel 4 MR% readings */}
			<Box
				sx={{
					display: "grid",
					gap: 1.5,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						md: "repeat(4, minmax(0, 1fr))",
					},
				}}
			>
				{weights.map((w, i) => (
					<TextField
						key={`w${i}`}
						type="number"
						label={`Weight ${i + 1} (LB/5 yds)`}
						value={w}
						onChange={(e) => setWeight(i, e.target.value)}
						size="small"
						fullWidth
						inputProps={{ step: "any", min: 0 }}
					/>
				))}
				{mrs.map((m, i) => (
					<TextField
						key={`m${i}`}
						type="number"
						label={`MR% ${i + 1}`}
						value={m}
						onChange={(e) => setMr(i, e.target.value)}
						size="small"
						fullWidth
						inputProps={{ step: "any", min: 0 }}
					/>
				))}
			</Box>

			<Divider />

			{/* Live preview — corrected to STD MR% 20 (batch has no single std) */}
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						sm: "repeat(3, minmax(0, 1fr))",
						md: "repeat(5, minmax(0, 1fr))",
					},
				}}
			>
				<TextField
					label="Avg Wt"
					value={preview ? preview.avgWt.toFixed(3) : ""}
					size="small"
					InputProps={{ readOnly: true }}
				/>
				<TextField
					label="Avg MR %"
					value={preview ? preview.avgMr.toFixed(2) : ""}
					size="small"
					InputProps={{ readOnly: true }}
				/>
				<TextField
					label="Corr Wt"
					value={preview ? preview.corrWt.toFixed(3) : ""}
					size="small"
					InputProps={{ readOnly: true }}
					helperText={`corrected to STD MR ${STD_MR_PCT}%`}
				/>
				<TextField
					label="Std Dev"
					value={preview ? preview.sdev.toFixed(4) : ""}
					size="small"
					InputProps={{ readOnly: true }}
					helperText="sample (n-1)"
				/>
				<TextField
					label="CV %"
					value={preview ? preview.cvPct.toFixed(2) : ""}
					size="small"
					InputProps={{ readOnly: true }}
				/>
			</Box>

			<Typography variant="caption" color="text.secondary">
				Preview only — the server recomputes and persists the stats on save.
			</Typography>

			{error ? (
				<Alert severity="error" onClose={() => setError(null)}>
					{error}
				</Alert>
			) : null}

			<Box sx={{ display: "flex", justifyContent: { xs: "stretch", md: "flex-end" } }}>
				<Button
					variant="contained"
					startIcon={<SaveIcon size={18} />}
					onClick={handleSave}
					disabled={formInvalid || saving}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save Reading"}
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
