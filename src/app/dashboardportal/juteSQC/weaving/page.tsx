"use client";

import * as React from "react";
import { Alert, Box, MenuItem, Tab, Tabs, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
// Shared target-map editor reused across the juteProduction route boundary:
// the "Actual" tab writes actuals into jute_prod_weaving_target_map (the same
// table the weaving planning grid reads, value_role='actual'). The editor reuses
// the existing WEAVING_TARGET_MAP_* endpoints (setup/grid/bulk_save) exactly like
// Weaving Standards / Targets — only the role differs (actual). Weaving is
// QUALITY-ONLY (id_type='qid'); the actual params are 'speed' (loom speed,
// picks/min) and 'picks' (PPI) per quality.
import TargetMapEditor from "../../juteProduction/masters/weavingTargetMap/_components/TargetMapEditor";

// Single tab today; modelled as a tab shell to mirror the spinning SQC page and to
// leave room for additional weaving SQC observations later.
const TABS = ["Actual"] as const;

export default function WeavingSqcPage() {
	// HYDRATION RULE: this component reads sidebar context and seeds a date,
	// so defer render until mounted to avoid SSR hydration mismatch.
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const { coId } = useSelectedCompanyCoId();
	const { selectedBranches, selectedCompany } = useSidebarContext();
	const [tab, setTab] = React.useState(0);

	// Branch resolution: 1 sidebar branch → auto-use it; several → user must pick one.
	const sidebarBranchIds = React.useMemo(() => selectedBranches.map(Number), [selectedBranches]);
	const [pageBranchId, setPageBranchId] = React.useState<number | "">("");
	React.useEffect(() => {
		if (sidebarBranchIds.length === 1) {
			setPageBranchId(sidebarBranchIds[0]);
		} else if (sidebarBranchIds.length === 0) {
			setPageBranchId("");
		} else {
			setPageBranchId((prev) =>
				prev !== "" && sidebarBranchIds.includes(prev as number) ? prev : ""
			);
		}
	}, [sidebarBranchIds]);
	const branchId = pageBranchId === "" ? null : (pageBranchId as number);
	const branchOptions = React.useMemo(
		() => (selectedCompany?.branches ?? []).filter((b) => sidebarBranchIds.includes(Number(b.branch_id))),
		[selectedCompany, sidebarBranchIds]
	);
	const selectedBranchName = branchOptions.find((b) => Number(b.branch_id) === branchId)?.branch_name;

	// Effective date for the actual snapshot (id_type is fixed 'qid' for weaving).
	const [effectiveDate, setEffectiveDate] = React.useState<string>(todayISO());

	if (!mounted) return null;

	if (!coId) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Select a company to continue.
			</Alert>
		);
	}

	if (sidebarBranchIds.length === 0) {
		return (
			<Alert severity="warning" sx={{ m: 2 }}>
				Select at least one branch in the sidebar to continue.
			</Alert>
		);
	}

	return (
		<Box sx={{ p: { xs: 1.5, md: 3 } }}>
			<Typography variant="h5" sx={{ fontWeight: 600 }}>
				Weaving SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Enter the actual loom speed (picks/min) and actual PPI per weaving quality and date. Saving here
				writes the actual values into the weaving target map (value_role=&apos;actual&apos;); the weaving
				production planning grid will then populate the actual columns once an actual exists for a quality
				on its transaction date. Until an actual is saved here, those columns stay at 0.
			</Typography>

			{sidebarBranchIds.length > 1 ? (
				<TextField
					select
					size="small"
					label="Branch"
					value={pageBranchId}
					onChange={(e) => setPageBranchId(e.target.value === "" ? "" : Number(e.target.value))}
					sx={{ mb: 2, minWidth: 240 }}
				>
					{branchOptions.map((b) => (
						<MenuItem key={b.branch_id} value={Number(b.branch_id)}>
							{b.branch_name}
						</MenuItem>
					))}
				</TextField>
			) : selectedBranchName ? (
				<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
					Branch: {selectedBranchName}
				</Typography>
			) : null}

			{branchId == null ? (
				<Alert severity="info">Select a branch to load Weaving SQC data.</Alert>
			) : (
				<>
					<Tabs
						value={tab}
						onChange={(_, v) => setTab(v)}
						variant="scrollable"
						scrollButtons="auto"
						allowScrollButtonsMobile
						sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}
					>
						{TABS.map((label) => (
							<Tab key={label} label={label} sx={{ minHeight: 44 }} />
						))}
					</Tabs>

					{/* Tab 1 — Actual (writes weaving target-map actuals: speed + picks) */}
					{tab === 0 ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
								<Typography variant="subtitle2">Effective date</Typography>
								<TextField
									type="date"
									size="small"
									value={effectiveDate}
									onChange={(e) => setEffectiveDate(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
							</Box>
							<Box>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									Quality
								</Typography>
								<TargetMapEditor
									coId={coId}
									branchId={branchId}
									idType="qid"
									valueRole="actual"
									effectiveDate={effectiveDate}
									paramLabels={{ speed: "Speed (picks/min)", picks: "Picks (PPI)" }}
								/>
							</Box>
						</Box>
					) : null}
				</>
			)}
		</Box>
	);
}
