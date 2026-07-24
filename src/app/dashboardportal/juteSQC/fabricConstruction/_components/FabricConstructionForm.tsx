"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Divider,
	Snackbar,
	TextField,
	Typography,
} from "@mui/material";
import { Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { FabricConstructionSetup } from "../types";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: FabricConstructionSetup;
	onSaved: () => void;
};

// Mirror of the backend KG_TO_OZ constant — preview only, the server recomputes on save.
const KG_TO_OZ = 28.3495;

type StdKey =
	| "std_length_yds"
	| "std_width_cms"
	| "std_ends_dm"
	| "std_picks_dm"
	| "std_mr_pct"
	| "std_oz_per_yd";
type StdState = Record<StdKey, string>;

type SampleKey =
	| "length_yds"
	| "width_cms"
	| "ends_per_dm"
	| "picks_per_dm"
	| "mr_pct"
	| "obs_wt_kg";
type SampleState = Record<SampleKey, string>;

const STD_FIELDS: { key: StdKey; label: string }[] = [
	{ key: "std_length_yds", label: "Std Length (yds)" },
	{ key: "std_width_cms", label: "Std Width (cms)" },
	{ key: "std_ends_dm", label: "Std Ends/dm" },
	{ key: "std_picks_dm", label: "Std Picks/dm" },
	{ key: "std_mr_pct", label: "Std MR %" },
	{ key: "std_oz_per_yd", label: "Std Oz/yd" },
];

const SAMPLE_FIELDS: { key: SampleKey; label: string }[] = [
	{ key: "length_yds", label: "Length (yds)" },
	{ key: "width_cms", label: "Width (cms)" },
	{ key: "ends_per_dm", label: "Ends/dm" },
	{ key: "picks_per_dm", label: "Picks/dm" },
	{ key: "mr_pct", label: "MR %" },
	{ key: "obs_wt_kg", label: "Obs Wt (kg)" },
];

const emptySample = (): SampleState => ({
	length_yds: "",
	width_cms: "",
	ends_per_dm: "",
	picks_per_dm: "",
	mr_pct: "",
	obs_wt_kg: "",
});

function num(s: string): number | null {
	if (s === "") return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}

export default function FabricConstructionForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const sampleRows = setup.sample_rows > 0 ? setup.sample_rows : 5;

	const [itemId, setItemId] = React.useState<number | "">("");
	const [qualityText, setQualityText] = React.useState("");
	const [stds, setStds] = React.useState<StdState>({
		std_length_yds: "",
		std_width_cms: "",
		std_ends_dm: "",
		std_picks_dm: "",
		std_mr_pct: setup.default_std_mr_pct != null ? String(setup.default_std_mr_pct) : "",
		std_oz_per_yd: "",
	});
	const [samples, setSamples] = React.useState<SampleState[]>(() =>
		Array.from({ length: sampleRows }, emptySample)
	);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const setStd = (key: StdKey, value: string) =>
		setStds((prev) => ({ ...prev, [key]: value }));

	const setSample = (i: number, key: SampleKey, value: string) =>
		setSamples((prev) => prev.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)));

	// Live per-row preview of obs oz/yd + MR-corrected oz — server recomputes on save.
	const stdMr = num(stds.std_mr_pct);
	const preview = samples.map((s) => {
		const length = num(s.length_yds);
		const mr = num(s.mr_pct);
		const wt = num(s.obs_wt_kg);
		if (length == null || length <= 0 || wt == null || wt <= 0) return { obs: null, corr: null };
		const obs = (wt * 1000) / KG_TO_OZ / length;
		const corr =
			mr != null && mr > 0 && stdMr != null ? (obs * (100 + stdMr)) / (100 + mr) : null;
		return { obs, corr };
	});

	const handleSave = async () => {
		if (itemId === "") {
			setError("Select a cloth quality.");
			return;
		}
		for (const { key, label } of STD_FIELDS) {
			const v = num(stds[key]);
			if (v == null || v <= 0) {
				setError(`${label} must be greater than 0.`);
				return;
			}
		}
		// A sample row is submitted only when touched; a touched row must be complete.
		const touched = samples
			.map((s, i) => ({ s, i }))
			.filter(({ s }) => SAMPLE_FIELDS.some(({ key }) => s[key] !== ""));
		if (touched.length === 0) {
			setError("Enter at least one sample row.");
			return;
		}
		for (const { s, i } of touched) {
			for (const { key, label } of SAMPLE_FIELDS) {
				const v = num(s[key]);
				if (v == null || v <= 0) {
					setError(`Sample ${i + 1}: ${label} must be greater than 0.`);
					return;
				}
			}
		}
		setSaving(true);
		setError(null);
		const body = {
			co_id: Number(coId),
			branch_id: branchId,
			entry_date: entryDate,
			item_id: Number(itemId),
			quality_text: qualityText || null,
			std_length_yds: Number(stds.std_length_yds),
			std_width_cms: Number(stds.std_width_cms),
			std_ends_dm: Number(stds.std_ends_dm),
			std_picks_dm: Number(stds.std_picks_dm),
			std_mr_pct: Number(stds.std_mr_pct),
			std_oz_per_yd: Number(stds.std_oz_per_yd),
			rows: touched.map(({ s }) => ({
				length_yds: Number(s.length_yds),
				width_cms: Number(s.width_cms),
				ends_per_dm: Number(s.ends_per_dm),
				picks_per_dm: Number(s.picks_per_dm),
				mr_pct: Number(s.mr_pct),
				obs_wt_kg: Number(s.obs_wt_kg),
			})),
		};
		const { error: err } = await fetchWithCookie<{ message: string }>(
			apiRoutesPortalMasters.FABRIC_CONSTRUCTION_CREATE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Fabric Construction QC block saved");
		// Keep quality + stds so the inspector can punch many blocks quickly.
		setSamples(Array.from({ length: sampleRows }, emptySample));
		onSaved();
	};

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
				}}
			>
				<Autocomplete
					options={setup.cloth_qualities}
					getOptionLabel={(q) => `${q.item_name ?? ""} (${q.item_code ?? ""})`}
					value={setup.cloth_qualities.find((q) => q.item_id === itemId) ?? null}
					onChange={(_, newVal) => setItemId(newVal ? newVal.item_id : "")}
					size="small"
					renderInput={(params) => <TextField {...params} label="Cloth Quality" />}
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
				/>
				<TextField
					label="Quality Text (optional)"
					value={qualityText}
					onChange={(e) => setQualityText(e.target.value)}
					size="small"
					fullWidth
				/>
			</Box>

			<Typography variant="subtitle2">Standard values (snapshotted on save)</Typography>
			<Box
				sx={{
					display: "grid",
					gap: 1.5,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						md: "repeat(6, minmax(0, 1fr))",
					},
				}}
			>
				{STD_FIELDS.map(({ key, label }) => (
					<TextField
						key={key}
						type="number"
						label={label}
						value={stds[key]}
						onChange={(e) => setStd(key, e.target.value)}
						size="small"
						fullWidth
						inputProps={{ step: "any", min: 0 }}
					/>
				))}
			</Box>

			<Divider />

			<Typography variant="subtitle2">
				Sample readings (up to {sampleRows} rows; blank rows are skipped)
			</Typography>
			{samples.map((s, i) => (
				<Box key={i}>
					<Typography variant="caption" color="text.secondary">
						Sample {i + 1}
					</Typography>
					<Box
						sx={{
							display: "grid",
							gap: 1.5,
							mt: 0.5,
							gridTemplateColumns: {
								xs: "repeat(2, minmax(0, 1fr))",
								md: "repeat(8, minmax(0, 1fr))",
							},
						}}
					>
						{SAMPLE_FIELDS.map(({ key, label }) => (
							<TextField
								key={key}
								type="number"
								label={label}
								value={s[key]}
								onChange={(e) => setSample(i, key, e.target.value)}
								size="small"
								fullWidth
								inputProps={{ step: "any", min: 0 }}
							/>
						))}
						<TextField
							label="Oz/yd"
							value={preview[i].obs != null ? preview[i].obs!.toFixed(3) : ""}
							size="small"
							fullWidth
							InputProps={{ readOnly: true }}
						/>
						<TextField
							label="Corrected Oz"
							value={preview[i].corr != null ? preview[i].corr!.toFixed(3) : ""}
							size="small"
							fullWidth
							InputProps={{ readOnly: true }}
						/>
					</Box>
				</Box>
			))}

			<Typography variant="caption" color="text.secondary">
				Preview only — the server recomputes oz/yd and corrected oz on save.
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
					disabled={saving}
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
