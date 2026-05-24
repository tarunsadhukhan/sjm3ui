"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Snackbar, Alert, Button, Tabs, Tab, Box, IconButton } from "@mui/material";
import { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import { ChevronRight, ChevronDown } from "lucide-react";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import ManMachineFinalProcessDialog from "./ManMachineFinalProcessDialog";

type Row = Record<string, unknown> & { id: string | number };

type TabKey = "dept_summary" | "summary" | "details";

const TAB_TITLES: Record<TabKey, string> = {
	dept_summary: "Daily Man-Machine — Dept Wise Summary",
	summary: "Daily Man-Machine — Summary",
	details: "Daily Man-Machine — Details",
};

const NUMERIC_FIELDS = [
	"shift_a",
	"shift_b",
	"shift_c",
	"total_hands",
	"thands_a",
	"thands_b",
	"thands_c",
	"total_target",
	"total_excess_short",
];

export default function DailyManMachinePage() {
	const { selectedBranches } = useSidebarContext();
	const [activeTab, setActiveTab] = useState<TabKey>("dept_summary");
	const [rows, setRows] = useState<Row[]>([]);
	const [rawDetails, setRawDetails] = useState<Row[]>([]);
	const [columnDefs, setColumnDefs] = useState<Array<{ field: string; headerName: string }>>([]);
	const [loading, setLoading] = useState(true);
	const [totalRows, setTotalRows] = useState(0);
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
		pageSize: 10,
		page: 0,
	});
	const [searchQuery, setSearchQuery] = useState("");
	const [snackbar, setSnackbar] = useState<{
		open: boolean;
		message: string;
		severity: "success" | "error";
	}>({ open: false, message: "", severity: "success" });

	const [finalProcessOpen, setFinalProcessOpen] = useState(false);
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});

	const getCoId = useCallback((): string => {
		const selectedCompany = localStorage.getItem("sidebar_selectedCompany");
		return selectedCompany ? JSON.parse(selectedCompany).co_id : "";
	}, []);

	const fetchRows = useCallback(async () => {
		setLoading(true);
		try {
			const co_id = getCoId();
			if (!co_id) throw new Error("No company selected");

			// Tabs that build subtotals/trees client-side need ALL rows.
			const fetchAll = activeTab === "details" || activeTab === "dept_summary";

			const queryParams = new URLSearchParams({
				co_id,
				tab: activeTab,
				page: fetchAll ? "1" : String((paginationModel.page ?? 0) + 1),
				limit: fetchAll ? "10000" : String(paginationModel.pageSize ?? 10),
			});
			if (selectedBranches.length) {
				queryParams.append("branch_id", selectedBranches.join(","));
			}
			if (searchQuery) queryParams.append("search", searchQuery);

			const { data, error } = await fetchWithCookie<{
				data: Array<Record<string, unknown>>;
				total: number;
				columns: Array<{ field: string; headerName: string }>;
			}>(`${apiRoutesPortalMasters.MAN_MACHINE_LIST}?${queryParams}`, "GET");

			if (error || !data) throw new Error(error || "Failed to fetch man-machine data");

			const raw = data.data || [];
			const mapped: Row[] = raw.map((r, idx) => ({
				...r,
				id: `${idx}-${String(r.tran_date ?? r.attendance_date ?? "")}-${String(r.dept_desc ?? r.dept ?? "")}-${String(r.desig ?? "")}`,
			}));

			if (activeTab === "details") {
				setRawDetails(mapped);
				setRows([]);
				setColumnDefs(data.columns ?? []);
				setTotalRows(0);
				return;
			}

			// Insert "Day Total" subtotal row after each day's depts (dept_summary only).
			let finalRows: Row[] = mapped;
			if (activeTab === "dept_summary" && mapped.length) {
				const out: Row[] = [];
				let currentDate: unknown = undefined;
				let bucket: Row[] = [];
				const flush = () => {
					if (!bucket.length) return;
					const totals: Record<string, number> = {};
					for (const f of NUMERIC_FIELDS) totals[f] = 0;
					for (const r of bucket) {
						for (const f of NUMERIC_FIELDS) {
							const v = r[f];
							const n = typeof v === "number" ? v : Number(v);
							if (Number.isFinite(n)) totals[f] += n;
						}
					}
					out.push(...bucket);
					out.push({
						id: `__total__-${String(currentDate ?? "")}`,
						dept_desc: "Day Total",
						tran_date: currentDate,
						...totals,
						__isTotal: true,
					} as Row);
					bucket = [];
				};
				for (const r of mapped) {
					const d = r.tran_date;
					if (currentDate === undefined) currentDate = d;
					if (d !== currentDate) {
						flush();
						currentDate = d;
					}
					bucket.push(r);
				}
				flush();
				finalRows = out;
			}

			setRows(finalRows);
			setColumnDefs(data.columns ?? []);
			setTotalRows(data.total || 0);
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Error fetching man-machine data";
			setSnackbar({ open: true, message, severity: "error" });
		} finally {
			setLoading(false);
		}
	}, [activeTab, paginationModel.page, paginationModel.pageSize, searchQuery, getCoId, selectedBranches]);

	useEffect(() => {
		fetchRows();
	}, [fetchRows]);

	const handlePaginationModelChange = (newModel: GridPaginationModel) => {
		setPaginationModel(newModel);
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchQuery(e.target.value);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	};

	const handleSnackbarClose = () => {
		setSnackbar((prev) => ({ ...prev, open: false }));
	};

	const handleFinalProcessClick = useCallback(() => setFinalProcessOpen(true), []);
	const handleFinalProcessClose = useCallback(() => setFinalProcessOpen(false), []);
	const handleProcessSuccess = useCallback(
		(message: string) => {
			setSnackbar({ open: true, message, severity: "success" });
			fetchRows();
		},
		[fetchRows],
	);

	const handleTabChange = useCallback((_: React.SyntheticEvent, value: TabKey) => {
		setActiveTab(value);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, []);

	const toggleNode = useCallback((key: string) => {
		setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
	}, []);

	// Build flat list for the Details tab tree:
	//   level 0 = Date  (day-wise summary)
	//   level 1 = Dept  (dept-wise summary for that date)
	//   level 2 = Designation (leaf row from BE)
	const detailsTreeRows = useMemo<Row[]>(() => {
		if (activeTab !== "details" || !rawDetails.length) return [];

		const dateMap = new Map<string, Map<string, Row[]>>();
		for (const r of rawDetails) {
			const date = String(r.tran_date ?? "");
			const dept = String(r.dept_desc ?? "");
			if (!dateMap.has(date)) dateMap.set(date, new Map());
			const deptMap = dateMap.get(date)!;
			if (!deptMap.has(dept)) deptMap.set(dept, []);
			deptMap.get(dept)!.push(r);
		}

		const sumRows = (rs: Row[]): Record<string, number> => {
			const t: Record<string, number> = {};
			for (const f of NUMERIC_FIELDS) t[f] = 0;
			for (const r of rs) {
				for (const f of NUMERIC_FIELDS) {
					const v = r[f];
					const n = typeof v === "number" ? v : Number(v);
					if (Number.isFinite(n)) t[f] += n;
				}
			}
			return t;
		};

		const out: Row[] = [];
		for (const [date, deptMap] of dateMap) {
			const allDate = Array.from(deptMap.values()).flat();
			const dateTotals = sumRows(allDate);
			const dateKey = date;
			out.push({
				id: `d::${dateKey}`,
				__nodeKey: dateKey,
				__level: 0,
				__hasChildren: deptMap.size > 0,
				tran_date: date,
				dept_desc: "",
				desig: "",
				...dateTotals,
			} as Row);
			if (!expanded[dateKey]) continue;

			for (const [dept, deptRows] of deptMap) {
				const deptKey = `${dateKey}||${dept}`;
				const deptTotals = sumRows(deptRows);
				out.push({
					id: `dp::${deptKey}`,
					__nodeKey: deptKey,
					__level: 1,
					__hasChildren: deptRows.length > 0,
					tran_date: "",
					dept_desc: dept,
					desig: "",
					...deptTotals,
				} as Row);
				if (!expanded[deptKey]) continue;

				for (const lr of deptRows) {
					out.push({
						...lr,
						id: `l::${deptKey}||${String(lr.desig ?? "")}::${lr.id}`,
						__level: 2,
						__hasChildren: false,
						tran_date: "",
						dept_desc: "",
					} as Row);
				}
			}
		}
		return out;
	}, [activeTab, rawDetails, expanded]);

	const columns = useMemo<GridColDef<Row>[]>(() => {
		if (!columnDefs.length) return [];

		const isTree = activeTab === "details";

		const fmt = (val: unknown): string => {
			if (val === null || val === undefined || val === "") return "";
			const n = typeof val === "number" ? val : Number(val);
			if (Number.isFinite(n)) return n.toFixed(2);
			return String(val);
		};

		const renderText = (params: GridRenderCellParams<Row>) => {
			const isTotal = params.row?.__isTotal === true;
			return (
				<Box
					sx={{
						width: "100%",
						height: "100%",
						display: "flex",
						alignItems: "center",
						px: 1,
						fontWeight: isTotal ? 700 : undefined,
					}}
				>
					{String(params.value ?? "")}
				</Box>
			);
		};

		const renderNumeric = (params: GridRenderCellParams<Row>) => {
			const level = (params.row?.__level as number | undefined) ?? -1;
			const isTotal = params.row?.__isTotal === true;
			const isNode = level === 0 || level === 1;
			return (
				<Box
					sx={{
						width: "100%",
						textAlign: "right",
						px: 1,
						fontWeight: isTotal || isNode ? 700 : undefined,
					}}
				>
					{fmt(params.value)}
				</Box>
			);
		};

		const NUMERIC_FIELD_RE = /^(shift_|thands_|hands_|extra_short_|total_)/;

		const result: GridColDef<Row>[] = [];

		if (isTree) {
			result.push({
				field: "__tree",
				headerName: "Date / Department / Designation",
				flex: 1.4,
				minWidth: 280,
				sortable: false,
				renderCell: (params) => {
					const lvl = (params.row?.__level as number | undefined) ?? -1;
					const has = params.row?.__hasChildren === true;
					const key = String(params.row?.__nodeKey ?? "");
					const isOpen = !!expanded[key];
					let label = "";
					if (lvl === 0) label = String(params.row?.tran_date ?? "");
					else if (lvl === 1) label = String(params.row?.dept_desc ?? "");
					else label = String(params.row?.desig ?? "");
					const indent = lvl * 18;
					return (
						<Box
							sx={{
								width: "100%",
								height: "100%",
								display: "flex",
								alignItems: "center",
								pl: `${indent}px`,
								pr: 1,
								fontWeight: lvl === 0 || lvl === 1 ? 700 : undefined,
							}}
						>
							{has ? (
								<IconButton
									size="small"
									onClick={() => toggleNode(key)}
									sx={{ mr: 0.5, p: 0.25 }}
									aria-label={isOpen ? "Collapse" : "Expand"}
								>
									{isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
								</IconButton>
							) : (
								<Box sx={{ width: 22 }} />
							)}
							<Box>{label}</Box>
						</Box>
					);
				},
			});
		}

		for (const c of columnDefs) {
			if (c.field === "id") continue;
			// In tree mode, hide the columns shown in the synthetic tree column.
			if (isTree && (c.field === "tran_date" || c.field === "dept_desc" || c.field === "desig")) continue;

			const isNumeric = NUMERIC_FIELD_RE.test(c.field);
			result.push({
				field: c.field,
				headerName: c.headerName,
				flex: 1,
				minWidth: 110,
				renderCell: isNumeric ? renderNumeric : renderText,
			});
		}
		return result;
	}, [columnDefs, activeTab, expanded, toggleNode]);

	const visibleRows = useMemo<Row[]>(() => {
		if (activeTab === "details") return detailsTreeRows;
		if (activeTab === "dept_summary") {
			const start = paginationModel.page * paginationModel.pageSize;
			return rows.slice(start, start + paginationModel.pageSize);
		}
		return rows;
	}, [activeTab, detailsTreeRows, rows, paginationModel.page, paginationModel.pageSize]);

	const visibleRowCount =
		activeTab === "details"
			? detailsTreeRows.length
			: activeTab === "dept_summary"
			? rows.length
			: totalRows;

	const tabsContent = (
		<Tabs
			value={activeTab}
			onChange={handleTabChange}
			textColor="primary"
			indicatorColor="primary"
		>
			<Tab value="dept_summary" label="Dept Wise Summary" />
			<Tab value="summary" label="Summary" />
			<Tab value="details" label="Details" />
		</Tabs>
	);

	return (
		<IndexWrapper
			title={TAB_TITLES[activeTab]}
			rows={visibleRows}
			columns={columns}
			rowCount={visibleRowCount}
			paginationModel={paginationModel}
			onPaginationModelChange={handlePaginationModelChange}
			loading={loading}
			showLoadingUntilLoaded
			toolbarContent={tabsContent}
			search={{
				value: searchQuery,
				onChange: handleSearchChange,
				placeholder: "Search",
				debounceDelayMs: 500,
			}}
			extraActions={
				<Button variant="contained" color="success" onClick={handleFinalProcessClick}>
					Final Process
				</Button>
			}
			getRowClassName={(params) => {
				if (activeTab !== "dept_summary" && activeTab !== "details") return "";
				const v = (params.row as Row)?.total_excess_short;
				const n = typeof v === "number" ? v : Number(v);
				if (!Number.isFinite(n)) return "";
				const isTotal = (params.row as Row)?.__isTotal === true;
				const level = ((params.row as Row)?.__level as number | undefined) ?? -1;
				const strong = isTotal || level === 0 || level === 1;
				if (n > 0) return strong ? "row-pos row-pos-strong" : "row-pos";
				if (n < 0) return strong ? "row-neg row-neg-strong" : "row-neg";
				return "";
			}}
			extraSx={{
				"& .MuiDataGrid-row.row-pos": {
					backgroundColor: "rgba(76, 175, 80, 0.18)",
					"&:hover": { backgroundColor: "rgba(76, 175, 80, 0.28)" },
				},
				"& .MuiDataGrid-row.row-pos-strong": {
					backgroundColor: "rgba(76, 175, 80, 0.35)",
					"&:hover": { backgroundColor: "rgba(76, 175, 80, 0.45)" },
				},
				"& .MuiDataGrid-row.row-neg": {
					backgroundColor: "rgba(244, 67, 54, 0.18)",
					"&:hover": { backgroundColor: "rgba(244, 67, 54, 0.28)" },
				},
				"& .MuiDataGrid-row.row-neg-strong": {
					backgroundColor: "rgba(244, 67, 54, 0.35)",
					"&:hover": { backgroundColor: "rgba(244, 67, 54, 0.45)" },
				},
			}}
		>
			<ManMachineFinalProcessDialog
				open={finalProcessOpen}
				onClose={handleFinalProcessClose}
				onSuccess={handleProcessSuccess}
			/>
			<Snackbar
				open={snackbar.open}
				autoHideDuration={4000}
				onClose={handleSnackbarClose}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
			>
				<Alert
					severity={snackbar.severity}
					onClose={handleSnackbarClose}
					sx={{ width: "100%" }}
				>
					{snackbar.message}
				</Alert>
			</Snackbar>
		</IndexWrapper>
	);
}
