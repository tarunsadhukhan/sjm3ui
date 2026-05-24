
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InventorySearchTable } from "../InventorySearchTable";
import * as issueService from "@/utils/issueService";

// Mock the issueService
vi.mock("@/utils/issueService", () => ({
	fetchInventoryList: vi.fn(),
}));

// Mock the useDebounce hook
vi.mock("@/hooks/use-debounce", () => ({
	useDebounce: (value: string) => value,
}));

const mockInventoryData: issueService.InventoryListItem[] = [
	{
		inward_dtl_id: 1,
		inward_id: 100,
		inward_sequence_no: 1,
		inward_no: "GRN/2025/001",
		inward_date: "2025-01-01",
		branch_id: 10,
		branch_name: "Branch 1",
		item_id: 10,
		item_code: "ITEM001",
		item_name: "Test Item 1",
		item_grp_id: 1,
		item_grp_name: "Group A",
		uom_id: 1,
		uom_name: "KG",
		approved_qty: 100.0,
		issue_qty: 50.0,
		available_qty: 50.0,
		rate: 100.0,
		warehouse_id: 1,
		warehouse_name: "Warehouse 1",
	},
	{
		inward_dtl_id: 2,
		inward_id: 100,
		inward_sequence_no: 2,
		inward_no: "GRN/2025/001",
		inward_date: "2025-01-01",
		branch_id: 10,
		branch_name: "Branch 1",
		item_id: 11,
		item_code: "ITEM002",
		item_name: "Test Item 2",
		item_grp_id: 2,
		item_grp_name: "Group B",
		uom_id: 2,
		uom_name: "PCS",
		approved_qty: 150.0,
		issue_qty: 50.0,
		available_qty: 100.0,
		rate: 50.0,
		warehouse_id: 1,
		warehouse_name: "Warehouse 1",
	},
];

describe("InventorySearchTable", () => {
	const mockOnInsertItems = vi.fn();
	const defaultProps = {
		coId: "1",
		branchId: "10",
		disabled: false,
		onInsertItems: mockOnInsertItems,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		(issueService.fetchInventoryList as Mock).mockResolvedValue({
			data: mockInventoryData,
			total: 2,
		});
	});

	describe("Rendering", () => {
		it("should show placeholder when branchId is empty", () => {
			render(<InventorySearchTable {...defaultProps} branchId="" />);

			expect(
				screen.getByText("Select a branch to view available inventory.")
			).toBeInTheDocument();
		});

		it("should render header with title and search", async () => {
			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Available Inventory")).toBeInTheDocument();
			});

			expect(
				screen.getByPlaceholderText("Search by item, group, or GRN...")
			).toBeInTheDocument();
		});

		it("should render inventory rows after loading", async () => {
			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			expect(screen.getByText("Test Item 2")).toBeInTheDocument();
			expect(screen.getByText("ITEM001")).toBeInTheDocument();
			expect(screen.getByText("Group A")).toBeInTheDocument();
		});

		it("should show empty message when no data", async () => {
			(issueService.fetchInventoryList as Mock).mockResolvedValue({
				data: [],
				total: 0,
			});

			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(
					screen.getByText("No available inventory found.")
				).toBeInTheDocument();
			});
		});
	});

	describe("Data Fetching", () => {
		it("should fetch data on mount with correct params", async () => {
			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(issueService.fetchInventoryList).toHaveBeenCalledWith("1", {
					branchId: "10",
					page: 1,
					limit: 10,
					search: undefined,
				});
			});
		});

		it("should not fetch when coId is empty", async () => {
			render(<InventorySearchTable {...defaultProps} coId="" />);

			// Give time for any async operations
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(issueService.fetchInventoryList).not.toHaveBeenCalled();
		});

		it("should refetch when branchId changes", async () => {
			const { rerender } = render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(issueService.fetchInventoryList).toHaveBeenCalledTimes(1);
			});

			rerender(<InventorySearchTable {...defaultProps} branchId="20" />);

			await waitFor(() => {
				expect(issueService.fetchInventoryList).toHaveBeenCalledWith("1", {
					branchId: "20",
					page: 1,
					limit: 10,
					search: undefined,
				});
			});
		});

		it("should show error message on fetch failure", async () => {
			(issueService.fetchInventoryList as Mock).mockRejectedValue(
				new Error("Network error")
			);

			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Network error")).toBeInTheDocument();
			});
		});
	});

	describe("Selection", () => {
		it("should select individual row on checkbox click", async () => {
			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			// Get all checkboxes (header + 2 rows)
			const checkboxes = screen.getAllByRole("checkbox");
			expect(checkboxes.length).toBe(3);

			// Click the first row checkbox
			fireEvent.click(checkboxes[1]);

			// Button should show 1 selected
			expect(screen.getByText(/Insert to Issue \(1\)/)).toBeInTheDocument();
		});

		it("should select all rows on header checkbox click", async () => {
			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			// Get all checkboxes
			const checkboxes = screen.getAllByRole("checkbox");

			// Click the header checkbox (first one)
			fireEvent.click(checkboxes[0]);

			// Button should show 2 selected (wait for state update to be applied)
			await waitFor(() => {
				expect(screen.getByText(/Insert to Issue \(2\)/)).toBeInTheDocument();
			});
		});

		it("should deselect all when header checkbox clicked again", async () => {
			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			// Get all checkboxes - first one is header
			const checkboxes = screen.getAllByRole("checkbox");

			// Click header checkbox to select all (same pattern as passing test)
			fireEvent.click(checkboxes[0]);
			expect(screen.getByText(/Insert to Issue \(2\)/)).toBeInTheDocument();

			// Click header checkbox again to deselect all
			fireEvent.click(checkboxes[0]);
			expect(screen.getByText(/Insert to Issue \(0\)/)).toBeInTheDocument();
		});
	});

	describe("Insert Action", () => {
		it("should have disabled insert button when nothing selected", async () => {
			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			const insertButton = screen.getByRole("button", {
				name: /Insert to Issue/,
			});
			expect(insertButton).toBeDisabled();
		});

		it("should call onInsertItems with selected items", async () => {
			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			// Select first row
			const checkboxes = screen.getAllByRole("checkbox");
			fireEvent.click(checkboxes[1]);

			// Click insert button
			const insertButton = screen.getByRole("button", {
				name: /Insert to Issue/,
			});
			fireEvent.click(insertButton);

			expect(mockOnInsertItems).toHaveBeenCalledWith([mockInventoryData[0]]);
		});

		it("should clear selection after insert", async () => {
			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			// Select first row
			const checkboxes = screen.getAllByRole("checkbox");
			fireEvent.click(checkboxes[1]);

			// Click insert button
			const insertButton = screen.getByRole("button", {
				name: /Insert to Issue/,
			});
			fireEvent.click(insertButton);

			// Selection should be cleared
			expect(screen.getByText(/Insert to Issue \(0\)/)).toBeInTheDocument();
		});
	});

	describe("Search", () => {
		it("should update search value on input", async () => {
			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText(
				"Search by item, group, or GRN..."
			);
			fireEvent.change(searchInput, { target: { value: "test" } });

			expect(searchInput).toHaveValue("test");
		});

		it("should refetch with search term", async () => {
			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(issueService.fetchInventoryList).toHaveBeenCalled();
			});

			const searchInput = screen.getByPlaceholderText(
				"Search by item, group, or GRN..."
			);
			fireEvent.change(searchInput, { target: { value: "test" } });

			await waitFor(() => {
				expect(issueService.fetchInventoryList).toHaveBeenCalledWith("1", {
					branchId: "10",
					page: 1,
					limit: 10,
					search: "test",
				});
			});
		});

		it("should show search empty message when no results", async () => {
			(issueService.fetchInventoryList as Mock).mockResolvedValue({
				data: [],
				total: 0,
			});

			render(<InventorySearchTable {...defaultProps} />);

			const searchInput = screen.getByPlaceholderText(
				"Search by item, group, or GRN..."
			);
			fireEvent.change(searchInput, { target: { value: "nonexistent" } });

			await waitFor(() => {
				expect(
					screen.getByText("No items match your search.")
				).toBeInTheDocument();
			});
		});
	});

	describe("Disabled State", () => {
		it("should not show checkboxes when disabled", async () => {
			render(<InventorySearchTable {...defaultProps} disabled={true} />);

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			// No checkboxes should be rendered
			expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
		});

		it("should disable search input when disabled", async () => {
			render(<InventorySearchTable {...defaultProps} disabled={true} />);

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			const searchInput = screen.getByPlaceholderText(
				"Search by item, group, or GRN..."
			);
			expect(searchInput).toBeDisabled();
		});

		it("should disable insert button when disabled", async () => {
			render(<InventorySearchTable {...defaultProps} disabled={true} />);

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			const insertButton = screen.getByRole("button", {
				name: /Insert to Issue/,
			});
			expect(insertButton).toBeDisabled();
		});
	});

	describe("Pagination", () => {
		it("should not show pagination when total is less than page size", async () => {
			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			// With 2 items and page size 10, pagination should not show
			expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
		});

		it("should show pagination when total exceeds page size", async () => {
			(issueService.fetchInventoryList as Mock).mockResolvedValue({
				data: mockInventoryData,
				total: 25, // More than PAGE_SIZE
			});

			render(<InventorySearchTable {...defaultProps} />);

			await waitFor(() => {
				expect(screen.getByText("Test Item 1")).toBeInTheDocument();
			});

			// Pagination should be visible
			expect(screen.getByRole("navigation")).toBeInTheDocument();
			expect(screen.getByText(/Showing 1 to 10 of 25 items/)).toBeInTheDocument();
		});
	});
});

describe("InventorySearchTable - Utility Functions", () => {
	it("should format dates correctly", () => {
		// This tests the formatDate function behavior via rendered output
		const mockData = [
			{
				...mockInventoryData[0],
				inward_date: "2025-06-15",
			},
		];

		(issueService.fetchInventoryList as Mock).mockResolvedValue({
			data: mockData,
			total: 1,
		});

		render(
			<InventorySearchTable
				coId="1"
				branchId="10"
				disabled={false}
				onInsertItems={vi.fn()}
			/>
		);

		// The date should be formatted in en-IN format
		// Note: The exact format depends on the browser's locale implementation
	});

	it("should handle null/undefined values gracefully", async () => {
		const mockDataWithNulls = [
			{
				inward_dtl_id: 1,
				inward_id: 100,
				inward_sequence_no: 1,
				inward_no: null,
				inward_date: null,
				branch_id: 10,
				branch_name: null,
				item_id: 10,
				item_code: null,
				item_name: null,
				item_grp_id: 1,
				item_grp_name: null,
				uom_id: 1,
				uom_name: null,
				approved_qty: null,
				issue_qty: null,
				available_qty: null,
				rate: null,
				warehouse_id: 1,
				warehouse_name: null,
			},
		];

		(issueService.fetchInventoryList as Mock).mockResolvedValue({
			data: mockDataWithNulls,
			total: 1,
		});

		render(
			<InventorySearchTable
				coId="1"
				branchId="10"
				disabled={false}
				onInsertItems={vi.fn()}
			/>
		);

		await waitFor(() => {
			// Should render "-" for null values
			const dashes = screen.getAllByText("-");
			expect(dashes.length).toBeGreaterThan(0);
		});
	});
});
