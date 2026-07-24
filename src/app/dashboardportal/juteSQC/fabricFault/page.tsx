"use client";

import * as React from "react";
import {
	Alert,
	Box,
	CircularProgress,
	Divider,
	MenuItem,
	Snackbar,
	TextField,
	Typography,
} from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import type { FabricFaultByDateData, FabricFaultSetup } from "./types";
import FabricFaultForm from "./_components/FabricFaultForm";
import FabricFaultByDate from "./_components/FabricFaultByDate";
import FabricFaultHistory from "./_components/FabricFaultHistory";

export default function FabricFaultSqcPage() {
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
	// Bumped on save/delete: refreshes the by-date view AND the history table.
	const [version, setVersion] = React.useState(0);
	const [snack, setSnack] = React.useState<string | null>(null);

	// Create setup (qualities + looms + spells + the fixed fault-type list)
	const [setup, setSetup] = React.useState<FabricFaultSetup | null>(null);
	const [setupLoading, setSetupLoading] = React.useState(false);
	const [setupError, setSetupError] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (!coId || branchId == null) {
			setSetup(null);
			return;
		}
		let cancelled = false;
		setSetupLoading(true);
		const url = `${apiRoutesPortalMasters.FABRIC_FAULT_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: FabricFaultSetup }>(url, "GET").then(({ data, error }) => {
			if (cancelled) return;
			setSetupError(error);
			setSetup(error ? null : data?.data ?? null);
			setSetupLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId]);

	// By-date pieces + server-computed day roll-up (totals, scores, grand total/score)
	const [byDate, setByDate] = React.useState<FabricFaultByDateData | null>(null);
	const [byDateLoading, setByDateLoading] = React.useState(false);
	const [byDateError, setByDateError] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (!coId || branchId == null || !entryDate) {
			setByDate(null);
			return;
		}
		let cancelled = false;
		setByDateLoading(true);
		const url = `${apiRoutesPortalMasters.FABRIC_FAULT_BY_DATE}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: FabricFaultByDateData }>(url, "GET").then(({ data, error }) => {
			if (cancelled) return;
			setByDateError(error);
			setByDate(error ? null : data?.data ?? null);
			setByDateLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, entryDate, version]);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!confirm(`Delete Fabric Fault piece #${id}?`)) return;
			const { error } = await fetchWithCookie<{ message: string }>(
				apiRoutesPortalMasters.FABRIC_FAULT_DELETE,
				"POST",
				{ fabric_fault_id: id, co_id: Number(coId) }
			);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted Fabric Fault piece #${id}`);
			refresh();
		},
		[coId, refresh]
	);

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
				Fabric Fault SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-28 — woven cloth defect tally. One save = one inspected piece with its fixed
				fault checklist; the day roll-up (per-fault totals and scores) is computed server-side.
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
				<Alert severity="info">Select a branch to load Fabric Fault SQC data.</Alert>
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
						<FabricFaultForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={refresh}
						/>
					)}

					<Divider />

					<Typography variant="subtitle2">Day roll-up for {entryDate}</Typography>
					{byDateError ? <Alert severity="error">{byDateError}</Alert> : null}
					<FabricFaultByDate data={byDate} loading={byDateLoading} onDelete={handleDelete} />

					<Divider />

					<Typography variant="subtitle2">History</Typography>
					<FabricFaultHistory coId={coId} version={version} onDelete={handleDelete} />
				</Box>
			)}

			<Snackbar
				open={!!snack}
				autoHideDuration={3000}
				onClose={() => setSnack(null)}
				message={snack ?? ""}
			/>
		</Box>
	);
}
