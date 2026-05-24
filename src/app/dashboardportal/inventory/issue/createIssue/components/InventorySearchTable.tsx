/**
 * @component InventorySearchTable
 * @description Searchable table for available inventory items from approved SRs.
 * Uses simple HTML table to avoid MUI DataGrid SSR issues.
 */
"use client";

import React from "react";
import {
	Box,
	Paper,
	Typography,
	TextField,
	InputAdornment,
	Button,
	Checkbox,
	CircularProgress,
	Pagination,
} from "@mui/material";
import { Search, Plus, AlertCircle } from "lucide-react";
import { fetchInventoryList, type InventoryListItem } from "@/utils/issueService";
import { useDebounce } from "@/hooks/use-debounce";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from "@/components/ui/table";

type InventorySearchTableProps = {
	/** Company ID for API calls */
	coId: string;
	/** Branch ID to filter inventory */
	branchId: string;
	/** Whether the table is disabled (e.g., in view mode) */
	disabled?: boolean;
	/** Callback when items are selected for insertion */
	onInsertItems: (items: InventoryListItem[]) => void;
};

const PAGE_SIZE = 10;

/**
 * Format date for display
 */
const formatDate = (dateStr: string | null | undefined): string => {
	if (!dateStr) return "-";
	try {
		return new Date(dateStr).toLocaleDateString("en-IN", {
			day: "2-digit",
			month: "short",
			year: "numeric",
		});
	} catch {
		return dateStr;
	}
};

/**
 * Format number for display
 */
const formatNumber = (value: number | null | undefined, decimals = 2): string => {
	if (value == null) return "-";
	return value.toLocaleString("en-IN", {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
	});
};

export function InventorySearchTable({
	coId,
	branchId,
	disabled = false,
	onInsertItems,
}: InventorySearchTableProps) {
	// State
	const [rows, setRows] = React.useState<InventoryListItem[]>([]);
	const [loading, setLoading] = React.useState(false);
	const [error, setError] = React.useState<string | null>(null);
	const [totalRows, setTotalRows] = React.useState(0);
	const [page, setPage] = React.useState(1);
	const [searchValue, setSearchValue] = React.useState("");
	const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());

	// Debounce search
	const debouncedSearch = useDebounce(searchValue, 300);

	// Calculate total pages
	const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

	// Fetch data
	const fetchData = React.useCallback(async () => {
		if (!coId || !branchId) {
			setRows([]);
			setTotalRows(0);
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const result = await fetchInventoryList(coId, {
				branchId,
				page,
				limit: PAGE_SIZE,
				search: debouncedSearch || undefined,
			});

			setRows(result.data);
			setTotalRows(result.total);
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to load inventory";
			setError(message);
			setRows([]);
			setTotalRows(0);
		} finally {
			setLoading(false);
		}
	}, [coId, branchId, page, debouncedSearch]);

	// Fetch on mount and when deps change
	React.useEffect(() => {
		void fetchData();
	}, [fetchData]);

	// Clear selection when data changes
	React.useEffect(() => {
		setSelectedIds(new Set());
	}, [rows]);

	// Handle select all
	const handleSelectAll = React.useCallback(
		(checked: boolean) => {
			if (checked) {
				setSelectedIds(new Set(rows.map((row) => row.inward_dtl_id)));
			} else {
				setSelectedIds(new Set());
			}
		},
		[rows]
	);

	// Handle individual row selection
	const handleSelectRow = React.useCallback((id: number, checked: boolean) => {
		setSelectedIds((prev) => {
			const newSet = new Set(prev);
			if (checked) {
				newSet.add(id);
			} else {
				newSet.delete(id);
			}
			return newSet;
		});
	}, []);

	// Handle insert
	const handleInsert = React.useCallback(() => {
		if (selectedIds.size === 0) return;

		const selectedItems = rows.filter((row) => selectedIds.has(row.inward_dtl_id));

		if (selectedItems.length > 0) {
			onInsertItems(selectedItems);
			setSelectedIds(new Set());
		}
	}, [selectedIds, rows, onInsertItems]);

	// Handle search change
	const handleSearchChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			setSearchValue(event.target.value);
			setPage(1); // Reset to first page on search
		},
		[]
	);

	// Handle page change
	const handlePageChange = React.useCallback(
		(_event: React.ChangeEvent<unknown>, newPage: number) => {
			setPage(newPage);
		},
		[]
	);

	// Check if all rows are selected
	const allSelected = rows.length > 0 && rows.every((row) => selectedIds.has(row.inward_dtl_id));
	const someSelected = rows.some((row) => selectedIds.has(row.inward_dtl_id));

	// Show placeholder if no branch selected
	if (!branchId) {
		return (
			<Paper elevation={0} className="border border-gray-200 rounded-lg p-6">
				<Typography variant="body2" color="text.secondary" className="text-center">
					Select a branch to view available inventory.
				</Typography>
			</Paper>
		);
	}

	return (
		<Paper elevation={0} className="border border-gray-200 rounded-lg overflow-hidden">
			{/* Header */}
			<Box className="p-4 border-b border-gray-200 bg-gray-50">
				<Box className="flex items-center justify-between gap-4">
					<Box>
						<Typography variant="subtitle1" fontWeight={600}>
							Available Inventory
						</Typography>
						<Typography variant="body2" color="text.secondary">
							Search and select items to add to the issue.
						</Typography>
					</Box>
					<Box className="flex items-center gap-3">
						<TextField
							size="small"
							placeholder="Search by item, group, or GRN..."
							value={searchValue}
							onChange={handleSearchChange}
							disabled={disabled}
							slotProps={{
								input: {
									startAdornment: (
										<InputAdornment position="start">
											<Search className="h-4 w-4 text-gray-400" />
										</InputAdornment>
									),
								},
							}}
							sx={{ width: 280 }}
						/>
						<Button
							variant="contained"
							size="small"
							startIcon={<Plus className="h-4 w-4" />}
							onClick={handleInsert}
							disabled={disabled || selectedIds.size === 0}
						>
							Insert to Issue ({selectedIds.size})
						</Button>
					</Box>
				</Box>
			</Box>

			{/* Error display */}
			{error ? (
				<Box className="p-4 bg-red-50 border-b border-red-200 flex items-center gap-2">
					<AlertCircle className="h-4 w-4 text-red-600" />
					<Typography variant="body2" className="text-red-700">
						{error}
					</Typography>
				</Box>
			) : null}

			{/* Table */}
			<Box className="relative">
				{loading && (
					<Box className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center">
						<CircularProgress size={24} />
					</Box>
				)}

				<Table>
					<TableHeader>
						<TableRow>
							{!disabled && (
								<TableHead className="w-10">
									<Checkbox
										size="small"
										checked={allSelected}
										indeterminate={someSelected && !allSelected}
										onChange={(e) => handleSelectAll(e.target.checked)}
										disabled={disabled || rows.length === 0}
									/>
								</TableHead>
							)}
							<TableHead>GRN No</TableHead>
							<TableHead className="w-24">Date</TableHead>
							<TableHead>Item Group</TableHead>
							<TableHead>Item Code</TableHead>
							<TableHead>Item Name</TableHead>
							<TableHead className="w-16">UOM</TableHead>
							<TableHead className="w-20 text-right">Avl Qty</TableHead>
							<TableHead className="w-24 text-right">Rate</TableHead>
							<TableHead>Warehouse</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={disabled ? 9 : 10}
									className="text-center py-8 text-gray-500"
								>
									{debouncedSearch
										? "No items match your search."
										: "No available inventory found."}
								</TableCell>
							</TableRow>
						) : (
							rows.map((row) => (
								<TableRow
									key={row.inward_dtl_id}
									className={
										selectedIds.has(row.inward_dtl_id)
											? "bg-blue-50"
											: undefined
									}
								>
									{!disabled && (
										<TableCell className="w-10">
											<Checkbox
												size="small"
												checked={selectedIds.has(row.inward_dtl_id)}
												onChange={(e) =>
													handleSelectRow(row.inward_dtl_id, e.target.checked)
												}
												disabled={disabled}
											/>
										</TableCell>
									)}
									<TableCell className="font-mono text-xs">
										{row.inward_no || "-"}
									</TableCell>
									<TableCell className="text-xs">
										{formatDate(row.inward_date)}
									</TableCell>
									<TableCell className="text-sm">
										{row.item_grp_name || "-"}
									</TableCell>
									<TableCell className="font-mono text-xs">
										{row.full_item_code || row.item_code || "-"}
									</TableCell>
									<TableCell className="text-sm">
										{row.item_name || "-"}
									</TableCell>
									<TableCell className="text-xs">
										{row.uom_name || "-"}
									</TableCell>
									<TableCell className="text-right font-mono text-sm">
										{formatNumber(row.available_qty, 2)}
									</TableCell>
									<TableCell className="text-right font-mono text-sm">
										{formatNumber(row.rate, 2)}
									</TableCell>
									<TableCell className="text-xs">
										{row.warehouse_name || "-"}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</Box>

			{/* Pagination */}
			{totalPages > 1 && (
				<Box className="p-3 border-t border-gray-200 flex items-center justify-between">
					<Typography variant="body2" color="text.secondary">
						Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
						{Math.min(page * PAGE_SIZE, totalRows)} of {totalRows} items
					</Typography>
					<Pagination
						count={totalPages}
						page={page}
						onChange={handlePageChange}
						size="small"
						color="primary"
					/>
				</Box>
			)}
		</Paper>
	);
}

export default InventorySearchTable;
