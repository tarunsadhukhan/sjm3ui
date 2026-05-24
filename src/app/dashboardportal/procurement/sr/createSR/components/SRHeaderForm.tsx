"use client";

import * as React from "react";
import { Box, Typography, Stack, Chip, Divider, TextField } from "@mui/material";
import type { SRHeader } from "../types/srTypes";
import { getStatusColor } from "../utils/srConstants";

/**
 * Format date for display.
 */
const formatDate = (value?: string): string => {
	if (!value) return "-";
	try {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return new Intl.DateTimeFormat("en-GB", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		}).format(date);
	} catch {
		return value;
	}
};

type SRHeaderFormProps = {
	header: SRHeader | null;
	srDate: string;
	onSRDateChange: (value: string) => void;
	srRemarks: string;
	onSRRemarksChange: (value: string) => void;
	canEdit: boolean;
};

/**
 * Header form displaying inward info and editable SR fields.
 */
export const SRHeaderForm: React.FC<SRHeaderFormProps> = ({
	header,
	srDate,
	onSRDateChange,
	srRemarks,
	onSRRemarksChange,
	canEdit,
}) => {
	return (
		<Box>
			{/* Status Row */}
			<Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
				<Box>
					<Typography variant="h6" fontWeight={600}>
						Stores Receipt
					</Typography>
					<Typography variant="body2" color="text.secondary">
						Enter accepted rates and approve stores receipt
					</Typography>
				</Box>
				<Stack direction="row" spacing={1}>
					{header?.sr_no && (
						<Chip
							label={`SR: ${header.sr_no}`}
							color="secondary"
							variant="outlined"
							size="small"
						/>
					)}
					<Chip
						label={header?.sr_status_name || "Pending"}
						color={getStatusColor(header?.sr_status || 0)}
						variant="filled"
						size="small"
					/>
				</Stack>
			</Stack>

			<Divider sx={{ my: 2 }} />

			{/* Read-only Inward Info - Row 1 */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
					gap: 2,
					mb: 2,
				}}
			>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Inward Number
					</Typography>
					<Typography variant="body1" fontWeight={600} color="primary">
						{header?.inward_no || "-"}
					</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Inward Date
					</Typography>
					<Typography variant="body1">{formatDate(header?.inward_date)}</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Branch
					</Typography>
					<Typography variant="body1">{header?.branch_name || "-"}</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Supplier
					</Typography>
					<Typography variant="body1">{header?.supplier_name || "-"}</Typography>
				</Box>
			</Box>

			{/* Read-only Inward Info - Row 2 */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
					gap: 2,
					mb: 2,
				}}
			>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Challan No
					</Typography>
					<Typography variant="body1">{header?.challan_no || "-"}</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Challan Date
					</Typography>
					<Typography variant="body1">{formatDate(header?.challan_date)}</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Invoice Date
					</Typography>
					<Typography variant="body1">{formatDate(header?.invoice_date)}</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Invoice Received Date
					</Typography>
					<Typography variant="body1">{formatDate(header?.invoice_recvd_date)}</Typography>
				</Box>
			</Box>

			{/* Read-only Inward Info - Row 3: Vehicle/Driver */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
					gap: 2,
					mb: 2,
				}}
			>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Vehicle Number
					</Typography>
					<Typography variant="body1">{header?.vehicle_number || "-"}</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Driver Name
					</Typography>
					<Typography variant="body1">{header?.driver_name || "-"}</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Driver Contact
					</Typography>
					<Typography variant="body1">{header?.driver_contact_no || "-"}</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Inspection Date
					</Typography>
					<Typography variant="body1">{formatDate(header?.inspection_date)}</Typography>
				</Box>
			</Box>

			{/* Read-only Inward Info - Row 4: Consignment/E-Way Bill */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
					gap: 2,
					mb: 2,
				}}
			>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Consignment No
					</Typography>
					<Typography variant="body1">{header?.consignment_no || "-"}</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Consignment Date
					</Typography>
					<Typography variant="body1">{formatDate(header?.consignment_date)}</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						E-Way Bill No
					</Typography>
					<Typography variant="body1">{header?.ewaybillno || "-"}</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						E-Way Bill Date
					</Typography>
					<Typography variant="body1">{formatDate(header?.ewaybill_date)}</Typography>
				</Box>
			</Box>

			{/* Read-only Inward Info - Row 5: State and Remarks */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr 1fr" },
					gap: 2,
					mb: 3,
				}}
			>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Supplier State
					</Typography>
					<Typography variant="body1">{header?.supplier_state_name || "-"}</Typography>
				</Box>
				<Box>
					<Typography variant="caption" color="text.secondary">
						Despatch Remarks
					</Typography>
					<Typography variant="body1">{header?.despatch_remarks || "-"}</Typography>
				</Box>
				<Box sx={{ gridColumn: { md: "span 2" } }}>
					<Typography variant="caption" color="text.secondary">
						Receipt Remarks
					</Typography>
					<Typography variant="body1">{header?.receipts_remarks || "-"}</Typography>
				</Box>
			</Box>

			{/* Editable SR Fields */}
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" },
					gap: 2,
				}}
			>
				<TextField
					id="sr-date-field"
					label="SR Date"
					type="date"
					size="small"
					value={srDate}
					onChange={(e) => onSRDateChange(e.target.value)}
					disabled={!canEdit}
					InputLabelProps={{ shrink: true }}
				/>
				<TextField
					id="sr-remarks-field"
					label="SR Remarks"
					size="small"
					value={srRemarks}
					onChange={(e) => onSRRemarksChange(e.target.value)}
					disabled={!canEdit}
					multiline
					sx={{ gridColumn: { md: "span 2" } }}
				/>
			</Box>
		</Box>
	);
};
