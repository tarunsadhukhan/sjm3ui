"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, Tab, Tabs, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import { apiRoutesPortalMasters } from "@/utils/api";
import { useSqcGet } from "./hooks/useSqcGet";
import type {
	RollWtByDateResponse,
	SliverWtByDateResponse,
	SpreaderSetup,
} from "./types/spreaderSqcTypes";
import RollWtForm from "./_components/RollWtForm";
import RollWtGrid from "./_components/RollWtGrid";
import SliverWtForm from "./_components/SliverWtForm";
import SliverWtGrid from "./_components/SliverWtGrid";

const TABS = ["Roll Weight", "Sliver Weight"] as const;

export default function SpreaderSqcPage() {
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

	const ready = mounted && !!coId && branchId != null;

	// ── Tab 1 — R-08-04 Roll Weight ──
	const [rollDate, setRollDate] = React.useState<string>(todayISO());
	const [rollHistKey, setRollHistKey] = React.useState(0);
	const rollSetupUrl = ready
		? `${apiRoutesPortalMasters.SPREADER_ROLL_WT_SETUP}?co_id=${coId}&branch_id=${branchId}`
		: null;
	const rollByDateUrl =
		ready && rollDate
			? `${apiRoutesPortalMasters.SPREADER_ROLL_WT_BY_DATE}?co_id=${coId}&branch_id=${branchId}&entry_date=${rollDate}`
			: null;
	const {
		data: rollSetupResp,
		loading: rollSetupLoading,
		error: rollSetupError,
	} = useSqcGet<{ data: SpreaderSetup }>(rollSetupUrl);
	const rollSetup = rollSetupResp?.data ?? null;
	const {
		data: rollByDateResp,
		loading: rollByDateLoading,
		refresh: refreshRollByDate,
	} = useSqcGet<{ data: RollWtByDateResponse }>(rollByDateUrl);
	const rollRows = rollByDateResp?.data?.readings ?? [];

	const onRollChanged = React.useCallback(() => {
		refreshRollByDate();
		setRollHistKey((k) => k + 1);
	}, [refreshRollByDate]);

	// ── Tab 2 — R-08-03 Sliver Weight ──
	const [sliverDate, setSliverDate] = React.useState<string>(todayISO());
	const [sliverHistKey, setSliverHistKey] = React.useState(0);
	const sliverSetupUrl = ready
		? `${apiRoutesPortalMasters.SPREADER_SLIVER_WT_SETUP}?co_id=${coId}&branch_id=${branchId}`
		: null;
	const sliverByDateUrl =
		ready && sliverDate
			? `${apiRoutesPortalMasters.SPREADER_SLIVER_WT_BY_DATE}?co_id=${coId}&branch_id=${branchId}&entry_date=${sliverDate}`
			: null;
	const {
		data: sliverSetupResp,
		loading: sliverSetupLoading,
		error: sliverSetupError,
	} = useSqcGet<{ data: SpreaderSetup }>(sliverSetupUrl);
	const sliverSetup = sliverSetupResp?.data ?? null;
	const {
		data: sliverByDateResp,
		loading: sliverByDateLoading,
		refresh: refreshSliverByDate,
	} = useSqcGet<{ data: SliverWtByDateResponse }>(sliverByDateUrl);
	const sliverRows = sliverByDateResp?.data?.readings ?? [];

	const onSliverChanged = React.useCallback(() => {
		refreshSliverByDate();
		setSliverHistKey((k) => k + 1);
	}, [refreshSliverByDate]);

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
				Spreader SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-04 roll weight and R-08-03 sliver weight sampling with server-computed moisture-corrected
				stats.
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
				<Alert severity="info">Select a branch to load Spreader SQC data.</Alert>
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

					{/* Tab 1 — Roll Weight (R-08-04) */}
					{tab === 0 ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
								<Typography variant="subtitle2">Entry date</Typography>
								<TextField
									type="date"
									size="small"
									value={rollDate}
									onChange={(e) => setRollDate(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
							</Box>
							{rollSetupError ? <Alert severity="error">{rollSetupError}</Alert> : null}
							{rollSetupLoading || !rollSetup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<RollWtForm
									coId={coId}
									branchId={branchId}
									entryDate={rollDate}
									setup={rollSetup}
									onSaved={onRollChanged}
								/>
							)}
							<RollWtGrid
								coId={coId}
								rows={rollRows}
								loading={rollByDateLoading}
								refreshKey={rollHistKey}
								onChanged={onRollChanged}
							/>
						</Box>
					) : null}

					{/* Tab 2 — Sliver Weight (R-08-03) */}
					{tab === 1 ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
								<Typography variant="subtitle2">Entry date</Typography>
								<TextField
									type="date"
									size="small"
									value={sliverDate}
									onChange={(e) => setSliverDate(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
							</Box>
							{sliverSetupError ? <Alert severity="error">{sliverSetupError}</Alert> : null}
							{sliverSetupLoading || !sliverSetup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<SliverWtForm
									coId={coId}
									branchId={branchId}
									entryDate={sliverDate}
									setup={sliverSetup}
									onSaved={onSliverChanged}
								/>
							)}
							<SliverWtGrid
								coId={coId}
								rows={sliverRows}
								loading={sliverByDateLoading}
								refreshKey={sliverHistKey}
								onChanged={onSliverChanged}
							/>
						</Box>
					) : null}
				</>
			)}
		</Box>
	);
}
