"use client";

import * as React from "react";
import {
	Box,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";
import type { BagWeightBlock } from "../types";

/** Column set of the paper R-08-23 sheet, in sheet order. */
export const SHEET_COLUMNS = [
	{ key: "length", label: "Length" },
	{ key: "width", label: "Width" },
	{ key: "ends", label: "Ends" },
	{ key: "picks", label: "Picks" },
	{ key: "stitch", label: "Stitch" },
	{ key: "obs", label: "Bag Wt." },
	{ key: "mr", label: "M.R." },
] as const;

export function fmt(value: number | null | undefined, digits = 2): string {
	return value != null && Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : "—";
}

/** "(+1.22% HY)" / "(−5.31% LT)" — the sheet's heavy/light annotation. */
export function hyLt(pct: number | null | undefined): string {
	if (pct == null || !Number.isFinite(Number(pct))) return "";
	const n = Number(pct);
	return `(${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(2)}% ${n >= 0 ? "HY" : "LT"})`;
}

export function bagTypeLabelOf(row: {
	item_name?: string | null;
	item_code?: string | null;
	bag_type_label?: string | null;
}): string {
	return row.bag_type_label ?? row.item_name ?? row.item_code ?? "—";
}

/** "94 cm × 57 cm — 580 gm/Bag" from whichever parts were entered. */
export function specLine(block: {
	std_length_cm?: number | null;
	std_width_cm?: number | null;
	std_bag_weight?: number | null;
}): string {
	const size =
		block.std_length_cm != null && block.std_width_cm != null
			? `${fmt(block.std_length_cm, 0)} cm × ${fmt(block.std_width_cm, 0)} cm`
			: null;
	const wt = block.std_bag_weight != null ? `${fmt(block.std_bag_weight, 0)} gm/Bag` : null;
	return [size, wt].filter(Boolean).join(" — ");
}

function SummaryLine({ label, value, note }: { label: string; value: string; note?: string }) {
	return (
		<Typography variant="body2" sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
			<Box component="span" sx={{ color: "text.secondary" }}>
				{label}
			</Box>
			<Box component="span" sx={{ fontWeight: 600 }}>
				{value}
			</Box>
			{note ? (
				<Box component="span" sx={{ color: "text.secondary" }}>
					{note}
				</Box>
			) : null}
		</Typography>
	);
}

export type BagWeightStats = {
	avg_mr: number | null;
	avg_obs: number | null;
	avg_corr: number | null;
	obs_stdev: number | null;
	obs_cv_pct: number | null;
	obs_hy_lt_pct: number | null;
	corr_hy_lt_pct: number | null;
	above_wt_gm: number | null;
	above_pct: number | null;
};

/** The sheet's closing block — same lines whether the numbers are a live preview or saved. */
export function BagWeightSummary({ stats }: { stats: BagWeightStats }) {
	return (
		<Box
			sx={{
				display: "grid",
				gap: 0.75,
				gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
			}}
		>
			<SummaryLine
				label="Actual Bag Wt. ="
				value={`${fmt(stats.avg_obs)} gm`}
				note={hyLt(stats.obs_hy_lt_pct)}
			/>
			<SummaryLine label="Actual M.R. =" value={`${fmt(stats.avg_mr)} %`} />
			<SummaryLine
				label="Correct Bag Wt. ="
				value={`${fmt(stats.avg_corr)} gm`}
				note={hyLt(stats.corr_hy_lt_pct)}
			/>
			{stats.above_wt_gm != null ? (
				<SummaryLine
					label={`Above ${fmt(stats.above_wt_gm, 0)} gm =`}
					value={`${fmt(stats.above_pct)} %`}
				/>
			) : null}
			<SummaryLine label="Std. dev. =" value={fmt(stats.obs_stdev, 3)} />
			<SummaryLine label="C.V. =" value={`${fmt(stats.obs_cv_pct)} %`} />
		</Box>
	);
}

type Props = {
	block: BagWeightBlock;
	entryDate?: string;
	actions?: React.ReactNode;
};

/**
 * Read-only render of one saved bag-weight block in the paper-sheet layout: spec header,
 * one row per inspected bag, an averages footer row, then the summary lines. Scrolls
 * horizontally on small screens rather than reflowing — the sheet format is the point.
 */
export default function BagWeightSheet({ block, entryDate, actions }: Props) {
	const readings = block.readings ?? [];

	return (
		<Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
			<Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
				<Box sx={{ minWidth: 0 }}>
					<Typography variant="subtitle2">{specLine(block)}</Typography>
					<Typography variant="body2" color="text.secondary">
						{bagTypeLabelOf(block)}
					</Typography>
					<Typography variant="caption" color="text.secondary">
						Std M.R. {fmt(block.std_mr_pct, 2)}%
						{entryDate ? ` · Date ${entryDate}` : ""}
					</Typography>
				</Box>
				<Box sx={{ flexGrow: 1 }} />
				{actions}
			</Box>

			<TableContainer sx={{ overflowX: "auto" }}>
				<Table size="small" sx={{ minWidth: 760, "& td, & th": { whiteSpace: "nowrap" } }}>
					<TableHead>
						<TableRow>
							<TableCell sx={{ fontWeight: 600 }}>Sl. No.</TableCell>
							{SHEET_COLUMNS.map((c) => (
								<TableCell key={c.key} align="right" sx={{ fontWeight: 600 }}>
									{c.label}
								</TableCell>
							))}
							<TableCell align="right" sx={{ fontWeight: 600 }}>
								Corrd. Wt.
							</TableCell>
							<TableCell sx={{ fontWeight: 600 }}>Remarks</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{readings.map((r, i) => (
							<TableRow key={i}>
								<TableCell>{i + 1}</TableCell>
								<TableCell align="right">{fmt(r.length, 0)}</TableCell>
								<TableCell align="right">{fmt(r.width, 0)}</TableCell>
								<TableCell align="right">{fmt(r.ends, 0)}</TableCell>
								<TableCell align="right">{fmt(r.picks, 0)}</TableCell>
								<TableCell align="right">{fmt(r.stitch, 0)}</TableCell>
								<TableCell align="right">{fmt(r.obs, 0)}</TableCell>
								<TableCell align="right">{fmt(r.mr, 2)}</TableCell>
								<TableCell align="right">{fmt(r.corr, 0)}</TableCell>
								<TableCell sx={{ whiteSpace: "normal !important" }}>
									{r.remarks ?? ""}
								</TableCell>
							</TableRow>
						))}
						<TableRow>
							<TableCell colSpan={6} align="right" sx={{ fontWeight: 600 }}>
								Average
							</TableCell>
							<TableCell align="right" sx={{ fontWeight: 600 }}>
								{fmt(block.avg_obs)}
							</TableCell>
							<TableCell align="right" sx={{ fontWeight: 600 }}>
								{fmt(block.avg_mr)}%
							</TableCell>
							<TableCell align="right" sx={{ fontWeight: 600 }}>
								{fmt(block.avg_corr)}
							</TableCell>
							<TableCell />
						</TableRow>
					</TableBody>
				</Table>
			</TableContainer>

			<Box sx={{ mt: 2 }}>
				<BagWeightSummary stats={block} />
			</Box>
		</Paper>
	);
}
