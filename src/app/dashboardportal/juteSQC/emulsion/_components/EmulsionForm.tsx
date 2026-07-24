"use client";

import * as React from "react";
import { Alert, Autocomplete, Box, Button, Chip, Divider, Snackbar, TextField, Typography } from "@mui/material";
import { Plus as AddIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import {
	ADDITIVE_FIELDS,
	type AdditiveKey,
	type EmulsionCreatePayload,
	type EmulsionSetup,
	type EmulsionStatus,
} from "../types/emulsionTypes";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: EmulsionSetup;
	onSaved: () => void;
};

const emptyAdditives = (): Record<AdditiveKey, string> =>
	Object.fromEntries(ADDITIVE_FIELDS.map((f) => [f.key, ""])) as Record<AdditiveKey, string>;

/** Client mirror of the server's display-only status (server recomputes on read). */
function liveStatus(oilPct: number | null, low: number | null, high: number | null): EmulsionStatus | null {
	if (oilPct == null || low == null || high == null) return null;
	if (oilPct < low) return "LOW";
	if (oilPct > high) return "HIGH";
	return "OK";
}

const STATUS_COLOR: Record<EmulsionStatus, "success" | "warning" | "error"> = {
	OK: "success",
	LOW: "warning",
	HIGH: "error",
};

/**
 * R-08-02 entry form: one date's jute-oil emulsion recipe. The target band and
 * tank capacity prefill from the setup defaults and are snapshotted at save.
 */
export default function EmulsionForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [mcId, setMcId] = React.useState<number | "">("");
	const [oilUsed, setOilUsed] = React.useState("");
	const [tankCap, setTankCap] = React.useState(String(setup.default_tank_capacity ?? ""));
	const [oilPct, setOilPct] = React.useState("");
	const [stdLow, setStdLow] = React.useState(String(setup.default_oil_pct_low ?? ""));
	const [stdHigh, setStdHigh] = React.useState(String(setup.default_oil_pct_high ?? ""));
	const [additives, setAdditives] = React.useState<Record<AdditiveKey, string>>(emptyAdditives);
	const [rollsMade, setRollsMade] = React.useState("");
	const [others, setOthers] = React.useState("");
	const [preparedBy, setPreparedBy] = React.useState("");
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const num = (s: string): number | null => (s === "" ? null : Number(s));

	// Live reference values (server recomputes on read and is authoritative).
	const theoretical =
		num(oilUsed) != null && num(tankCap) != null && Number(tankCap) > 0
			? (Number(oilUsed) / Number(tankCap)) * 100
			: null;
	const status = liveStatus(num(oilPct), num(stdLow), num(stdHigh));

	// Mirrors backend validation: oil used / tank / oil% / band low all > 0, high >= low.
	const formInvalid =
		!(Number(oilUsed) > 0) ||
		!(Number(tankCap) > 0) ||
		!(Number(oilPct) > 0) ||
		!(Number(stdLow) > 0) ||
		stdHigh === "" ||
		Number(stdHigh) < Number(stdLow);

	const handleSave = async () => {
		if (formInvalid) {
			setError("Oil used, tank capacity, oil% and band low must be > 0; band high must be >= low.");
			return;
		}
		setSaving(true);
		setError(null);

		const additivePayload = {} as Record<AdditiveKey, number | null>;
		for (const f of ADDITIVE_FIELDS) {
			additivePayload[f.key] = num(additives[f.key]);
		}

		const body: EmulsionCreatePayload = {
			co_id: Number(coId),
			branch_id: branchId,
			entry_date: entryDate,
			mc_id: mcId === "" ? null : Number(mcId),
			oil_used_ltr: Number(oilUsed),
			tank_capacity_ltr: Number(tankCap),
			oil_pct_in_emulsion: Number(oilPct),
			std_oil_pct_low: Number(stdLow),
			std_oil_pct_high: Number(stdHigh),
			spreader_rolls_made: rollsMade === "" ? null : Number(rollsMade),
			others: others.trim() === "" ? null : others.trim(),
			prepared_by: preparedBy.trim() === "" ? null : preparedBy.trim(),
			...additivePayload,
		};

		// NOTE: create_emulsion returns {message, emulsion_id} WITHOUT the data envelope.
		const { error: err } = await fetchWithCookie<{ message: string; emulsion_id: number }>(
			apiRoutesPortalMasters.EMULSION_CREATE,
			"POST",
			body
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Emulsion recipe saved");
		// Clear the measured fields; keep machine, band, tank capacity and prepared-by.
		setOilUsed("");
		setOilPct("");
		setAdditives(emptyAdditives());
		setRollsMade("");
		setOthers("");
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
					options={setup.machines}
					getOptionLabel={(m) => (m.mech_code ? `${m.machine_name} (${m.mech_code})` : m.machine_name)}
					value={setup.machines.find((m) => m.machine_id === mcId) ?? null}
					onChange={(_, newVal) => setMcId(newVal ? newVal.machine_id : "")}
					size="small"
					renderInput={(params) => <TextField {...params} label="Spreader Machine (optional)" />}
					isOptionEqualToValue={(opt, val) => opt.machine_id === val.machine_id}
				/>
				<TextField
					type="number"
					label="Oil Used (ltr)"
					value={oilUsed}
					onChange={(e) => setOilUsed(e.target.value)}
					size="small"
					fullWidth
					required
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					type="number"
					label="Tank Capacity (ltr)"
					value={tankCap}
					onChange={(e) => setTankCap(e.target.value)}
					size="small"
					fullWidth
					required
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					type="number"
					label="Oil % in Emulsion (measured)"
					value={oilPct}
					onChange={(e) => setOilPct(e.target.value)}
					size="small"
					fullWidth
					required
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					type="number"
					label="Std Oil % Low"
					value={stdLow}
					onChange={(e) => setStdLow(e.target.value)}
					size="small"
					fullWidth
					required
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					type="number"
					label="Std Oil % High"
					value={stdHigh}
					onChange={(e) => setStdHigh(e.target.value)}
					size="small"
					fullWidth
					required
					inputProps={{ step: "any", min: 0 }}
				/>
			</Box>

			<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
				<Typography variant="body2" color="text.secondary">
					Theoretical oil% (oil ÷ tank × 100): {theoretical != null ? theoretical.toFixed(2) : "—"}
				</Typography>
				{status ? <Chip size="small" color={STATUS_COLOR[status]} label={status} /> : null}
			</Box>

			<Divider />
			<Typography variant="subtitle2">Additives (optional)</Typography>
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						sm: "repeat(3, minmax(0, 1fr))",
						md: "repeat(4, minmax(0, 1fr))",
					},
				}}
			>
				{ADDITIVE_FIELDS.map((f) => (
					<TextField
						key={f.key}
						type="number"
						label={f.label}
						value={additives[f.key]}
						onChange={(e) =>
							setAdditives((prev) => ({ ...prev, [f.key]: e.target.value }))
						}
						size="small"
						inputProps={{ step: "any", min: 0 }}
					/>
				))}
				<TextField
					type="number"
					label="Spreader Rolls Made"
					value={rollsMade}
					onChange={(e) => setRollsMade(e.target.value)}
					size="small"
					inputProps={{ step: 1, min: 0 }}
				/>
				<TextField
					label="Others"
					value={others}
					onChange={(e) => setOthers(e.target.value)}
					size="small"
				/>
				<TextField
					label="Prepared By"
					value={preparedBy}
					onChange={(e) => setPreparedBy(e.target.value)}
					size="small"
				/>
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
					startIcon={<AddIcon size={18} />}
					onClick={handleSave}
					disabled={formInvalid || saving}
					sx={{ minHeight: 44, width: { xs: "100%", md: "auto" } }}
				>
					{saving ? "Saving…" : "Save Recipe"}
				</Button>
			</Box>

			<Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)} message={snack ?? ""} />
		</Box>
	);
}
