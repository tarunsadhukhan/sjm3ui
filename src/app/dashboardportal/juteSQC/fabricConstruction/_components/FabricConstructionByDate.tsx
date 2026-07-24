"use client";

import * as React from "react";
import {
	Alert,
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
import type { FabricConstructionBlock, FabricConstructionSample } from "../types";

type Props = {
	blocks: FabricConstructionBlock[];
	loading: boolean;
	onDelete: (id: number) => void;
};

const SAMPLE_COLS: { key: keyof FabricConstructionSample; label: string }[] = [
	{ key: "length_yds", label: "Length (yds)" },
	{ key: "width_cms", label: "Width (cms)" },
	{ key: "ends_per_dm", label: "Ends/dm" },
	{ key: "picks_per_dm", label: "Picks/dm" },
	{ key: "mr_pct", label: "MR %" },
	{ key: "obs_wt_kg", label: "Obs Wt (kg)" },
	{ key: "obs_ozs", label: "Oz/yd" },
	{ key: "crcted_oz", label: "Corrected Oz" },
];

const DIMENSION_LABELS: Record<string, string> = {
	length_yds: "Length (yds)",
	width_cms: "Width (cms)",
	ends_per_dm: "Ends/dm",
	picks_per_dm: "Picks/dm",
	mr_pct: "MR %",
	obs_ozs: "Oz per yd",
};

function fmt(value: number | null | undefined, digits = 3): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

export default function FabricConstructionByDate({ blocks, loading, onDelete }: Props) {
	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (blocks.length === 0) {
		return <Alert severity="info">No Fabric Construction entries for this date.</Alert>;
	}

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{blocks.map((block) => (
				<Paper key={block.fabric_const_id} variant="outlined" sx={{ p: 2 }}>
					<Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
						<Box>
							<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
								{block.item_name ?? block.item_code ?? `Item #${block.item_id}`}
								{block.quality_text ? ` — ${block.quality_text}` : ""}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Std — Length {fmt(block.std_length_yds, 2)} yds · Width {fmt(block.std_width_cms, 2)} cms
								{" · "}Ends {fmt(block.std_ends_dm, 2)}/dm · Picks {fmt(block.std_picks_dm, 2)}/dm
								{" · "}MR {fmt(block.std_mr_pct, 2)}% · {fmt(block.std_oz_per_yd, 2)} oz/yd
							</Typography>
						</Box>
						<Tooltip title="Delete block">
							<IconButton
								size="small"
								color="error"
								onClick={() => onDelete(block.fabric_const_id)}
								sx={{ minWidth: 40, minHeight: 40 }}
							>
								<DeleteIcon size={16} />
							</IconButton>
						</Tooltip>
					</Box>

					{/* Sample rows + per-column averages */}
					<TableContainer sx={{ my: 1, overflowX: "auto" }}>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Sl</TableCell>
									{SAMPLE_COLS.map((c) => (
										<TableCell key={c.key} align="right">
											{c.label}
										</TableCell>
									))}
								</TableRow>
							</TableHead>
							<TableBody>
								{block.rows.map((s) => (
									<TableRow key={s.sl}>
										<TableCell>{s.sl}</TableCell>
										{SAMPLE_COLS.map((c) => (
											<TableCell key={c.key} align="right">
												{fmt(s[c.key] as number | null)}
											</TableCell>
										))}
									</TableRow>
								))}
								<TableRow>
									<TableCell sx={{ fontWeight: 600 }}>Avg</TableCell>
									{SAMPLE_COLS.map((c) => (
										<TableCell key={c.key} align="right" sx={{ fontWeight: 600 }}>
											{fmt(block.averages[c.key as keyof typeof block.averages])}
										</TableCell>
									))}
								</TableRow>
							</TableBody>
						</Table>
					</TableContainer>

					{/* Std vs Actual comparison (server-computed) */}
					<Typography variant="subtitle2" sx={{ mt: 1 }}>
						Std vs Actual
					</Typography>
					<TableContainer sx={{ mt: 0.5, overflowX: "auto" }}>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Dimension</TableCell>
									<TableCell align="right">Std</TableCell>
									<TableCell align="right">Actual (avg)</TableCell>
									<TableCell align="right">Deviation</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{block.comparison.map((c) => (
									<TableRow key={c.dimension}>
										<TableCell>{DIMENSION_LABELS[c.dimension] ?? c.dimension}</TableCell>
										<TableCell align="right">{fmt(c.std)}</TableCell>
										<TableCell align="right">{fmt(c.actual)}</TableCell>
										<TableCell align="right">{fmt(c.deviation)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</Paper>
			))}
		</Box>
	);
}
