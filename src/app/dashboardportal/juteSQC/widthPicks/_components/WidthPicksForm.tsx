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
import { Plus as AddIcon, Save as SaveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { WidthPicksSetup } from "../types";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: WidthPicksSetup;
	onSaved: () => void;
};

// Loom reading row: width required, picks optional (only a sampled subset is pick-checked).
type RowState = { loomId: number | ""; width: string; picks: string };

const INITIAL_ROWS = 5;

const emptyRow = (): RowState => ({ loomId: "", width: "", picks: "" });

function num(s: string): number | null {
	if (s === "") return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}

export default function WidthPicksForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [itemId, setItemId] = React.useState<number | "">("");
	const [stdWidth, setStdWidth] = React.useState("");
	const [stdPicks, setStdPicks] = React.useState("");
	const [inspector, setInspector] = React.useState("");
	const [rows, setRows] = React.useState<RowState[]>(() =>
		Array.from({ length: INITIAL_ROWS }, emptyRow)
	);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const setRow = (i: number, patch: Partial<RowState>) =>
		setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

	const addRow = () => setRows((prev) => [...prev, emptyRow()]);

	const handleSave = async () => {
		if (itemId === "") {
			setError("Select a cloth quality.");
			return;
		}
		const stdWidthN = num(stdWidth);
		if (stdWidthN == null || stdWidthN <= 0) {
			setError("Std Width (cm) must be greater than 0.");
			return;
		}
		const stdPicksN = num(stdPicks);
		if (stdPicksN == null || stdPicksN <= 0) {
			setError("Std Picks must be greater than 0.");
			return;
		}
		// A row is submitted only when touched; a touched row needs a loom + width.
		const touched = rows
			.map((r, i) => ({ r, i }))
			.filter(({ r }) => r.loomId !== "" || r.width !== "" || r.picks !== "");
		if (touched.length === 0) {
			setError("Enter at least one loom reading row.");
			return;
		}
		for (const { r, i } of touched) {
			if (r.loomId === "") {
				setError(`Row ${i + 1}: select a loom.`);
				return;
			}
			const w = num(r.width);
			if (w == null || w <= 0) {
				setError(`Row ${i + 1}: Width (cm) must be greater than 0.`);
				return;
			}
			if (r.picks !== "") {
				const p = num(r.picks);
				if (p == null || p <= 0) {
					setError(`Row ${i + 1}: Picks/dm must be greater than 0 when entered.`);
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
			std_width_cm: stdWidthN,
			std_picks: stdPicksN,
			inspector_name: inspector || null,
			rows: touched.map(({ r }) => ({
				loom_id: Number(r.loomId),
				width_cm: Number(r.width),
				picks_dm: r.picks === "" ? null : Number(r.picks),
			})),
		};
		const { error: err } = await fetchWithCookie<{ message: string }>(
			apiRoutesPortalMasters.WIDTH_PICKS_CREATE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Width & Picks QC group saved");
		// Keep quality/stds/inspector so the inspector can punch many groups quickly.
		setRows(Array.from({ length: INITIAL_ROWS }, emptyRow));
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
					options={setup.cloth_qualities}
					getOptionLabel={(q) => `${q.item_name ?? ""} (${q.item_code ?? ""})`}
					value={setup.cloth_qualities.find((q) => q.item_id === itemId) ?? null}
					onChange={(_, newVal) => setItemId(newVal ? newVal.item_id : "")}
					size="small"
					renderInput={(params) => <TextField {...params} label="Cloth Quality" />}
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
				/>
				<TextField
					type="number"
					label="Std Width (cm)"
					value={stdWidth}
					onChange={(e) => setStdWidth(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
					helperText="Snapshotted on save; ±0.5% tolerance"
				/>
				<TextField
					type="number"
					label="Std Picks"
					value={stdPicks}
					onChange={(e) => setStdPicks(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					label="Inspector Name"
					value={inspector}
					onChange={(e) => setInspector(e.target.value)}
					size="small"
					fullWidth
				/>
			</Box>

			<Divider />

			<Typography variant="subtitle2">
				Loom readings (width required; picks only for pick-checked looms; blank rows are skipped)
			</Typography>
			{rows.map((r, i) => (
				<Box
					key={i}
					sx={{
						display: "grid",
						gap: 1.5,
						gridTemplateColumns: { xs: "1fr", sm: "repeat(3, minmax(0, 1fr))" },
					}}
				>
					<Autocomplete
						options={setup.looms}
						getOptionLabel={(m) => `${m.machine_name ?? ""} (${m.mech_code ?? ""})`}
						value={setup.looms.find((m) => m.machine_id === r.loomId) ?? null}
						onChange={(_, newVal) => setRow(i, { loomId: newVal ? newVal.machine_id : "" })}
						size="small"
						renderInput={(params) => <TextField {...params} label={`Loom ${i + 1}`} />}
						isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
					/>
					<TextField
						type="number"
						label="Width (cm)"
						value={r.width}
						onChange={(e) => setRow(i, { width: e.target.value })}
						size="small"
						fullWidth
						inputProps={{ step: "any", min: 0 }}
					/>
					<TextField
						type="number"
						label="Picks/dm (optional)"
						value={r.picks}
						onChange={(e) => setRow(i, { picks: e.target.value })}
						size="small"
						fullWidth
						inputProps={{ step: "any", min: 0 }}
					/>
				</Box>
			))}
			<Box>
				<Button startIcon={<AddIcon size={16} />} onClick={addRow} size="small">
					Add row
				</Button>
			</Box>

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
