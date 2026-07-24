"use client";

import * as React from "react";
import {
	Alert,
	Box,
	Chip,
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
import type { WidthPicksBlock } from "../types";

type Props = {
	blocks: WidthPicksBlock[];
	loading: boolean;
	onDelete: (id: number) => void;
};

function fmt(value: number | null | undefined, digits = 2): string {
	return value != null ? Number(value).toFixed(digits) : "—";
}

export default function WidthPicksByDate({ blocks, loading, onDelete }: Props) {
	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (blocks.length === 0) {
		return <Alert severity="info">No Width & Picks entries for this date.</Alert>;
	}

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
			{blocks.map((block) => (
				<Paper key={block.width_picks_id} variant="outlined" sx={{ p: 2 }}>
					<Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
						<Box>
							<Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
								{block.item_name ?? block.item_code ?? `Item #${block.item_id}`}
							</Typography>
							<Typography variant="caption" color="text.secondary">
								Std Width {fmt(block.std_width_cm)} cm · Std Picks {fmt(block.std_picks)}
								{block.inspector_name ? ` · Inspector: ${block.inspector_name}` : ""}
							</Typography>
						</Box>
						<Tooltip title="Delete group">
							<IconButton
								size="small"
								color="error"
								onClick={() => onDelete(block.width_picks_id)}
								sx={{ minWidth: 40, minHeight: 40 }}
							>
								<DeleteIcon size={16} />
							</IconButton>
						</Tooltip>
					</Box>

					<TableContainer sx={{ my: 1, overflowX: "auto" }}>
						<Table size="small">
							<TableHead>
								<TableRow>
									<TableCell>Loom</TableCell>
									<TableCell align="right">Width (cm)</TableCell>
									<TableCell align="right">Picks/dm</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{block.rows.map((r, i) => (
									<TableRow key={`${r.loom_id}-${i}`}>
										<TableCell>
											{r.mech_code ?? r.loom_name ?? (r.loom_id != null ? `Loom #${r.loom_id}` : "—")}
										</TableCell>
										<TableCell align="right">{fmt(r.width_cm)}</TableCell>
										<TableCell align="right">{fmt(r.picks_dm)}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>

					{/* Server-computed summaries */}
					<Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}>
						<Typography variant="body2">
							<strong>Width:</strong> avg {fmt(block.width_summary.avg_width)} cm · tolerance{" "}
							{fmt(block.width_summary.tol_low)}–{fmt(block.width_summary.tol_high)} cm
						</Typography>
						{block.width_summary.remark === "$" ? (
							<Chip label="Out of tolerance ($)" size="small" color="error" variant="filled" />
						) : (
							<Chip label="Within tolerance" size="small" color="success" variant="outlined" />
						)}
					</Box>
					<Typography variant="body2" sx={{ mt: 0.5 }}>
						<strong>Picks:</strong> avg {fmt(block.picks_summary.avg_picks)} · st.dev{" "}
						{fmt(block.picks_summary.stdev, 4)} · max {fmt(block.picks_summary.max_picks)} · min{" "}
						{fmt(block.picks_summary.min_picks)} · checked {block.picks_summary.pick_count}
					</Typography>
				</Paper>
			))}
		</Box>
	);
}
