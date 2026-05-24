"use client";
import React, { useCallback, useEffect, useState } from "react";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	TextField,
} from "@mui/material";

export type MisReportFilterValues = {
	asOfDate: string;
};

const formatYmd = (d: Date) => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
};

export const getDefaultAsOfDate = () => formatYmd(new Date());

type Props = {
	open: boolean;
	onClose: () => void;
	onApply: (values: MisReportFilterValues) => void;
	initial?: Partial<MisReportFilterValues>;
	title?: string;
};

export default function MisReportFilterDialog({
	open,
	onClose,
	onApply,
	initial,
	title,
}: Props) {
	const [asOfDate, setAsOfDate] = useState(
		initial?.asOfDate || getDefaultAsOfDate()
	);

	useEffect(() => {
		if (open) {
			setAsOfDate(initial?.asOfDate || getDefaultAsOfDate());
		}
	}, [open, initial?.asOfDate]);

	const handleApply = useCallback(() => {
		onApply({ asOfDate: asOfDate.trim() });
		onClose();
	}, [asOfDate, onApply, onClose]);

	const handleClear = useCallback(() => {
		const today = getDefaultAsOfDate();
		setAsOfDate(today);
		onApply({ asOfDate: today });
		onClose();
	}, [onApply, onClose]);

	return (
		<Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
			<DialogTitle>{title ?? "Filter — MIS Report"}</DialogTitle>
			<DialogContent dividers>
				<TextField
					label="As-of Date"
					type="date"
					value={asOfDate}
					onChange={(e) => setAsOfDate(e.target.value)}
					fullWidth
					size="small"
					InputLabelProps={{ shrink: true }}
				/>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClear} color="warning">
					Reset
				</Button>
				<Button onClick={onClose}>Cancel</Button>
				<Button onClick={handleApply} variant="contained">
					Apply
				</Button>
			</DialogActions>
		</Dialog>
	);
}
