"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	TextField,
} from "@mui/material";

export type SpinningFilterValues = {
	fromDate: string;
	toDate: string;
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

type Props = {
	open: boolean;
	onClose: () => void;
	onApply: (values: SpinningFilterValues) => void;
	initial?: Partial<SpinningFilterValues>;
	title?: string;
};

export default function SpinningFilterDialog({
	open,
	onClose,
	onApply,
	initial,
	title,
}: Props) {
	const [fromDate, setFromDate] = useState(initial?.fromDate || getDefaultFromDate());
	const [toDate, setToDate] = useState(initial?.toDate || getDefaultToDate());

	useEffect(() => {
		if (open) {
			setFromDate(initial?.fromDate || getDefaultFromDate());
			setToDate(initial?.toDate || getDefaultToDate());
		}
	}, [open, initial?.fromDate, initial?.toDate]);

	const handleApply = useCallback(() => {
		onApply({ fromDate: fromDate.trim(), toDate: toDate.trim() });
		onClose();
	}, [fromDate, toDate, onApply, onClose]);

	const handleClear = useCallback(() => {
		const f = getDefaultFromDate();
		const t = getDefaultToDate();
		setFromDate(f);
		setToDate(t);
		onApply({ fromDate: f, toDate: t });
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
