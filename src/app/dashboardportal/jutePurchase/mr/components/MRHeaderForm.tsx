import * as React from "react";
import { Card, CardContent, Grid, TextField, Typography, MenuItem, FormControl, InputLabel, Select, FormHelperText, Alert } from "@mui/material";
import type { JuteMRHeader, MRPoOption, MRSupplierOption, MRPartyOption, PartyBranchOption } from "../types/mrTypes";

type MRHeaderFormProps = {
	header: JuteMRHeader;
	mode: "edit" | "view";
	onHeaderChange?: (field: keyof JuteMRHeader, value: string | number | null) => void;
	partyBranchOptions?: PartyBranchOption[];
	partyBranchLoading?: boolean;
	/** True once party branches have been fetched (to distinguish empty from loading) */
	partyBranchesLoaded?: boolean;
	/** Open POs for the supplier/party, for the PO dropdown */
	poOptions?: MRPoOption[];
	/** All suppliers, for the Supplier dropdown */
	supplierOptions?: MRSupplierOption[];
	/** Parties for the selected supplier, for the Party dropdown */
	partyOptions?: MRPartyOption[];
	/** Total accepted weight calculated from line items */
	totalAcceptedWeight?: number;
};

export function MRHeaderForm({ header, mode, onHeaderChange, partyBranchOptions = [], partyBranchLoading = false, partyBranchesLoaded = false, poOptions = [], supplierOptions = [], partyOptions = [], totalAcceptedWeight }: MRHeaderFormProps) {
	const showGateEntryDate = header.src_com_id != null;
	const readOnly = mode === "view";

	// PO dropdown options: ensure the already-saved PO is always present/selectable.
	const poOpts = React.useMemo(() => {
		const list = [...poOptions];
		if (header.po_id != null && !list.some((o) => o.jute_po_id === header.po_id)) {
			list.unshift({ jute_po_id: header.po_id, po_num: header.po_no, po_date: header.po_date, dalta_pc: header.po_dalta_pc });
		}
		return list;
	}, [poOptions, header.po_id, header.po_no, header.po_date, header.po_dalta_pc]);
	const selectedPo = poOpts.find((o) => o.jute_po_id === header.po_id) ?? null;

	// Less (%) is read-only and sourced from the linked PO's dalta_pc.
	const lessPc = selectedPo?.dalta_pc ?? header.po_dalta_pc;

	// Supplier options: ensure the saved supplier is always present/selectable.
	const supplierOpts = React.useMemo(() => {
		const list = [...supplierOptions];
		if (header.jute_supplier_id != null && !list.some((o) => o.supplier_id === header.jute_supplier_id)) {
			list.unshift({ supplier_id: header.jute_supplier_id, supplier_name: header.supplier_name });
		}
		return list;
	}, [supplierOptions, header.jute_supplier_id, header.supplier_name]);

	// Party options: ensure the saved party is always present/selectable.
	const savedPartyId = header.party_id != null ? Number(header.party_id) : null;
	const partyOpts = React.useMemo(() => {
		const list = [...partyOptions];
		if (savedPartyId != null && !list.some((o) => o.party_id === savedPartyId)) {
			list.unshift({ party_id: savedPartyId, party_name: header.party_name });
		}
		return list;
	}, [partyOptions, savedPartyId, header.party_name]);
	
	// Use prop if provided, otherwise fall back to header value
	const displayMRWeight = totalAcceptedWeight ?? header.mr_weight ?? 0;
	
	// Check if party branch is missing when there are branches to select
	const partyBranchError = !header.party_branch_id && header.party_id && partyBranchOptions.length > 0;
	
	// Check if party has no branches at all (after loading completed)
	const partyHasNoBranches = Boolean(partyBranchesLoaded && !partyBranchLoading && header.party_id && partyBranchOptions.length === 0);

	return (
		<Card variant="outlined">
			<CardContent>
				<Typography variant="h6" gutterBottom>
					Material Receipt - MR #{header.branch_mr_no ?? header.jute_mr_id}
				</Typography>
				{partyHasNoBranches && (
					<Alert severity="warning" sx={{ mb: 2 }}>
						The selected party does not have any branches configured. You can save this MR, but approval will be blocked until a branch is added for the party.
					</Alert>
				)}
				<Grid container spacing={2}>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="Branch"
							fullWidth
							value={header.branch_name ?? ""}
							InputProps={{ readOnly: true }}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						{readOnly ? (
							<TextField
								label="Supplier"
								fullWidth
								value={header.supplier_name ?? ""}
								InputProps={{ readOnly: true }}
							/>
						) : (
							<FormControl fullWidth>
								<InputLabel id="supplier-label">Supplier</InputLabel>
								<Select
									labelId="supplier-label"
									label="Supplier"
									value={header.jute_supplier_id ?? ""}
									onChange={(e) => onHeaderChange?.("jute_supplier_id", e.target.value ? Number(e.target.value) : null)}
								>
									{supplierOpts.map((s) => (
										<MenuItem key={s.supplier_id} value={s.supplier_id}>
											{s.supplier_name ?? s.supplier_id}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						)}
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						{readOnly ? (
							<TextField
								label="Party"
								fullWidth
								value={header.party_name ?? ""}
								InputProps={{ readOnly: true }}
							/>
						) : (
							<FormControl fullWidth>
								<InputLabel id="party-label">Party</InputLabel>
								<Select
									labelId="party-label"
									label="Party"
									value={savedPartyId ?? ""}
									onChange={(e) => onHeaderChange?.("party_id", e.target.value ? String(e.target.value) : null)}
									disabled={!header.jute_supplier_id}
								>
									{partyOpts.map((p) => (
										<MenuItem key={p.party_id} value={p.party_id}>
											{p.party_name ?? p.party_id}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						)}
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						{readOnly || partyBranchOptions.length <= 1 ? (
							<TextField
								label="Party Branch"
								fullWidth
								value={partyHasNoBranches ? "No branches available" : (header.party_branch_name ?? "")}
								InputProps={{ readOnly: true }}
								error={partyHasNoBranches}
								helperText={partyHasNoBranches ? "Please add a branch for this party" : undefined}
							/>
						) : (
							<FormControl fullWidth error={!!partyBranchError}>
								<InputLabel id="party-branch-label">Party Branch *</InputLabel>
								<Select
									labelId="party-branch-label"
									label="Party Branch *"
									value={header.party_branch_id ?? ""}
									onChange={(e) => onHeaderChange?.("party_branch_id", e.target.value ? Number(e.target.value) : null)}
									disabled={partyBranchLoading}
								>
									{partyBranchOptions.map((branch) => (
										<MenuItem key={branch.party_mst_branch_id} value={branch.party_mst_branch_id}>
											{branch.display}
										</MenuItem>
									))}
								</Select>
								{partyBranchError && <FormHelperText>Party Branch is required</FormHelperText>}
							</FormControl>
						)}
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						{readOnly ? (
							<TextField
								label="PO No"
								fullWidth
								value={selectedPo?.po_num ?? header.po_no ?? ""}
								InputProps={{ readOnly: true }}
							/>
						) : (
							<FormControl fullWidth>
								<InputLabel id="po-no-label">PO No</InputLabel>
								<Select
									labelId="po-no-label"
									label="PO No"
									value={header.po_id ?? ""}
									onChange={(e) => onHeaderChange?.("po_id", e.target.value ? Number(e.target.value) : null)}
								>
									{poOpts.map((po) => (
										<MenuItem key={po.jute_po_id} value={po.jute_po_id}>
											{po.po_num ?? po.jute_po_id}
										</MenuItem>
									))}
								</Select>
							</FormControl>
						)}
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="PO Date"
							fullWidth
							value={selectedPo?.po_date ?? header.po_date ?? ""}
							InputProps={{ readOnly: true }}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="Challan No"
							fullWidth
							value={header.challan_no ?? ""}
							InputProps={{ readOnly: true }}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="Challan Date"
							fullWidth
							value={header.challan_date ?? ""}
							InputProps={{ readOnly: true }}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="MR No"
							fullWidth
							value={header.mr_num ?? header.branch_mr_no ?? ""}
							InputProps={{ readOnly: true }}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="MR Date"
							fullWidth
							value={header.jute_mr_date ?? ""}
							InputProps={{ readOnly: true }}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="Mukam"
							fullWidth
							value={header.mukam ?? ""}
							InputProps={{ readOnly: true }}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="Vehicle No"
							fullWidth
							value={header.vehicle_no ?? ""}
							InputProps={{ readOnly: true }}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="Unit Conversion"
							fullWidth
							value={header.unit_conversion ?? ""}
							InputProps={{ readOnly: true }}
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="Actual Weight (Gate Entry)"
							fullWidth
							type="number"
							value={header.actual_weight ?? ""}
							InputProps={{ readOnly: true }}
							helperText="Auto-distributed to line items by quantity"
						/>
					</Grid>
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="MR Weight (Sum of Accepted)"
							fullWidth
							type="number"
							value={displayMRWeight.toFixed(2)}
							InputProps={{ readOnly: true }}
							helperText="Auto-calculated from accepted weights"
						/>
					</Grid>
					{showGateEntryDate && (
						<Grid size={{ xs: 12, md: 4 }}>
							<TextField
								label="Gate Entry Date"
								fullWidth
								value={header.jute_gate_entry_date ?? ""}
								InputProps={{ readOnly: true }}
							/>
						</Grid>
					)}
					{showGateEntryDate && (
						<Grid size={{ xs: 12, md: 4 }}>
							<TextField
								label="Gate Entry No"
								fullWidth
								value={header.jute_gate_entry_no ?? ""}
								InputProps={{ readOnly: true }}
							/>
						</Grid>
					)}
					<Grid size={{ xs: 12, md: 4 }}>
						<TextField
							label="Less (%)"
							fullWidth
							value={lessPc ?? ""}
							InputProps={{ readOnly: true }}
							helperText="From the linked PO"
						/>
					</Grid>
					<Grid size={{ xs: 12 }}>
						<TextField
							label="Remarks"
							fullWidth
							multiline
							rows={2}
							value={header.remarks ?? ""}
							onChange={(e) => onHeaderChange?.("remarks", e.target.value || null)}
							InputProps={{ readOnly: readOnly }}
						/>
					</Grid>
				</Grid>
			</CardContent>
		</Card>
	);
}
