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

export type BioAttFilterValues = {
	fromDate: string;
	toDate: string;
	ebNo: string;
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
	onApply: (values: BioAttFilterValues) => void;
	initial?: Partial<BioAttFilterValues>;
	title?: string;
};

export default function BioAttFilterDialog({
	open,
	onClose,
	onApply,
	initial,
	title,
}: Props) {
	const [fromDate, setFromDate] = useState(initial?.fromDate || getDefaultFromDate());
	const [toDate, setToDate] = useState(initial?.toDate || getDefaultToDate());
	const [ebNo, setEbNo] = useState(initial?.ebNo ?? "");

	useEffect(() => {
		if (open) {
			setFromDate(initial?.fromDate || getDefaultFromDate());
			setToDate(initial?.toDate || getDefaultToDate());
			setEbNo(initial?.ebNo ?? "");
		}
	}, [open, initial?.fromDate, initial?.toDate, initial?.ebNo]);

	const handleApply = useCallback(() => {
		onApply({
			fromDate: fromDate.trim(),
			toDate: toDate.trim(),
			ebNo: ebNo.trim(),
		});
		onClose();
	}, [fromDate, toDate, ebNo, onApply, onClose]);

	const handleClear = useCallback(() => {
		setFromDate("");
		setToDate("");
		setEbNo("");
		onApply({ fromDate: "", toDate: "", ebNo: "" });
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
					<TextField
						label="EB No"
						size="small"
						value={ebNo}
						onChange={(e) => setEbNo(e.target.value)}
						placeholder="Employee Code"
						fullWidth
					/>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClear} color="warning">
					Clear
				</Button>
				<Button onClick={onClose}>Cancel</Button>
				<Button variant="contained" onClick={handleApply}>
					Apply
				</Button>
			</DialogActions>
		</Dialog>
	);
}
