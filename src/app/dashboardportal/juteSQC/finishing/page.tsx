"use client";

import * as React from "react";
import {
	Alert,
	Box,
	MenuItem,
	Snackbar,
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from "@mui/material";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import TargetGrid, {
	type DirtyCell,
	type IdType,
	type TargetGridData,
} from "./_components/TargetGrid";

// Finishing SQC captures ACTUAL operating parameters per (process, machine|quality)
// into jute_prod_finishing_target_map — the SQC endpoints proxy the finishing
// spec-sheet grid/bulk_save with value_role forced to 'actual' server-side, so this
// page never sends a value_role.

const ID_TYPE_LABELS: Record<IdType, string> = { mcid: "Machine", qid: "Quality" };

// Display labels for known finishing params; unknown params fall back to the raw key.
const PARAM_LABELS: Record<string, string> = {
	speed: "Speed",
	bowl_temp: "Bowl Temp",
	moisture_add_pct: "Moisture Add %",
	std_prod_yds: "Std Prod (Yds)",
	target_pcs: "Target Pcs",
	pcs_per_bundle: "Pcs / Bundle",
	bundles: "Bundles",
	no_of_bales: "No. of Bales",
};

const EMPTY_GRID: TargetGridData = Object.freeze({ params: [], rows: [] });

// Process tokens are machine-friendly ('sacksewing', 'balepress'); title-case them.
const processLabel = (p: string): string =>
	p.charAt(0).toUpperCase() + p.slice(1);

type SetupData = {
	processes?: string[];
	id_types?: string[];
};

export default function FinishingSqcPage() {
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

	// --- Selectors: process (from setup), ref type, entry date ---------------
	const [processes, setProcesses] = React.useState<string[]>([]);
	const [process, setProcess] = React.useState<string>("");
	const [idType, setIdType] = React.useState<IdType>("mcid");
	const [effectiveDate, setEffectiveDate] = React.useState<string>(todayISO());

	// --- Grid state -----------------------------------------------------------
	const [grid, setGrid] = React.useState<TargetGridData>(EMPTY_GRID);
	const [loading, setLoading] = React.useState(false);
	const [saving, setSaving] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [snack, setSnack] = React.useState<string | null>(null);

	// Setup: process list only — the grid endpoint returns its own params/rows,
	// so machines/qualities from setup are not needed here.
	React.useEffect(() => {
		if (!coId) return;
		let cancelled = false;
		(async () => {
			const { data, error: err } = await fetchWithCookie<{ data: SetupData }>(
				`${apiRoutesPortalMasters.FINISHING_SQC_SETUP}?co_id=${coId}`,
				"GET"
			);
			if (cancelled) return;
			if (err) {
				setError(err);
				return;
			}
			const procs = data?.data?.processes ?? [];
			setProcesses(procs);
			setProcess((prev) => (prev && procs.includes(prev) ? prev : ""));
		})();
		return () => {
			cancelled = true;
		};
	}, [coId]);

	const refresh = React.useCallback(async () => {
		if (!coId || branchId == null || !process || !effectiveDate) {
			setGrid(EMPTY_GRID);
			return;
		}
		setLoading(true);
		setError(null);
		const params = new URLSearchParams({
			co_id: String(coId),
			branch_id: String(branchId),
			process,
			id_type: idType,
			effective_date: effectiveDate,
		});
		const { data, error: err } = await fetchWithCookie<{ data: TargetGridData }>(
			`${apiRoutesPortalMasters.FINISHING_SQC_ACTUAL_GRID}?${params.toString()}`,
			"GET"
		);
		if (err) {
			setError(err);
			setGrid(EMPTY_GRID);
		} else {
			setGrid(data?.data ?? EMPTY_GRID);
		}
		setLoading(false);
	}, [coId, branchId, process, idType, effectiveDate]);

	React.useEffect(() => {
		void refresh();
	}, [refresh]);

	const handleSave = async (cells: DirtyCell[]) => {
		if (!coId || !process || cells.length === 0) return;
		setSaving(true);
		setError(null);
		try {
			const { data, error: err } = await fetchWithCookie<{
				data: { inserted: number; updated: number; cleared: number };
			}>(apiRoutesPortalMasters.FINISHING_SQC_ACTUAL_SAVE, "POST", {
				co_id: Number(coId),
				branch_id: branchId != null ? Number(branchId) : null,
				process,
				effective_date: effectiveDate,
				id_type: idType,
				cells,
			});
			if (err) {
				setError(err);
				return;
			}
			const d = data?.data;
			setSnack(
				`Saved — inserted ${d?.inserted ?? 0}, updated ${d?.updated ?? 0}, cleared ${d?.cleared ?? 0}.`
			);
			await refresh();
		} finally {
			setSaving(false);
		}
	};

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
				Finishing SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Enter actual operating parameters per finishing machine / quality and date. Saving writes the
				actuals into the finishing spec sheet (value_role=&apos;actual&apos;) for the chosen process.
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
				<Alert severity="info">Select a branch to load Finishing SQC data.</Alert>
			) : (
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
					{error ? (
						<Alert severity="error" onClose={() => setError(null)}>
							{error}
						</Alert>
					) : null}

					<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
						<TextField
							select
							size="small"
							label="Process"
							value={process}
							onChange={(e) => setProcess(e.target.value)}
							sx={{ minWidth: 200 }}
						>
							{processes.map((p) => (
								<MenuItem key={p} value={p}>
									{processLabel(p)}
								</MenuItem>
							))}
						</TextField>

						<ToggleButtonGroup
							exclusive
							size="small"
							value={idType}
							onChange={(_, v: IdType | null) => {
								if (v) setIdType(v);
							}}
						>
							{(Object.keys(ID_TYPE_LABELS) as IdType[]).map((t) => (
								<ToggleButton key={t} value={t}>
									{ID_TYPE_LABELS[t]}
								</ToggleButton>
							))}
						</ToggleButtonGroup>

						<TextField
							type="date"
							size="small"
							label="Entry date"
							value={effectiveDate}
							onChange={(e) => setEffectiveDate(e.target.value)}
							InputLabelProps={{ shrink: true }}
						/>
					</Box>

					{!process ? (
						<Alert severity="info">Select a process to load its actuals grid.</Alert>
					) : (
						<TargetGrid
							grid={grid}
							loading={loading}
							saving={saving}
							effectiveDate={effectiveDate}
							refLabel={ID_TYPE_LABELS[idType]}
							paramLabels={PARAM_LABELS}
							onSave={(cells) => void handleSave(cells)}
						/>
					)}

					<Snackbar
						open={!!snack}
						autoHideDuration={4000}
						onClose={() => setSnack(null)}
						message={snack ?? ""}
					/>
				</Box>
			)}
		</Box>
	);
}
