"use client";

import * as React from "react";
import {
	Alert,
	Box,
	CircularProgress,
	MenuItem,
	TextField,
	Typography,
} from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import EntryForm from "./_components/EntryForm";
import DayGrid from "./_components/DayGrid";
import HistoryTable from "./_components/HistoryTable";
import type { ByDateResponse, CardSliverSetup } from "./types";

const EMPTY_DAY: ByDateResponse = { rows: [], section_averages: [], grand_averages: [] };

export default function InterCardSqcPage() {
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

	const [entryDate, setEntryDate] = React.useState<string>(todayISO());

	// Setup (sections / spells / shared carding machines / batch plans)
	const [setup, setSetup] = React.useState<CardSliverSetup | null>(null);
	const [setupLoading, setSetupLoading] = React.useState(false);
	const [setupError, setSetupError] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (!coId || branchId == null) {
			setSetup(null);
			return;
		}
		let cancelled = false;
		setSetupLoading(true);
		void fetchWithCookie<{ data: CardSliverSetup }>(
			`${apiRoutesPortalMasters.CARD_SLIVER_WT_SETUP}?co_id=${coId}&branch_id=${branchId}`,
			"GET"
		).then(({ data, error }) => {
			if (cancelled) return;
			if (error || !data) {
				setSetupError(error ?? "Failed to load setup");
				setSetup(null);
			} else {
				setSetupError(null);
				setSetup({
					sections: data.data?.sections ?? [],
					spells: data.data?.spells ?? [],
					machines: data.data?.machines ?? [],
					batches: data.data?.batches ?? [],
				});
			}
			setSetupLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId]);

	// Day view (rows + section averages + per-batch grand averages), refetched on save/delete.
	const [dayData, setDayData] = React.useState<ByDateResponse>(EMPTY_DAY);
	const [dayLoading, setDayLoading] = React.useState(false);
	const [version, setVersion] = React.useState(0);
	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);
	React.useEffect(() => {
		if (!coId || branchId == null || !entryDate) {
			setDayData(EMPTY_DAY);
			return;
		}
		let cancelled = false;
		setDayLoading(true);
		void fetchWithCookie<{ data: ByDateResponse }>(
			`${apiRoutesPortalMasters.CARD_SLIVER_WT_BY_DATE}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`,
			"GET"
		).then(({ data, error }) => {
			if (cancelled) return;
			setDayData(
				error || !data
					? EMPTY_DAY
					: {
							rows: data.data?.rows ?? [],
							section_averages: data.data?.section_averages ?? [],
							grand_averages: data.data?.grand_averages ?? [],
					  }
			);
			setDayLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, entryDate, version]);

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
				Inter Card SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-07A — per (section, machine, spell, batch) reading-set: 4 sliver-cut weights + 4 MR%,
				moisture-corrected server-side with section and per-batch averages.
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
				<Alert severity="info">Select a branch to load Inter Card SQC data.</Alert>
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
						<EntryForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={refresh}
						/>
					)}

					<Box>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Readings for {entryDate}
						</Typography>
						<DayGrid
							rows={dayData.rows}
							sectionAverages={dayData.section_averages}
							grandAverages={dayData.grand_averages}
							loading={dayLoading}
							onDeleted={refresh}
						/>
					</Box>

					<Box>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							History
						</Typography>
						<HistoryTable
							coId={coId}
							branchId={branchId}
							version={version}
							onChanged={refresh}
						/>
					</Box>
				</Box>
			)}
		</Box>
	);
}
