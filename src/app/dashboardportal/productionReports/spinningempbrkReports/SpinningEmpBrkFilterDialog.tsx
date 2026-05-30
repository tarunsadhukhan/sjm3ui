"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	TextField,
} from "@mui/material";
import type { ShiftOption } from "./types/spinningEmpBrkReportTypes";

export type SpinningEmpBrkFilterValues = {
	fromDate: string;
	toDate: string;
	shiftId: number | null;
};

const formatYmd = (d: Date) => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
};

export const getDefaultFromDate = () => {
	const d = new Date();
	d.setDate(d.getDate() - 15);
	return formatYmd(d);
};

export const getDefaultToDate = () => formatYmd(new Date());

const ALL_SHIFTS = "";

type Props = {
	open: boolean;
	onClose: () => void;
	onApply: (values: SpinningEmpBrkFilterValues) => void;
	initial?: Partial<SpinningEmpBrkFilterValues>;
	shiftOptions: ShiftOption[];
	title?: string;
};

export default function SpinningEmpBrkFilterDialog({
	open,
	onClose,
	onApply,
	initial,
	shiftOptions,
	title,
}: Props) {
	const [fromDate, setFromDate] = useState(initial?.fromDate || getDefaultFromDate());
	const [toDate, setToDate] = useState(initial?.toDate || getDefaultToDate());
	const [shiftId, setShiftId] = useState<number | null>(initial?.shiftId ?? null);

	useEffect(() => {
		if (open) {
			setFromDate(initial?.fromDate || getDefaultFromDate());
			setToDate(initial?.toDate || getDefaultToDate());
			setShiftId(initial?.shiftId ?? null);
		}
	}, [open, initial?.fromDate, initial?.toDate, initial?.shiftId]);

	const handleApply = useCallback(() => {
		onApply({ fromDate: fromDate.trim(), toDate: toDate.trim(), shiftId });
		onClose();
	}, [fromDate, toDate, shiftId, onApply, onClose]);

	const handleClear = useCallback(() => {
		const f = getDefaultFromDate();
		const t = getDefaultToDate();
		setFromDate(f);
		setToDate(t);
		setShiftId(null);
		onApply({ fromDate: f, toDate: t, shiftId: null });
		onClose();
	}, [onApply, onClose]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>{title ?? "Filter"}</DialogTitle>
			<DialogContent dividers>
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
					<TextField
						type="date"
						label="From Date"
						size="small"
						value={fromDate}
						onChange={(e) => setFromDate(e.target.value)}
						slotProps={{ inputLabel: { shrink: true } }}
						fullWidth
					/>
					<TextField
						type="date"
						label="To Date"
						size="small"
						value={toDate}
						onChange={(e) => setToDate(e.target.value)}
						slotProps={{ inputLabel: { shrink: true } }}
						fullWidth
					/>
					<FormControl size="small" fullWidth>
						<InputLabel id="emp-brk-shift-label">Shift</InputLabel>
						<Select
							labelId="emp-brk-shift-label"
							label="Shift"
							value={shiftId == null ? ALL_SHIFTS : String(shiftId)}
							onChange={(e) => {
								const v = e.target.value;
								setShiftId(v === ALL_SHIFTS ? null : Number(v));
							}}
						>
							<MenuItem value={ALL_SHIFTS}>All Shifts</MenuItem>
							{shiftOptions.map((s) => (
								<MenuItem key={s.shift_id} value={String(s.shift_id)}>
									{s.shift_name}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClear} color="warning">
					Reset
				</Button>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" onClick={handleApply}>
					Apply
				</Button>
			</DialogActions>
		</Dialog>
	);
}
