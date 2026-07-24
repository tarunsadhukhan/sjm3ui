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
import type { FabricFaultByDateData, FabricFaultPiece } from "../types";

type Props = {
	data: FabricFaultByDateData | null;
	loading: boolean;
	onDelete: (id: number) => void;
};

function pieceLabel(p: FabricFaultPiece): string {
	return p.mech_code ?? p.loom_name ?? `#${p.fabric_fault_id}`;
}

function fmtScore(value: number | null | undefined): string {
	return value != null ? Number(value).toFixed(4) : "—";
}

export default function FabricFaultByDate({ data, loading, onDelete }: Props) {
	if (loading) {
		return (
			<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (!data || data.pieces.length === 0) {
		return <Alert severity="info">No Fabric Fault pieces for this date.</Alert>;
	}

	// Day roll-up matrix: rows = fault types, one column per inspected piece,
	// then server-computed Total + Score (total / pieces inspected) columns.
	return (
		<Paper variant="outlined" sx={{ p: 2 }}>
			<Typography variant="body2" sx={{ mb: 1 }}>
				Pieces inspected: <strong>{data.pieces_inspected}</strong>
			</Typography>
			<TableContainer sx={{ overflowX: "auto" }}>
				<Table size="small">
					<TableHead>
						<TableRow>
							<TableCell>Fault</TableCell>
							{data.pieces.map((p) => (
								<TableCell key={p.fabric_fault_id} align="center">
									<Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
										<Typography variant="caption" sx={{ fontWeight: 600 }}>
											{pieceLabel(p)}
										</Typography>
										{p.item_name ? (
											<Typography variant="caption" color="text.secondary">
												{p.item_name}
											</Typography>
										) : null}
										{p.spell_code ? (
											<Typography variant="caption" color="text.secondary">
												{p.spell_code}
											</Typography>
										) : null}
										<Tooltip title="Delete piece">
											<IconButton
												size="small"
												color="error"
												onClick={() => onDelete(p.fabric_fault_id)}
											>
												<DeleteIcon size={14} />
											</IconButton>
										</Tooltip>
									</Box>
								</TableCell>
							))}
							<TableCell align="right" sx={{ fontWeight: 600 }}>
								Total
							</TableCell>
							<TableCell align="right" sx={{ fontWeight: 600 }}>
								Score
							</TableCell>
						</TableRow>
					</TableHead>
					<TableBody>
						{data.fault_types.map((name, i) => (
							<TableRow key={name}>
								<TableCell>{name}</TableCell>
								{data.pieces.map((p) => (
									<TableCell key={p.fabric_fault_id} align="center">
										{p.fault_counts[i] ?? 0}
									</TableCell>
								))}
								<TableCell align="right">{data.fault_totals[i] ?? 0}</TableCell>
								<TableCell align="right">{fmtScore(data.fault_scores[i])}</TableCell>
							</TableRow>
						))}
						<TableRow>
							<TableCell sx={{ fontWeight: 600 }}>Piece Total</TableCell>
							{data.pieces.map((p) => (
								<TableCell key={p.fabric_fault_id} align="center" sx={{ fontWeight: 600 }}>
									{p.piece_total}
								</TableCell>
							))}
							<TableCell align="right" sx={{ fontWeight: 600 }}>
								{data.grand_total}
							</TableCell>
							<TableCell align="right" sx={{ fontWeight: 600 }}>
								{fmtScore(data.grand_score)}
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			</TableContainer>
		</Paper>
	);
}
