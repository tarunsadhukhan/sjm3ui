"use client";

import * as React from "react";
import {
	Alert,
	Autocomplete,
	Box,
	Button,
	Divider,
	IconButton,
	Paper,
	Snackbar,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import { Plus as AddIcon, Save as SaveIcon, X as RemoveIcon } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { sampleStdDev } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import type { BagWeightSetup } from "../types";
import { BagWeightSummary, SHEET_COLUMNS, fmt } from "./BagWeightSheet";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: BagWeightSetup;
	onSaved: () => void;
};

/** Every cell is a free-text box; values are parsed on save (blank = not measured). */
type RowInput = Record<(typeof SHEET_COLUMNS)[number]["key"], string> & { remarks: string };

/** A row that carries the two fields every stat needs; the rest ride along as recorded. */
type CompleteRow = {
	mr: number;
	obs: number;
	length: number | null;
	width: number | null;
	ends: number | null;
	picks: number | null;
	stitch: number | null;
	remarks: string | null;
};

/** The paper sheet is punched 20 bags at a time. */
const START_ROWS = 20;

const blankRow = (): RowInput => ({
	length: "",
	width: "",
	ends: "",
	picks: "",
	stitch: "",
	obs: "",
	mr: "",
	remarks: "",
});

const emptyRows = (): RowInput[] => Array.from({ length: START_ROWS }, blankRow);

/** "" / garbage -> null, so blank optional cells are simply not recorded. */
function num(value: string): number | null {
	const trimmed = value.trim();
	if (trimmed === "") return null;
	const n = Number(trimmed);
	return Number.isFinite(n) ? n : null;
}

/** MR-corrected weight: obs × (100 + std MR%) / (100 + row MR%). Mirrors the server. */
function rowCorr(obs: number, mr: number, stdMr: number): number {
	return (obs * (100 + stdMr)) / (100 + mr);
}

export default function BagWeightForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [itemId, setItemId] = React.useState<number | "">("");
	const [bagTypeLabel, setBagTypeLabel] = React.useState("");
	const [stdLength, setStdLength] = React.useState("");
	const [stdWidth, setStdWidth] = React.useState("");
	const [stdBagWeight, setStdBagWeight] = React.useState("");
	const [stdMrPct, setStdMrPct] = React.useState(String(setup.default_std_mr_pct));
	const [aboveWtGm, setAboveWtGm] = React.useState("");
	const [rows, setRows] = React.useState<RowInput[]>(emptyRows);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const setRow = (i: number, field: keyof RowInput, value: string) =>
		setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

	const addRow = () =>
		setRows((prev) => (prev.length < setup.max_rows ? [...prev, blankRow()] : prev));

	const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

	// Rows the operator actually touched (any cell non-empty).
	const filledRows = React.useMemo(
		() => rows.filter((r) => Object.values(r).some((v) => v.trim() !== "")),
		[rows]
	);

	const stdMrNum = num(stdMrPct);
	const stdWtNum = num(stdBagWeight);
	const aboveNum = num(aboveWtGm);

	// Live preview — the server recomputes all block stats at save and is authoritative.
	const completeRows = React.useMemo<CompleteRow[]>(() => {
		const out: CompleteRow[] = [];
		for (const r of filledRows) {
			const mr = num(r.mr);
			const obs = num(r.obs);
			if (mr == null || mr <= 0 || obs == null || obs <= 0) continue;
			out.push({
				mr,
				obs,
				length: num(r.length),
				width: num(r.width),
				ends: num(r.ends),
				picks: num(r.picks),
				stitch: num(r.stitch),
				remarks: r.remarks.trim() || null,
			});
		}
		return out;
	}, [filledRows]);
	const n = completeRows.length;
	const avgMr = n > 0 ? completeRows.reduce((a, r) => a + r.mr, 0) / n : null;
	const avgObs = n > 0 ? completeRows.reduce((a, r) => a + r.obs, 0) / n : null;
	const corrs = React.useMemo(
		() => (stdMrNum != null ? completeRows.map((r) => rowCorr(r.obs, r.mr, stdMrNum)) : []),
		[completeRows, stdMrNum]
	);
	const avgCorr = corrs.length > 0 ? corrs.reduce((a, c) => a + c, 0) / corrs.length : null;
	const obsStdev = sampleStdDev(completeRows.map((r) => r.obs));
	const obsCv = obsStdev != null && avgObs != null && avgObs > 0 ? (obsStdev / avgObs) * 100 : null;
	const obsHyLt =
		avgObs != null && stdWtNum != null && stdWtNum > 0
			? ((avgObs - stdWtNum) / stdWtNum) * 100
			: null;
	const corrHyLt =
		avgCorr != null && stdWtNum != null && stdWtNum > 0
			? ((avgCorr - stdWtNum) / stdWtNum) * 100
			: null;
	// Sheet's "Above 585 gm = …%": share of CORRECTED weights strictly above the threshold,
	// compared as displayed (whole gm) so it agrees with the Corrd. Wt. column.
	const abovePct =
		aboveNum != null && aboveNum > 0 && corrs.length > 0
			? (corrs.filter((c) => Math.round(c) > aboveNum).length / corrs.length) * 100
			: null;

	const handleSave = async () => {
		if (stdWtNum == null || stdWtNum <= 0) {
			setError("Std bag weight must be a positive number.");
			return;
		}
		if (stdMrNum == null || stdMrNum <= 0) {
			setError("Std MR% must be a positive number.");
			return;
		}
		if (filledRows.length === 0) {
			setError("Enter at least one bag row (bag weight + MR%).");
			return;
		}
		if (filledRows.length !== completeRows.length) {
			setError("Every filled row needs both bag weight and MR% as positive numbers.");
			return;
		}
		setSaving(true);
		setError(null);
		const { error: err } = await fetchWithCookie<{ message: string; bag_weight_id: number }>(
			apiRoutesPortalMasters.BAG_WEIGHT_CREATE,
			"POST",
			{
				co_id: Number(coId),
				branch_id: branchId,
				entry_date: entryDate,
				item_id: itemId === "" ? null : Number(itemId),
				bag_type_label: bagTypeLabel || null,
				std_length_cm: num(stdLength),
				std_width_cm: num(stdWidth),
				std_bag_weight: stdWtNum,
				std_mr_pct: stdMrNum,
				above_wt_gm: aboveNum,
				readings: completeRows,
			}
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Bag weight sheet saved.");
		// Keep bag type + standards so the inspector can punch many sheets quickly.
		setRows(emptyRows());
		onSaved();
	};

	return (
		<Paper
			variant="outlined"
			sx={{ p: { xs: 1.5, md: 2 }, display: "flex", flexDirection: "column", gap: 2 }}
		>
			<Typography variant="subtitle2">New bag-weight sheet</Typography>

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
					options={setup.bag_types}
					getOptionLabel={(b) => `${b.item_name ?? ""} (${b.item_code ?? ""})`}
					value={setup.bag_types.find((b) => b.item_id === itemId) ?? null}
					onChange={(_, val) => {
						setItemId(val ? val.item_id : "");
						setBagTypeLabel(val?.item_name ?? "");
					}}
					size="small"
					renderInput={(params) => <TextField {...params} label="Bag type (optional)" />}
					isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
				/>
				<TextField
					label="Description / quality"
					placeholder="B.Twill Bags Branded (C.G.) HD/H.S."
					value={bagTypeLabel}
					onChange={(e) => setBagTypeLabel(e.target.value)}
					size="small"
					fullWidth
				/>
				<TextField
					label="Length (cm)"
					value={stdLength}
					onChange={(e) => setStdLength(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ inputMode: "decimal" }}
				/>
				<TextField
					label="Width (cm)"
					value={stdWidth}
					onChange={(e) => setStdWidth(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ inputMode: "decimal" }}
				/>
				<TextField
					label="Std bag weight (gm)"
					value={stdBagWeight}
					onChange={(e) => setStdBagWeight(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ inputMode: "decimal" }}
				/>
				<TextField
					label="Std M.R. %"
					value={stdMrPct}
					onChange={(e) => setStdMrPct(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ inputMode: "decimal" }}
				/>
				<TextField
					label="Above (gm)"
					value={aboveWtGm}
					onChange={(e) => setAboveWtGm(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ inputMode: "decimal" }}
					helperText="% of corrected wt. above this"
				/>
			</Box>

			<Divider />

			{/* Paper-sheet column order; scrolls sideways on phones rather than reflowing. */}
			<TableContainer sx={{ overflowX: "auto" }}>
				<Table
					size="small"
					sx={{
						minWidth: 900,
						"& td, & th": { px: 0.5, whiteSpace: "nowrap" },
						"& .MuiInputBase-input": { px: 1, py: 0.75 },
					}}
				>
					<TableHead>
						<TableRow>
							<TableCell sx={{ width: 48, fontWeight: 600 }}>Sl.</TableCell>
							{SHEET_COLUMNS.map((c) => (
								<TableCell key={c.key} sx={{ width: 92, fontWeight: 600 }}>
									{c.label}
								</TableCell>
							))}
							<TableCell align="right" sx={{ width: 92, fontWeight: 600 }}>
								Corrd. Wt.
							</TableCell>
							<TableCell sx={{ minWidth: 160, fontWeight: 600 }}>Remarks</TableCell>
							<TableCell sx={{ width: 44 }} />
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((r, i) => {
							const mr = num(r.mr);
							const obs = num(r.obs);
							const corr =
								mr != null && mr > 0 && obs != null && obs > 0 && stdMrNum != null
									? rowCorr(obs, mr, stdMrNum)
									: null;
							return (
								<TableRow key={i}>
									<TableCell>{i + 1}</TableCell>
									{SHEET_COLUMNS.map((c) => (
										<TableCell key={c.key}>
											<TextField
												value={r[c.key]}
												onChange={(e) => setRow(i, c.key, e.target.value)}
												size="small"
												fullWidth
												inputProps={{ inputMode: "decimal", "aria-label": `${c.label} row ${i + 1}` }}
											/>
										</TableCell>
									))}
									<TableCell align="right">{fmt(corr, 0)}</TableCell>
									<TableCell>
										<TextField
											value={r.remarks}
											onChange={(e) => setRow(i, "remarks", e.target.value)}
											size="small"
											fullWidth
											inputProps={{ maxLength: 40, "aria-label": `Remarks row ${i + 1}` }}
										/>
									</TableCell>
									<TableCell>
										<Tooltip title="Remove row">
											<IconButton size="small" onClick={() => removeRow(i)}>
												<RemoveIcon size={14} />
											</IconButton>
										</Tooltip>
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</TableContainer>
			<Box>
				<Button
					size="small"
					startIcon={<AddIcon size={16} />}
					onClick={addRow}
					disabled={rows.length >= setup.max_rows}
				>
					Add row ({rows.length}/{setup.max_rows})
				</Button>
			</Box>

			<Divider />

			{/* Live preview — server recomputes on save and is authoritative. */}
			<BagWeightSummary
				stats={{
					avg_mr: avgMr,
					avg_obs: avgObs,
					avg_corr: avgCorr,
					obs_stdev: obsStdev,
					obs_cv_pct: obsCv,
					obs_hy_lt_pct: obsHyLt,
					corr_hy_lt_pct: corrHyLt,
					above_wt_gm: aboveNum,
					above_pct: abovePct,
				}}
			/>

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
		</Paper>
	);
}
