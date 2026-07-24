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
import { fmt, type BagCheckSetup } from "../types";

type Props = {
	coId: string;
	branchId: number;
	entryDate: string;
	setup: BagCheckSetup;
	onSaved: () => void;
};

// The 7 per-bag MEASURED inputs — all required and > 0 at save (server rule).
const MEASURES = [
	{ key: "length_cm", label: "Len (cm)" },
	{ key: "width_cm", label: "Wid (cm)" },
	{ key: "ends_dm", label: "Ends/dm" },
	{ key: "picks_dm", label: "Picks/dm" },
	{ key: "mr_pct", label: "MR %" },
	{ key: "bag_wt_gm", label: "Wt (gm)" },
	{ key: "stitch_dm", label: "Stitch/dm" },
] as const;
type MeasureKey = (typeof MEASURES)[number]["key"];

// The 7 per-quality STANDARDS snapshotted on the header — all required and > 0.
const STD_FIELDS = [
	{ key: "std_bag_weight", label: "Std bag wt (gm)" },
	{ key: "std_length", label: "Std length (cm)" },
	{ key: "std_width", label: "Std width (cm)" },
	{ key: "std_ends", label: "Std ends/dm" },
	{ key: "std_picks", label: "Std picks/dm" },
	{ key: "std_stitch", label: "Std stitch/dm" },
	{ key: "std_mr_pct", label: "Std MR %" },
] as const;
type StdKey = (typeof STD_FIELDS)[number]["key"];

type BagInput = Record<MeasureKey, string> & { defects: string };

const START_BAGS = 3;

const emptyBag = (): BagInput => ({
	length_cm: "",
	width_cm: "",
	ends_dm: "",
	picks_dm: "",
	mr_pct: "",
	bag_wt_gm: "",
	stitch_dm: "",
	defects: "",
});

const emptyBags = (): BagInput[] => Array.from({ length: START_BAGS }, emptyBag);

/** MR-corrected bag weight: wt × (100 + std MR%) / (100 + bag MR%). Mirrors the server. */
function bagCorr(wt: number, mr: number, stdMr: number): number {
	return (wt * (100 + stdMr)) / (100 + mr);
}

export default function BagCheckForm({ coId, branchId, entryDate, setup, onSaved }: Props) {
	const [itemId, setItemId] = React.useState<number | "">("");
	const [bagTypeLabel, setBagTypeLabel] = React.useState("");
	const [vendorName, setVendorName] = React.useState("");
	const [idCode, setIdCode] = React.useState("");
	const [stds, setStds] = React.useState<Record<StdKey, string>>({
		std_bag_weight: "",
		std_length: "",
		std_width: "",
		std_ends: "",
		std_picks: "",
		std_stitch: "",
		std_mr_pct: String(setup.default_std_mr_pct),
	});
	const [bags, setBags] = React.useState<BagInput[]>(emptyBags);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	const setStd = (key: StdKey, value: string) => setStds((prev) => ({ ...prev, [key]: value }));

	const setBag = (i: number, field: keyof BagInput, value: string) =>
		setBags((prev) => prev.map((b, idx) => (idx === i ? { ...b, [field]: value } : b)));

	const addBag = () => setBags((prev) => [...prev, emptyBag()]);

	const removeBag = (i: number) => setBags((prev) => prev.filter((_, idx) => idx !== i));

	// Bags the operator actually touched (any measure or defects non-empty).
	const filledBags = React.useMemo(
		() => bags.filter((b) => MEASURES.some((m) => b[m.key] !== "") || b.defects !== ""),
		[bags]
	);

	const stdMrNum = stds.std_mr_pct === "" ? null : Number(stds.std_mr_pct);

	const bagIsComplete = (b: BagInput): boolean =>
		MEASURES.every((m) => {
			const n = Number(b[m.key]);
			return b[m.key] !== "" && Number.isFinite(n) && n > 0;
		});

	const handleSave = async () => {
		for (const f of STD_FIELDS) {
			const n = Number(stds[f.key]);
			if (stds[f.key] === "" || !Number.isFinite(n) || n <= 0) {
				setError(`${f.label} must be a positive number.`);
				return;
			}
		}
		if (filledBags.length === 0) {
			setError("Enter at least one bag row.");
			return;
		}
		if (!filledBags.every(bagIsComplete)) {
			setError("Every bag row needs all 7 measurements as positive numbers.");
			return;
		}
		setSaving(true);
		setError(null);
		const { error: err } = await fetchWithCookie<{ message: string; bag_check_id: number }>(
			apiRoutesPortalMasters.BAG_CHECK_CREATE,
			"POST",
			{
				co_id: Number(coId),
				branch_id: branchId,
				entry_date: entryDate,
				item_id: itemId === "" ? null : Number(itemId),
				bag_type_label: bagTypeLabel || null,
				vendor_name: vendorName || null,
				id_code: idCode || null,
				std_bag_weight: Number(stds.std_bag_weight),
				std_length: Number(stds.std_length),
				std_width: Number(stds.std_width),
				std_ends: Number(stds.std_ends),
				std_picks: Number(stds.std_picks),
				std_stitch: Number(stds.std_stitch),
				std_mr_pct: Number(stds.std_mr_pct),
				bags: filledBags.map((b) => ({
					length_cm: Number(b.length_cm),
					width_cm: Number(b.width_cm),
					ends_dm: Number(b.ends_dm),
					picks_dm: Number(b.picks_dm),
					mr_pct: Number(b.mr_pct),
					bag_wt_gm: Number(b.bag_wt_gm),
					stitch_dm: Number(b.stitch_dm),
					defects: b.defects || null,
				})),
			}
		);
		setSaving(false);
		if (err) {
			setError(err);
			return;
		}
		setSnack("Bag Checking block saved.");
		// Keep bag type / vendor / standards so the inspector can punch many blocks quickly.
		setBags(emptyBags());
		onSaved();
	};

	return (
		<Paper variant="outlined" sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
			<Typography variant="subtitle2">New bag-checking block</Typography>

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
					label="Vendor (optional)"
					value={vendorName}
					onChange={(e) => setVendorName(e.target.value)}
					size="small"
					fullWidth
				/>
				<TextField
					label="ID code (optional)"
					value={idCode}
					onChange={(e) => setIdCode(e.target.value)}
					size="small"
					fullWidth
				/>
			</Box>

			<Divider />

			<Typography variant="caption" color="text.secondary">
				Standards (snapshotted on save)
			</Typography>
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
				{STD_FIELDS.map((f) => (
					<TextField
						key={f.key}
						type="number"
						label={f.label}
						value={stds[f.key]}
						onChange={(e) => setStd(f.key, e.target.value)}
						size="small"
						fullWidth
						inputProps={{ step: "any", min: 0 }}
					/>
				))}
			</Box>

			<Divider />

			<Box sx={{ width: "100%", overflowX: "auto" }}>
				<TableContainer sx={{ minWidth: 900 }}>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell sx={{ width: 40 }}>Sl</TableCell>
								{MEASURES.map((m) => (
									<TableCell key={m.key}>{m.label}</TableCell>
								))}
								<TableCell align="right">Corr wt (gm)</TableCell>
								<TableCell>Defects</TableCell>
								<TableCell sx={{ width: 40 }} />
							</TableRow>
						</TableHead>
						<TableBody>
							{bags.map((b, i) => {
								const mr = Number(b.mr_pct);
								const wt = Number(b.bag_wt_gm);
								const corr =
									b.mr_pct !== "" && b.bag_wt_gm !== "" && stdMrNum != null && mr > 0 && wt > 0
										? bagCorr(wt, mr, stdMrNum)
										: null;
								return (
									<TableRow key={i}>
										<TableCell>{i + 1}</TableCell>
										{MEASURES.map((m) => (
											<TableCell key={m.key} sx={{ minWidth: 90 }}>
												<TextField
													type="number"
													value={b[m.key]}
													onChange={(e) => setBag(i, m.key, e.target.value)}
													size="small"
													fullWidth
													inputProps={{ step: "any", min: 0 }}
												/>
											</TableCell>
										))}
										<TableCell align="right">{fmt(corr)}</TableCell>
										<TableCell sx={{ minWidth: 140 }}>
											<TextField
												value={b.defects}
												onChange={(e) => setBag(i, "defects", e.target.value)}
												size="small"
												fullWidth
												placeholder="—"
											/>
										</TableCell>
										<TableCell>
											<Tooltip title="Remove bag">
												<IconButton size="small" onClick={() => removeBag(i)}>
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
			</Box>
			<Box>
				<Button size="small" startIcon={<AddIcon size={16} />} onClick={addBag}>
					Add bag ({bags.length})
				</Button>
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
