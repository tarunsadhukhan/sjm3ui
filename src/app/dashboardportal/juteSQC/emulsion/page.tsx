"use client";

import * as React from "react";
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import { apiRoutesPortalMasters } from "@/utils/api";
// ponytail: tiny GET hook reused from the sibling spreader SQC page.
import { useSqcGet } from "../spreader/hooks/useSqcGet";
import type { EmulsionByDateResponse, EmulsionSetup } from "./types/emulsionTypes";
import EmulsionForm from "./_components/EmulsionForm";
import EmulsionGrid from "./_components/EmulsionGrid";

export default function EmulsionSqcPage() {
	// HYDRATION RULE: this component reads sidebar context and seeds a date,
	// so defer render until mounted to avoid SSR hydration mismatch.
	const [mounted, setMounted] = React.useState(false);
	React.useEffect(() => {
		setMounted(true);
	}, []);

	const { coId } = useSelectedCompanyCoId();
	const { selectedBranches, selectedCompany } = useSidebarContext();

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

	const [entryDate, setEntryDate] = React.useState<string>(todayISO());
	const [histKey, setHistKey] = React.useState(0);

	const setupUrl = ready
		? `${apiRoutesPortalMasters.EMULSION_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`
		: null;
	const byDateUrl =
		ready && entryDate
			? `${apiRoutesPortalMasters.EMULSION_BY_DATE}?co_id=${coId}&branch_id=${branchId}&entry_date=${entryDate}`
			: null;

	const { data: setupResp, loading: setupLoading, error: setupError } = useSqcGet<{ data: EmulsionSetup }>(
		setupUrl
	);
	const setup = setupResp?.data ?? null;
	const {
		data: byDateResp,
		loading: byDateLoading,
		refresh: refreshByDate,
	} = useSqcGet<{ data: EmulsionByDateResponse }>(byDateUrl);
	const rows = byDateResp?.data?.rows ?? [];

	const onChanged = React.useCallback(() => {
		refreshByDate();
		setHistKey((k) => k + 1);
	}, [refreshByDate]);

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
				Emulsion SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-02 daily jute-oil emulsion recipe log. One save records one date&apos;s recipe; the
				theoretical oil% and OK/LOW/HIGH band status are computed by the server.
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
				<Alert severity="info">Select a branch to load Emulsion SQC data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
					<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
						<Typography variant="subtitle2">Entry date</Typography>
						<TextField
							type="date"
							size="small"
							value={entryDate}
							onChange={(e) => setEntryDate(e.target.value)}
							InputLabelProps={{ shrink: true }}
						/>
					</Box>
					{setupError ? <Alert severity="error">{setupError}</Alert> : null}
					{setupLoading || !setup ? (
						<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
							<CircularProgress />
						</Box>
					) : (
						<EmulsionForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={onChanged}
						/>
					)}
					<EmulsionGrid
						coId={coId}
						rows={rows}
						loading={byDateLoading}
						refreshKey={histKey}
						onChanged={onChanged}
					/>
				</Box>
			)}
		</Box>
	);
}
