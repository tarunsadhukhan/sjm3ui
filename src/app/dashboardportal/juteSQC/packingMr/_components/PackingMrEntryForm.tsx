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
import type { ClothOption, PackingMrSetup } from "../types";

type Props = {
	coId: string;
	branchId: number;
	setup: PackingMrSetup;
	onSaved: () => void;
};

/**
 * Entry form for one Packing MR% reading-set: (date, quality column) with exactly
 * `readings_count` (10) MR% readings. Cloth-quality link, quality label and
 * construction code are optional. avg is server-computed (preview only here).
 */
export default function PackingMrEntryForm({ coId, branchId, setup, onSaved }: Props) {
	const readingsCount = setup.readings_count > 0 ? setup.readings_count : 10;

	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const [qualityGroup, setQualityGroup] = React.useState<string>("");
	const [cloth, setCloth] = React.useState<ClothOption | null>(null);
	const [qualityLabel, setQualityLabel] = React.useState<string>("");
	const [constructionCode, setConstructionCode] = React.useState<string>("");
	const [readings, setReadings] = React.useState<string[]>(() =>
		Array.from({ length: readingsCount }, () => "")
	);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	React.useEffect(() => {
		setReadings((prev) =>
			prev.length === readingsCount ? prev : Array.from({ length: readingsCount }, () => "")
		);
	}, [readingsCount]);

	const handleReadingChange = (index: number, value: string) => {
		setReadings((prev) => prev.map((r, i) => (i === index ? value : r)));
	};

	const nums = readings.map((r) => Number(r));
	const allFilled =
		readings.every((r) => r.trim() !== "") &&
		nums.every((v) => Number.isFinite(v) && v > 0);
	const avgPreview = allFilled
		? nums.reduce((a, b) => a + b, 0) / readingsCount
		: null;

	const handleSave = async () => {
		if (!qualityGroup) {
			setError("Select a quality group.");
			return;
		}
		if (!allFilled) {
			setError(`Enter all ${readingsCount} MR% readings as positive numbers.`);
			return;
		}
		setSaving(true);
		setError(null);
		const { error: err } = await fetchWithCookie(
			apiRoutesPortalMasters.PACKING_MR_CREATE,
			"POST",
			{
				co_id: Number(coId),
				branch_id: branchId,
				entry_date: entryDate,
				quality_group: qualityGroup,
				item_id: cloth?.item_id ?? null,
				quality_label: qualityLabel.trim() || null,
				construction_code: constructionCode.trim() || null,
				readings: nums,
			}
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack(`Saved Packing MR% reading-set for ${entryDate}`);
		setReadings(Array.from({ length: readingsCount }, () => ""));
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
					onChange={(e) => setQualityGroup(e.target.value)}
					size="small"
					fullWidth
				>
					{setup.quality_groups.map((g) => (
						<MenuItem key={g} value={g}>
							{g}
						</MenuItem>
					))}
				</TextField>
				<Autocomplete
					options={setup.qualities}
					getOptionLabel={(o) => o.item_name ?? ""}
					value={cloth}
					onChange={(_, v) => setCloth(v)}
					renderInput={(params) => (
						<TextField {...params} label="Cloth Quality (optional)" size="small" />
					)}
					size="small"
				/>
				<TextField
					label="Quality Label (optional)"
					value={qualityLabel}
					onChange={(e) => setQualityLabel(e.target.value)}
					size="small"
					fullWidth
				/>
				<TextField
					label="Construction Code (optional)"
					value={constructionCode}
					onChange={(e) => setConstructionCode(e.target.value)}
					size="small"
					fullWidth
				/>
			</Box>

			<Typography variant="subtitle2">
				MR% readings ({readingsCount} required)
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
					Avg MR%: <b>{avgPreview.toFixed(3)}</b>
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
