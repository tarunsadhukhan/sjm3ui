"use client";

import * as React from "react";
import {
	Box,
	CircularProgress,
	IconButton,
	Paper,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Tooltip,
	Typography,
} from "@mui/material";
import { Trash2 as DeleteIcon } from "lucide-react";
import { bagTypeLabelOf, fmt, type BagCheckAggCol, type BagCheckBlock } from "../types";

type Props = {
	blocks: BagCheckBlock[];
	loading: boolean;
	onDelete: (bagCheckId: number) => void;
};

const AGG_COLS: { key: BagCheckAggCol; label: string }[] = [
	{ key: "length_cm", label: "Len (cm)" },
	{ key: "width_cm", label: "Wid (cm)" },
	{ key: "ends_dm", label: "Ends/dm" },
	{ key: "picks_dm", label: "Picks/dm" },
	{ key: "mr_pct", label: "MR %" },
	{ key: "bag_wt_gm", label: "Wt (gm)" },
	{ key: "stitch_dm", label: "Stitch/dm" },
	{ key: "corr_wt_gm", label: "Corr wt (gm)" },
];

const STAT_ROWS = [
	{ key: "avg", label: "Avg" },
	{ key: "stdev", label: "Std Dev" },
	{ key: "cv_pct", label: "CV %" },
	{ key: "min", label: "Min" },
	{ key: "max", label: "Max" },
] as const;

export default function BagCheckByDate({ blocks, loading, onDelete }: Props) {
	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
				<CircularProgress size={28} />
			</Box>
		);
	}

	if (blocks.length === 0) {
		return (
			<Typography variant="body2" color="text.secondary">
				No bag-checking blocks for this date.
			</Typography>
		);
	}

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{blocks.map((block) => (
				<Paper key={block.bag_check_id} variant="outlined" sx={{ p: 2 }}>
					{/* Header */}
					<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 0.5 }}>
						<Typography variant="subtitle2">{bagTypeLabelOf(block)}</Typography>
						{block.vendor_name ? (
							<Typography variant="caption" color="text.secondary">
								Vendor: {block.vendor_name}
							</Typography>
						) : null}
						{block.id_code ? (
							<Typography variant="caption" color="text.secondary">
								ID: {block.id_code}
							</Typography>
						) : null}
						<Box sx={{ flexGrow: 1 }} />
						<Tooltip title="Delete block">
							<IconButton size="small" color="error" onClick={() => onDelete(block.bag_check_id)}>
								<DeleteIcon size={16} />
							</IconButton>
						</Tooltip>
					</Box>
					<Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
						Standards — wt: {fmt(block.std_bag_weight, 0)} gm · len: {fmt(block.std_length, 1)} ·
						wid: {fmt(block.std_width, 1)} · ends: {fmt(block.std_ends, 1)} · picks:{" "}
						{fmt(block.std_picks, 1)} · stitch: {fmt(block.std_stitch, 1)} · MR:{" "}
						{fmt(block.std_mr_pct, 1)}%
					</Typography>

					{/* Per-bag rows */}
					<Box sx={{ width: "100%", overflowX: "auto", mb: 1 }}>
						<TableContainer sx={{ minWidth: 760 }}>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell>Sl</TableCell>
										{AGG_COLS.map((c) => (
											<TableCell key={c.key} align="right">
												{c.label}
											</TableCell>
										))}
										<TableCell>Defects</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{(block.bags ?? []).map((bag, i) => (
										<TableRow key={i}>
											<TableCell>{bag.sl_no ?? i + 1}</TableCell>
											{AGG_COLS.map((c) => (
												<TableCell key={c.key} align="right">
													{fmt(bag[c.key])}
												</TableCell>
											))}
											<TableCell>{bag.defects ?? "—"}</TableCell>
										</TableRow>
									))}
									{/* Per-column aggregates (server-computed) */}
									{STAT_ROWS.map((stat) => (
										<TableRow key={stat.key}>
											<TableCell sx={{ fontWeight: 600 }}>{stat.label}</TableCell>
											{AGG_COLS.map((c) => (
												<TableCell key={c.key} align="right" sx={{ fontWeight: 600 }}>
													{fmt(block.aggregates?.[c.key]?.[stat.key])}
												</TableCell>
											))}
											<TableCell />
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					</Box>

					<Typography variant="body2">
						<strong>Obs HY/LT:</strong> {fmt(block.obs_hy_lt_pct)}% ·{" "}
						<strong>Corr HY/LT:</strong> {fmt(block.corr_hy_lt_pct)}%{" "}
						<Typography component="span" variant="caption" color="text.secondary">
							(+heavy / −light vs std bag weight)
						</Typography>
					</Typography>
				</Paper>
			))}
		</Box>
	);
}
