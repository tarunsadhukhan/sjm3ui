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
import type { FabricConstructionBlock, FabricConstructionSetup } from "./types";
import FabricConstructionForm from "./_components/FabricConstructionForm";
import FabricConstructionByDate from "./_components/FabricConstructionByDate";
import FabricConstructionHistory from "./_components/FabricConstructionHistory";

export default function FabricConstructionSqcPage() {
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

	// Create setup (cloth qualities + defaults)
	const [setup, setSetup] = React.useState<FabricConstructionSetup | null>(null);
	const [setupLoading, setSetupLoading] = React.useState(false);
	const [setupError, setSetupError] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (!coId || branchId == null) {
			setSetup(null);
			return;
		}
		let cancelled = false;
		setSetupLoading(true);
		const url = `${apiRoutesPortalMasters.FABRIC_CONSTRUCTION_CREATE_SETUP}?co_id=${coId}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: FabricConstructionSetup }>(url, "GET").then(({ data, error }) => {
			if (cancelled) return;
			setSetupError(error);
			setSetup(error ? null : data?.data ?? null);
			setSetupLoading(false);
		});
		return () => {
			cancelled = true;
		};
	}, [coId, branchId]);

	// By-date blocks (server-computed averages + Std-vs-Actual comparison)
	const [blocks, setBlocks] = React.useState<FabricConstructionBlock[]>([]);
	const [blocksLoading, setBlocksLoading] = React.useState(false);
	const [blocksError, setBlocksError] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (!coId || branchId == null || !entryDate) {
			setBlocks([]);
			return;
		}
		let cancelled = false;
		setBlocksLoading(true);
		const url = `${apiRoutesPortalMasters.FABRIC_CONSTRUCTION_BY_DATE}?co_id=${coId}&entry_date=${entryDate}&branch_id=${branchId}`;
		void fetchWithCookie<{ data: { blocks: FabricConstructionBlock[] } }>(url, "GET").then(
			({ data, error }) => {
				if (cancelled) return;
				setBlocksError(error);
				setBlocks(error ? [] : data?.data?.blocks ?? []);
				setBlocksLoading(false);
			}
		);
		return () => {
			cancelled = true;
		};
	}, [coId, branchId, entryDate, version]);

	const refresh = React.useCallback(() => setVersion((v) => v + 1), []);

	const handleDelete = React.useCallback(
		async (id: number) => {
			if (!confirm(`Delete Fabric Construction block #${id}?`)) return;
			const { error } = await fetchWithCookie<{ message: string }>(
				apiRoutesPortalMasters.FABRIC_CONSTRUCTION_DELETE,
				"POST",
				{ fabric_const_id: id, co_id: Number(coId) }
			);
			if (error) {
				setSnack(error);
				return;
			}
			setSnack(`Deleted Fabric Construction block #${id}`);
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
				Fabric Construction SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				R-08-19 — woven cloth construction audit. One save = one quality block: a standard
				snapshot plus up to 5 sample rows; oz/yd and MR-corrected oz are computed server-side.
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
				<Alert severity="info">Select a branch to load Fabric Construction SQC data.</Alert>
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
						<FabricConstructionForm
							coId={coId}
							branchId={branchId}
							entryDate={entryDate}
							setup={setup}
							onSaved={refresh}
						/>
					)}

					<Divider />

					<Typography variant="subtitle2">Entries on {entryDate}</Typography>
					{blocksError ? <Alert severity="error">{blocksError}</Alert> : null}
					<FabricConstructionByDate blocks={blocks} loading={blocksLoading} onDelete={handleDelete} />

					<Divider />

					<Typography variant="subtitle2">History</Typography>
					<FabricConstructionHistory coId={coId} version={version} onDelete={handleDelete} />
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
