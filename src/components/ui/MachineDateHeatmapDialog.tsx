"use client";
import React from "react";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Typography,
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";

/** One heatmap row: an entity (machine/employee) and its value per date. */
export interface HeatmapRow {
	name: string;
	values: number[];
}

export interface MachineDateHeatmapDialogProps {
	open: boolean;
	onClose: () => void;
	/** Dialog title shown for the full heatmap view. */
	title: string;
	/** Column headers, chronological. */
	dates: string[];
	/** One row per entity; values align with `dates`. */
	rows: HeatmapRow[];
	/** Series/metric label, e.g. "Output", "Eff%". */
	metricLabel: string;
	/** Y-axis label for the drilled line chart, e.g. "Meters", "Eff %". */
	yLabel: string;
	/** Unit suffix in the color-scale legend, e.g. "m", "%". */
	unitSuffix: string;
	/** Sticky first-column header. Defaults to "Machine". */
	entityLabel?: string;
	/** Entity drilled into (line-chart view); null = full heatmap. */
	drilledName: string | null;
	/** Called when the user drills into a row (name) or goes back (null). */
	onDrilledChange: (name: string | null) => void;
}

const fmtNum = (value: unknown): string => {
	if (value == null) return "";
	const n = Number(value);
	if (!Number.isFinite(n)) return "";
	return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

const heatCellStyle = (v: number, max: number): React.CSSProperties => {
	const t = max > 0 ? v / max : 0;
	return {
		padding: "4px 6px",
		textAlign: "right",
		minWidth: 56,
		border: "1px solid #eee",
		background: v > 0 ? `rgba(12, 60, 96, ${0.06 + 0.94 * t})` : undefined,
		color: t > 0.55 ? "#fff" : "#111",
	};
};

/**
 * Entity × date heatmap dialog with drill-down.
 *
 * Shows a sequential-color heatmap (darker = higher) of one metric across
 * entities (rows) and dates (columns). Double-clicking a row drills into a
 * single-entity LineChart trend; "Back" returns to the heatmap. Used by the
 * drawing and spinning report pages.
 */
export default function MachineDateHeatmapDialog({
	open,
	onClose,
	title,
	dates,
	rows,
	metricLabel,
	yLabel,
	unitSuffix,
	entityLabel = "Machine",
	drilledName,
	onDrilledChange,
}: MachineDateHeatmapDialogProps) {
	const max = rows.reduce((m, r) => Math.max(m, ...r.values), 0);
	const drilled = drilledName
		? rows.find((r) => r.name === drilledName)
		: undefined;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
			<DialogTitle>
				{drilled ? `${drilled.name} — ${metricLabel}` : title}
			</DialogTitle>
			<DialogContent dividers>
				{dates.length === 0 ? (
					<Typography color="text.secondary" sx={{ p: 4, textAlign: "center" }}>
						No data to chart for the selected range.
					</Typography>
				) : drilled ? (
					<Box sx={{ width: "100%" }}>
						<LineChart
							xAxis={[{ data: dates, scaleType: "point", label: "Date" }]}
							yAxis={[{ label: yLabel }]}
							series={[
								{
									data: drilled.values,
									label: metricLabel,
									color: "#1976d2",
									valueFormatter: (v) => (v == null ? "" : fmtNum(v)),
								},
							]}
							height={420}
							margin={{ top: 30, right: 30, left: 70, bottom: 60 }}
						/>
					</Box>
				) : (
					<>
						<Box sx={{ overflowX: "auto" }}>
							<table style={{ borderCollapse: "collapse", fontSize: 12 }}>
								<thead>
									<tr>
										<th
											style={{
												position: "sticky",
												left: 0,
												background: "#fff",
												textAlign: "left",
												padding: "4px 8px",
												border: "1px solid #eee",
											}}
										>
											{entityLabel}
										</th>
										{dates.map((d) => (
											<th
												key={d}
												style={{
													padding: "4px 6px",
													whiteSpace: "nowrap",
													border: "1px solid #eee",
												}}
											>
												{d}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{rows.map((row) => (
										<tr
											key={row.name}
											onDoubleClick={() => onDrilledChange(row.name)}
											style={{ cursor: "pointer" }}
											title={`Double-click for ${entityLabel.toLowerCase()} trend`}
										>
											<td
												style={{
													position: "sticky",
													left: 0,
													background: "#fff",
													padding: "4px 8px",
													whiteSpace: "nowrap",
													fontWeight: 600,
													border: "1px solid #eee",
												}}
											>
												{row.name}
											</td>
											{row.values.map((v, i) => (
												<td
													key={i}
													title={`${row.name} — ${dates[i]}: ${fmtNum(v)}`}
													style={heatCellStyle(v, max)}
												>
													{v > 0 ? fmtNum(v) : ""}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</Box>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								gap: 1,
								mt: 1.5,
								fontSize: 12,
								color: "text.secondary",
							}}
						>
							<span>0</span>
							<Box
								sx={{
									width: 140,
									height: 10,
									borderRadius: 1,
									background:
										"linear-gradient(to right, rgba(12,60,96,0.06), rgba(12,60,96,1))",
								}}
							/>
							<span>
								{fmtNum(max)} {unitSuffix} — darker = more
							</span>
						</Box>
					</>
				)}
			</DialogContent>
			<DialogActions>
				{drilled ? (
					<Button onClick={() => onDrilledChange(null)}>Back</Button>
				) : null}
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
}
