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

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: BagWeightSetup;
	onSaved: () => void;
};

type RowInput = { mr: string; obs: string };

const START_ROWS = 5;

const emptyRows = (): RowInput[] => Array.from({ length: START_ROWS }, () => ({ mr: "", obs: "" }));

function fmt(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

/** MR-corrected weight: obs × (100 + std MR%) / (100 + row MR%). Mirrors the server. */
function rowCorr(obs: number, mr: number, stdMr: number): number {
	return (obs * (100 + stdMr)) / (100 + mr);
}

export default function BagWeightForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [itemId, setItemId] = React.useState<number | "">("");
	const [bagTypeLabel, setBagTypeLabel] = React.useState("");
	const [stdBagWeight, setStdBagWeight] = React.useState("");
	const [stdMrPct, setStdMrPct] = React.useState(String(setup.default_std_mr_pct));
	const [rows, setRows] = React.useState<RowInput[]>(emptyRows);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const setRow = (i: number, field: keyof RowInput, value: string) =>
		setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

	const addRow = () =>
		setRows((prev) => (prev.length < setup.max_rows ? [...prev, { mr: "", obs: "" }] : prev));

	const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

	// Rows the operator actually touched (either field non-empty).
	const filledRows = React.useMemo(() => rows.filter((r) => r.mr !== "" || r.obs !== ""), [rows]);

	const stdMrNum = stdMrPct === "" ? null : Number(stdMrPct);
	const stdWtNum = stdBagWeight === "" ? null : Number(stdBagWeight);

	// Live preview — the server recomputes all block stats at save and is authoritative.
	const completeRows = React.useMemo(
		() =>
			filledRows
				.map((r) => ({ mr: Number(r.mr), obs: Number(r.obs) }))
				.filter((r) => Number.isFinite(r.mr) && r.mr > 0 && Number.isFinite(r.obs) && r.obs > 0),
		[filledRows]
	);
	const n = completeRows.length;
	const avgMr = n > 0 ? completeRows.reduce((a, r) => a + r.mr, 0) / n : null;
	const avgObs = n > 0 ? completeRows.reduce((a, r) => a + r.obs, 0) / n : null;
	const avgCorr =
		n > 0 && stdMrNum != null
			? completeRows.reduce((a, r) => a + rowCorr(r.obs, r.mr, stdMrNum), 0) / n
			: null;
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

	const handleSave = async () => {
		if (stdWtNum == null || !Number.isFinite(stdWtNum) || stdWtNum <= 0) {
			setError("Std bag weight must be a positive number.");
			return;
		}
		if (stdMrNum == null || !Number.isFinite(stdMrNum) || stdMrNum <= 0) {
			setError("Std MR% must be a positive number.");
			return;
		}
		if (filledRows.length === 0) {
			setError("Enter at least one reading row (MR% + observed weight).");
			return;
		}
		if (filledRows.length !== completeRows.length) {
			setError("Every filled row needs both MR% and observed weight as positive numbers.");
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
				std_bag_weight: stdWtNum,
				std_mr_pct: stdMrNum,
				readings: completeRows,
			}
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Bag weight block saved.");
		// Keep bag type + standards so the inspector can punch many blocks quickly.
		setRows(emptyRows());
		onSaved();
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="subtitle2">New bag-weight block</Typography>
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
					label="Bag type label"
					value={bagTypeLabel}
					onChange={(e) => setBagTypeLabel(e.target.value)}
					size="small"
					fullWidth
				/>
				<TextField
					type="number"
					label="Std bag weight (gm)"
					value={stdBagWeight}
					onChange={(e) => setStdBagWeight(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
				<TextField
					type="number"
					label="Std MR %"
					value={stdMrPct}
					onChange={(e) => setStdMrPct(e.target.value)}
					size="small"
					fullWidth
					inputProps={{ step: "any", min: 0 }}
				/>
			</Box>

			<Divider />

			<TableContainer sx={{ maxWidth: 640 }}>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell sx={{ width: 50 }}>Sl</TableCell>
							<TableCell>MR %</TableCell>
							<TableCell>Obs wt (gm)</TableCell>
							<TableCell align="right">Corr wt (gm)</TableCell>
							<TableCell sx={{ width: 50 }} />
						</TableRow>
					</TableHead>
					<TableBody>
						{rows.map((r, i) => {
							const mr = Number(r.mr);
							const obs = Number(r.obs);
							const corr =
								r.mr !== "" && r.obs !== "" && stdMrNum != null && mr > 0 && obs > 0
									? rowCorr(obs, mr, stdMrNum)
									: null;
							return (
								<TableRow key={i}>
									<TableCell>{i + 1}</TableCell>
									<TableCell>
										<TextField
											type="number"
											value={r.mr}
											onChange={(e) => setRow(i, "mr", e.target.value)}
											size="small"
											fullWidth
											inputProps={{ step: "any", min: 0 }}
										/>
									</TableCell>
									<TableCell>
										<TextField
											type="number"
											value={r.obs}
											onChange={(e) => setRow(i, "obs", e.target.value)}
											size="small"
											fullWidth
											inputProps={{ step: "any", min: 0 }}
										/>
									</TableCell>
									<TableCell align="right">{fmt(corr)}</TableCell>
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
			<Box
				sx={{
					display: "grid",
					gap: 2,
					gridTemplateColumns: {
						xs: "repeat(2, minmax(0, 1fr))",
						sm: "repeat(4, minmax(0, 1fr))",
						md: "repeat(7, minmax(0, 1fr))",
					},
				}}
			>
				<TextField label="Avg MR %" value={fmt(avgMr)} size="small" InputProps={{ readOnly: true }} />
				<TextField label="Avg obs wt" value={fmt(avgObs)} size="small" InputProps={{ readOnly: true }} />
				<TextField label="Avg corr wt" value={fmt(avgCorr)} size="small" InputProps={{ readOnly: true }} />
				<TextField label="Obs std dev" value={fmt(obsStdev, 3)} size="small" InputProps={{ readOnly: true }} />
				<TextField label="Obs CV %" value={fmt(obsCv)} size="small" InputProps={{ readOnly: true }} />
				<TextField
					label="Obs HY/LT %"
					value={fmt(obsHyLt)}
					size="small"
					InputProps={{ readOnly: true }}
					helperText="+heavy / −light"
				/>
				<TextField
					label="Corr HY/LT %"
					value={fmt(corrHyLt)}
					size="small"
					InputProps={{ readOnly: true }}
					helperText="+heavy / −light"
				/>
			</Box>

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
