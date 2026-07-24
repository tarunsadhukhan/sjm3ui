"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
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
import type { BeamMrSetup, ClothOption } from "../types";

type Props = {
	coId: string;
	branchId: number;
	setup: BeamMrSetup;
	onSaved: () => void;
};

/**
 * Entry form for one Beam MR% reading-set: (date, quality group, machine) with
 * exactly `readings_per_set` (5) MR% readings. std MR% prefills from the quality
 * group and stays editable; avg/deviation are server-computed (preview only here).
 */
export default function BeamMrEntryForm({ coId, branchId, setup, onSaved }: Props) {
	const readingsPerSet = setup.readings_per_set > 0 ? setup.readings_per_set : 5;
	const qualityGroups = React.useMemo(
		() => Object.keys(setup.std_mr_by_group),
		[setup.std_mr_by_group]
	);

	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const [qualityGroup, setQualityGroup] = React.useState<string>("");
	const [spellId, setSpellId] = React.useState<number | "">("");
	const [mcId, setMcId] = React.useState<number | "">("");
	const [cloth, setCloth] = React.useState<ClothOption | null>(null);
	const [stdMr, setStdMr] = React.useState<string>("");
	const [readings, setReadings] = React.useState<string[]>(() =>
		Array.from({ length: readingsPerSet }, () => "")
	);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	React.useEffect(() => {
		setReadings((prev) =>
			prev.length === readingsPerSet ? prev : Array.from({ length: readingsPerSet }, () => "")
		);
	}, [readingsPerSet]);

	const handleGroupChange = (g: string) => {
		setQualityGroup(g);
		const std = setup.std_mr_by_group[g];
		setStdMr(std != null ? String(std) : "");
	};

	const handleReadingChange = (index: number, value: string) => {
		setReadings((prev) => prev.map((r, i) => (i === index ? value : r)));
	};

	const nums = readings.map((r) => Number(r));
	const allFilled =
		readings.every((r) => r.trim() !== "") &&
		nums.every((v) => Number.isFinite(v) && v > 0);
	const avgPreview = allFilled
		? nums.reduce((a, b) => a + b, 0) / readingsPerSet
		: null;
	const stdNum = stdMr.trim() === "" ? null : Number(stdMr);
	const deviationPreview =
		avgPreview != null && stdNum != null && Number.isFinite(stdNum)
			? avgPreview - stdNum
			: null;

	const handleSave = async () => {
		if (!qualityGroup) {
			setError("Select a quality group.");
			return;
		}
		if (mcId === "") {
			setError("Select a beam machine.");
			return;
		}
		if (!cloth) {
			setError("Select a cloth quality.");
			return;
		}
		if (!allFilled) {
			setError(`Enter all ${readingsPerSet} MR% readings as positive numbers.`);
			return;
		}
		setSaving(true);
		setError(null);
		const { error: err } = await fetchWithCookie(
			apiRoutesPortalMasters.BEAM_MR_CREATE,
			"POST",
			{
				co_id: Number(coId),
				branch_id: branchId,
				entry_date: entryDate,
				quality_group: qualityGroup,
				spell_id: spellId === "" ? null : Number(spellId),
				item_id: cloth.item_id,
				mc_id: Number(mcId),
				readings: nums,
				std_mr_pct: stdNum != null && Number.isFinite(stdNum) ? stdNum : null,
			}
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack(`Saved Beam MR% reading-set for ${entryDate}`);
		setReadings(Array.from({ length: readingsPerSet }, () => ""));
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
					type="date"
					label="Date"
					value={entryDate}
					onChange={(e) => setEntryDate(e.target.value)}
					size="small"
					fullWidth
					slotProps={{ inputLabel: { shrink: true } }}
				/>
				<TextField
					select
					label="Quality Group"
					value={qualityGroup}
					onChange={(e) => handleGroupChange(e.target.value)}
					size="small"
					fullWidth
				>
					{qualityGroups.map((g) => (
						<MenuItem key={g} value={g}>
							{g}
						</MenuItem>
					))}
				</TextField>
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
							{s.spell_code}
						</MenuItem>
					))}
				</TextField>
				<TextField
					select
					label="Beam Machine"
					value={mcId}
					onChange={(e) => setMcId(e.target.value === "" ? "" : Number(e.target.value))}
					size="small"
					fullWidth
				>
					{setup.machines.map((m) => (
						<MenuItem key={m.machine_id} value={m.machine_id}>
							{m.mech_code ? `${m.mech_code} — ${m.machine_name ?? ""}` : m.machine_name}
						</MenuItem>
					))}
				</TextField>
				<Autocomplete
					options={setup.cloth_qualities}
					getOptionLabel={(o) => o.item_name ?? ""}
					value={cloth}
					onChange={(_, v) => setCloth(v)}
					renderInput={(params) => (
						<TextField {...params} label="Cloth Quality" size="small" />
					)}
					size="small"
				/>
				<TextField
					type="number"
					label="Std MR%"
					value={stdMr}
					onChange={(e) => setStdMr(e.target.value)}
					size="small"
					fullWidth
					helperText="Prefilled by quality group; editable"
					slotProps={{ htmlInput: { step: 0.1, min: 0 } }}
				/>
			</Box>

			<Typography variant="subtitle2">
				MR% readings ({readingsPerSet} required)
			</Typography>
			<Box
				sx={{
					display: "grid",
					gap: 1.5,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						sm: `repeat(${readingsPerSet}, minmax(0, 1fr))`,
					},
				}}
			>
				{readings.map((r, i) => (
					<TextField
						key={i}
						type="number"
						label={`R${i + 1}`}
						value={r}
						onChange={(e) => handleReadingChange(i, e.target.value)}
						size="small"
						slotProps={{ htmlInput: { step: 0.1, min: 0 } }}
					/>
				))}
			</Box>

			{avgPreview != null ? (
				<Typography variant="body2" color="text.secondary">
					Avg MR%: <b>{avgPreview.toFixed(2)}</b>
					{deviationPreview != null ? (
						<>
							{" "}
							· Deviation vs std: <b>{deviationPreview.toFixed(2)}</b>
						</>
					) : null}
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
