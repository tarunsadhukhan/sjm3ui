"use client";

import * as React from "react";
import { Alert, Box, Button, CircularProgress, MenuItem, Tab, Tabs, TextField, Typography } from "@mui/material";
import { Download } from "lucide-react";
import useSelectedCompanyCoId from "@/hooks/use-selected-company-coid";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import { todayISO } from "@/app/dashboardportal/juteProduction/spinning/utils/spinningCalc";
import { useSqcCountSetup } from "./hooks/useSqcCountSetup";
import { useSqcCountByDate } from "./hooks/useSqcCountByDate";
import { useSqcRhmrSetup } from "./hooks/useSqcRhmrSetup";
import { useSqcRhmrSearch } from "./hooks/useSqcRhmrSearch";
import { useSqcQrCvSetup } from "./hooks/useSqcQrCvSetup";
import { useSqcQrCvByDate } from "./hooks/useSqcQrCvByDate";
// Shared target-map editor reused across the juteProduction route boundary:
// the "Actual Speed / TPI" tab writes actuals into jute_prod_spng_target_map,
// the same table the spinning planning grid reads (value_role='actual').
import TargetMapEditor from "../../juteProduction/masters/spngTargetMap/_components/TargetMapEditor";
import CountForm from "./_components/CountForm";
import CountGrid from "./_components/CountGrid";
import RhmrForm from "./_components/RhmrForm";
import RhmrGrid from "./_components/RhmrGrid";
import YarnQrCvForm from "./_components/YarnQrCvForm";
import YarnQrCvGrid from "./_components/YarnQrCvGrid";

const TABS = ["R-08-16 Yarn Parameter", "Actual Speed / TPI", "RHMR", "R-08-15 Yarn QR & CV %"] as const;

export default function SpinningSqcPage() {
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

	// Tab 1 — Actual Speed / TPI (target-map actuals)
	const [entryDate, setEntryDate] = React.useState<string>(todayISO());

	// Tab 2 — Count Observations
	const [countDate, setCountDate] = React.useState<string>(todayISO());
	const {
		setup: countSetup,
		loading: countSetupLoading,
		error: countSetupError,
	} = useSqcCountSetup(coId, countDate, branchId);
	const {
		readings: countReadings,
		averages: countAverages,
		loading: countLoading,
		refresh: refreshCount,
	} = useSqcCountByDate(coId, countDate, branchId);

	const onCountSaved = React.useCallback(() => {
		refreshCount();
	}, [refreshCount]);

	// Excel export of the day's count readings (manual Yarn Test Report format).
	const [exportingCount, setExportingCount] = React.useState(false);
	const handleExportCount = React.useCallback(async () => {
		setExportingCount(true);
		try {
			const { exportYarnTestReport } = await import("./utils/exportYarnTestReport");
			await exportYarnTestReport(countDate, countReadings, countSetup?.yarn_items ?? []);
		} finally {
			setExportingCount(false);
		}
	}, [countDate, countReadings, countSetup]);

	// Tab 3 — RHMR (Temperature / Humidity per date + spell)
	const { setup: rhmrSetup, loading: rhmrSetupLoading, error: rhmrSetupError } = useSqcRhmrSetup(coId, branchId);
	// Search filters: date defaults to today, spell defaults to all (both optional / clearable).
	const [rhmrFilterDate, setRhmrFilterDate] = React.useState<string>(todayISO());
	const [rhmrFilterSpell, setRhmrFilterSpell] = React.useState<number | "">("");
	const {
		rows: rhmrRows,
		loading: rhmrRowsLoading,
		refresh: refreshRhmr,
	} = useSqcRhmrSearch(coId, branchId, rhmrFilterDate || null, rhmrFilterSpell === "" ? null : Number(rhmrFilterSpell));

	const onRhmrSaved = React.useCallback(() => {
		refreshRhmr();
	}, [refreshRhmr]);

	// Tab 4 — R-08-15 Yarn QR% & CV%
	const [qrCvDate, setQrCvDate] = React.useState<string>(todayISO());
	const {
		setup: qrCvSetup,
		loading: qrCvSetupLoading,
		error: qrCvSetupError,
	} = useSqcQrCvSetup(coId, qrCvDate, branchId);
	const {
		groups: qrCvGroups,
		loading: qrCvLoading,
		refresh: refreshQrCv,
	} = useSqcQrCvByDate(coId, qrCvDate, branchId);

	const onQrCvSaved = React.useCallback(() => {
		refreshQrCv();
	}, [refreshQrCv]);

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
				Spinning SQC
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
				Daily yarn parameter, actual speed/TPI entry and count observations.
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
				<Alert severity="info">Select a branch to load Spinning SQC data.</Alert>
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

					{/* Tab 2 — Actual Speed / TPI (writes target-map actuals) */}
					{tab === 1 ? (
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
							<Box>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									Machine
								</Typography>
								<TargetMapEditor
									coId={coId}
									branchId={branchId}
									idType="mcid"
									valueRole="actual"
									effectiveDate={entryDate}
								/>
							</Box>
							<Box>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									Yarn
								</Typography>
								<TargetMapEditor
									coId={coId}
									branchId={branchId}
									idType="qid"
									valueRole="actual"
									effectiveDate={entryDate}
								/>
							</Box>
						</Box>
					) : null}

					{/* Tab 1 — R-08-15 Yarn QR% & CV% (Count Observations) */}
					{tab === 0 ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
								<Typography variant="subtitle2">Observation date</Typography>
								<TextField
									type="date"
									size="small"
									value={countDate}
									onChange={(e) => setCountDate(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
								<Button
									size="small"
									variant="outlined"
									startIcon={<Download size={16} />}
									onClick={handleExportCount}
									disabled={exportingCount || countReadings.length === 0}
								>
									{exportingCount ? "Exporting…" : "Download Excel"}
								</Button>
							</Box>
							{countSetupError ? <Alert severity="error">{countSetupError}</Alert> : null}
							{countSetupLoading || !countSetup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<CountForm
									coId={coId}
									branchId={branchId}
									entryDate={countDate}
									setup={countSetup}
									onSaved={onCountSaved}
								/>
							)}
							<CountGrid
								coId={coId}
								readings={countReadings}
								averages={countAverages}
								yarnItems={countSetup?.yarn_items ?? []}
								loading={countLoading}
								onDeleted={onCountSaved}
							/>
						</Box>
					) : null}

					{/* Tab 3 — RHMR (Temperature / Humidity per date + spell) */}
					{tab === 2 ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
							{rhmrSetupError ? <Alert severity="error">{rhmrSetupError}</Alert> : null}
							{rhmrSetupLoading || !rhmrSetup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<RhmrForm coId={coId} branchId={branchId} setup={rhmrSetup} onSaved={onRhmrSaved} />
							)}

							<Box>
								<Typography variant="subtitle2" sx={{ mb: 1 }}>
									Search RHMR entries
								</Typography>
								<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", mb: 2 }}>
									<TextField
										type="date"
										label="Filter date"
										size="small"
										value={rhmrFilterDate}
										onChange={(e) => setRhmrFilterDate(e.target.value)}
										InputLabelProps={{ shrink: true }}
									/>
									<TextField
										select
										label="Filter spell"
										size="small"
										value={rhmrFilterSpell}
										onChange={(e) =>
											setRhmrFilterSpell(e.target.value === "" ? "" : Number(e.target.value))
										}
										sx={{ minWidth: 180 }}
									>
										<MenuItem value="">
											<em>All spells</em>
										</MenuItem>
										{(rhmrSetup?.spells ?? []).map((s) => (
											<MenuItem key={s.spell_id} value={s.spell_id}>
												{s.spell_code}
											</MenuItem>
										))}
									</TextField>
								</Box>
								<RhmrGrid coId={coId} rows={rhmrRows} loading={rhmrRowsLoading} onDeleted={onRhmrSaved} />
							</Box>
						</Box>
					) : null}

					{/* Tab 4 — R-08-15 Yarn QR% & CV% */}
					{tab === 3 ? (
						<Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
								<Typography variant="subtitle2">Observation date</Typography>
								<TextField
									type="date"
									size="small"
									value={qrCvDate}
									onChange={(e) => setQrCvDate(e.target.value)}
									InputLabelProps={{ shrink: true }}
								/>
							</Box>
							{qrCvSetupError ? <Alert severity="error">{qrCvSetupError}</Alert> : null}
							{qrCvSetupLoading || !qrCvSetup ? (
								<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
									<CircularProgress />
								</Box>
							) : (
								<YarnQrCvForm
									coId={coId}
									branchId={branchId}
									entryDate={qrCvDate}
									setup={qrCvSetup}
									onSaved={onQrCvSaved}
								/>
							)}
							<YarnQrCvGrid
								coId={coId}
								groups={qrCvGroups}
								loading={qrCvLoading}
								onDeleted={onQrCvSaved}
							/>
						</Box>
					) : null}
				</>
			)}
		</Box>
	);
}
