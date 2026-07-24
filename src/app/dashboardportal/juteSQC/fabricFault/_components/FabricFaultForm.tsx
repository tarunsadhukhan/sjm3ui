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
import type { FabricFaultSetup } from "../types";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: FabricFaultSetup;
	onSaved: () => void;
};

export default function FabricFaultForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const faultCount = setup.fault_types.length;

	const [spellId, setSpellId] = React.useState<number | "">("");
	const [itemId, setItemId] = React.useState<number | "">("");
	const [loomId, setLoomId] = React.useState<number | "">("");
	const [dateOfWeaving, setDateOfWeaving] = React.useState("");
	const [inspector, setInspector] = React.useState("");
	const [remarks, setRemarks] = React.useState("");
	// One count per fault type; blank = 0 (a clean piece is all zeroes).
	const [counts, setCounts] = React.useState<string[]>(() =>
		Array.from({ length: faultCount }, () => "")
	);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const setCount = (i: number, value: string) =>
		setCounts((prev) => prev.map((c, idx) => (idx === i ? value : c)));

	const pieceTotal = counts.reduce((acc, c) => acc + (c === "" ? 0 : Number(c) || 0), 0);

	const handleSave = async () => {
		// Backend requires exactly N integers >= 0 (StrictInt); blanks map to 0.
		for (let i = 0; i < counts.length; i++) {
			const c = counts[i];
			if (c === "") continue;
			const n = Number(c);
			if (!Number.isInteger(n) || n < 0) {
				setError(`"${setup.fault_types[i]}" must be a whole number >= 0.`);
				return;
			}
		}
		setSaving(true);
		setError(null);
		const body = {
			co_id: Number(coId),
			branch_id: branchId,
			entry_date: entryDate,
			spell_id: spellId === "" ? null : Number(spellId),
			item_id: itemId === "" ? null : Number(itemId),
			loom_id: loomId === "" ? null : Number(loomId),
			date_of_weaving: dateOfWeaving || null,
			fault_counts: counts.map((c) => (c === "" ? 0 : Number(c))),
			remarks: remarks || null,
			inspector_name: inspector || null,
		};
		const { error: err } = await fetchWithCookie<{ message: string }>(
			apiRoutesPortalMasters.FABRIC_FAULT_CREATE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Fabric Fault piece saved");
		// Keep spell/quality/inspector so the inspector can punch many pieces quickly.
		setLoomId("");
		setRemarks("");
		setCounts(Array.from({ length: faultCount }, () => ""));
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
					options={setup.spells}
					getOptionLabel={(s) => s.spell_code ?? `Spell #${s.spell_id}`}
					value={setup.spells.find((s) => s.spell_id === spellId) ?? null}
					onChange={(_, newVal) => setSpellId(newVal ? newVal.spell_id : "")}
					size="small"
					renderInput={(params) => <TextField {...params} label="Spell" />}
					isOptionEqualToValue={(opt, val) => opt.spell_id === val.spell_id}
				/>
				<Autocomplete
					options={setup.qualities}
					getOptionLabel={(q) => `${q.item_name ?? ""} (${q.item_code ?? ""})`}
					value={setup.qualities.find((q) => q.item_id === itemId) ?? null}
					onChange={(_, newVal) => setItemId(newVal ? newVal.item_id : "")}
					size="small"
					renderInput={(params) => <TextField {...params} label="Cloth Quality" />}
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
				/>
				<Autocomplete
					options={setup.looms}
					getOptionLabel={(m) => `${m.machine_name ?? ""} (${m.mech_code ?? ""})`}
					value={setup.looms.find((m) => m.machine_id === loomId) ?? null}
					onChange={(_, newVal) => setLoomId(newVal ? newVal.machine_id : "")}
					size="small"
					renderInput={(params) => <TextField {...params} label="Loom" />}
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
				/>
				<TextField
					type="date"
					label="Date of Weaving"
					value={dateOfWeaving}
					onChange={(e) => setDateOfWeaving(e.target.value)}
					size="small"
					fullWidth
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					label="Inspector Name"
					value={inspector}
					onChange={(e) => setInspector(e.target.value)}
					size="small"
					fullWidth
				/>
				<TextField
					label="Remarks"
					value={remarks}
					onChange={(e) => setRemarks(e.target.value)}
					size="small"
					fullWidth
				/>
			</Box>

			<Divider />

			<Typography variant="subtitle2">
				Fault counts for this piece (blank = 0)
			</Typography>
			<Box
				sx={{
					display: "grid",
					gap: 1.5,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						sm: "repeat(3, minmax(0, 1fr))",
						md: "repeat(5, minmax(0, 1fr))",
					},
				}}
			>
				{setup.fault_types.map((name, i) => (
					<TextField
						key={name}
						type="number"
						label={name}
						value={counts[i] ?? ""}
						onChange={(e) => setCount(i, e.target.value)}
						size="small"
						fullWidth
						inputProps={{ step: 1, min: 0 }}
					/>
				))}
			</Box>

			<Typography variant="body2">
				Piece total: <strong>{pieceTotal}</strong>
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
