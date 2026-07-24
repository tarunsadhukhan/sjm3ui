"use client";

import * as React from "react";
import { Alert, Box, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "../../spinning/utils/spinningCalc";
import type { IdType, ValueRole } from "./_components/TargetGrid";
import TargetMapEditor, { VALUE_ROLE_LABELS } from "./_components/TargetMapEditor";

// --- Header-bar options -----------------------------------------------------
// Weaving standards/targets are QUALITY-ONLY: id_type is always 'qid' (the loom ->
// quality map lives elsewhere, so there is no Machine/Quality toggle here). Roles:
// standard | target (the grid auto-renders whatever params the backend returns for
// the chosen value_role — target = speed + eff). 'actual' lives only on the
// Weaving SQC page.

const WEAVING_ID_TYPE: IdType = "qid";
const VALUE_ROLE_OPTIONS: ValueRole[] = ["standard", "target"];

export default function WeavingTargetMapPage() {
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const { coId } = useSelectedCompanyCoId();
	const { selectedCompany, selectedBranches } = useSidebarContext();

	// Only branches the sidebar currently has selected, in company order.
	const branchOptions = React.useMemo(
		() => (selectedCompany?.branches ?? []).filter((b) => selectedBranches.includes(b.branch_id)),
		[selectedCompany, selectedBranches]
	);
	const singleBranchId = branchOptions.length === 1 ? branchOptions[0].branch_id : null;

	// Header bar state. Type is fixed to Quality ('qid') for weaving.
	const [valueRole, setValueRole] = React.useState<ValueRole | "">("");
	const [effectiveDate, setEffectiveDate] = React.useState<string>(todayISO());

	const ready = !!coId && !!valueRole && !!effectiveDate;

	if (!mounted) return null;

	if (!coId) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Select a company to continue.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Box sx={{ mb: 2 }}>
				<Typography variant="h5" sx={{ fontWeight: 600 }}>
					Weaving Standards
				</Typography>
				<Typography variant="body2" color="text.secondary">
					Standard and target values per weaving quality, effective-dated. Pick a Role and
					Effective Date, then edit values inline and Save. (Actuals are entered on the Weaving SQC
					page.)
				</Typography>
			</Box>

			{/* Header bar (always visible) */}
			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
				<TextField
					select
					label="Role"
					size="small"
					value={valueRole}
					onChange={(e) => setValueRole(e.target.value as ValueRole | "")}
					sx={{ minWidth: 160 }}
				>
					<MenuItem value="">
						<em>Select…</em>
					</MenuItem>
					{VALUE_ROLE_OPTIONS.map((r) => (
						<MenuItem key={r} value={r}>
							{VALUE_ROLE_LABELS[r]}
						</MenuItem>
					))}
				</TextField>
				<TextField
					type="date"
					label="Effective Date"
					size="small"
					value={effectiveDate}
					onChange={(e) => setEffectiveDate(e.target.value)}
					InputLabelProps={{ shrink: true }}
					sx={{ minWidth: 180 }}
				/>
			</Box>

			{!ready ? (
				<Alert severity="info">Select Role and Effective Date to load the grid.</Alert>
			) : (
				<TargetMapEditor
					coId={coId}
					branchId={singleBranchId}
					idType={WEAVING_ID_TYPE}
					valueRole={valueRole as ValueRole}
					effectiveDate={effectiveDate}
				/>
			)}
		</Box>
	);
}
