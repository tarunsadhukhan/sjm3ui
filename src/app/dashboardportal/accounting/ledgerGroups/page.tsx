"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
} from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { z } from "zod";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Swal from "sweetalert2";
import IndexWrapper from "@/components/ui/IndexWrapper";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import {
  fetchLedgerGroups,
  createLedgerGroup,
} from "@/utils/accountingService";
import type {
  LedgerGroup,
  AccountNature,
} from "@/app/dashboardportal/accounting/types/accountingTypes";

// ---------------------------------------------------------------------------
// Row type
// ---------------------------------------------------------------------------

type LedgerGroupRow = LedgerGroup & { id: number; parent_group_name: string };

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const createGroupSchema = z.object({
  group_name: z.string().min(1, "Group name is required").max(100),
  parent_group_id: z.number().int("Parent group is required"),
  nature: z.enum(["A", "L", "I", "E"], {
    message: "Nature must be A, L, I, or E",
  }),
});

type CreateGroupFormData = z.infer<typeof createGroupSchema>;

// ---------------------------------------------------------------------------
// Nature label map
// ---------------------------------------------------------------------------

const NATURE_LABELS: Record<AccountNature, string> = {
  A: "Assets",
  L: "Liabilities",
  I: "Income",
  E: "Expenses",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LedgerGroupsPage() {
  const { selectedCompany } = useSidebarContext();

  const [rows, setRows] = useState<LedgerGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: 25,
    page: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  // -- flat list of all groups for parent dropdown --
  const [allGroups, setAllGroups] = useState<LedgerGroup[]>([]);

  // -----------------------------------------------------------------------
  // Form
  // -----------------------------------------------------------------------

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupFormData>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      group_name: "",
      parent_group_id: undefined,
      nature: undefined,
    },
  });

  // -----------------------------------------------------------------------
  // Flatten tree helper
  // -----------------------------------------------------------------------

  const flattenGroups = useCallback(
    (
      groups: LedgerGroup[],
      parentName: string = ""
    ): LedgerGroupRow[] => {
      const result: LedgerGroupRow[] = [];
      for (const g of groups) {
        result.push({
          ...g,
          id: g.acc_ledger_group_id,
          parent_group_name: parentName,
        });
        if (g.children && g.children.length > 0) {
          result.push(...flattenGroups(g.children, g.group_name));
        }
      }
      return result;
    },
    []
  );

  const flattenAll = useCallback(
    (groups: LedgerGroup[]): LedgerGroup[] => {
      const result: LedgerGroup[] = [];
      for (const g of groups) {
        result.push(g);
        if (g.children && g.children.length > 0) {
          result.push(...flattenAll(g.children));
        }
      }
      return result;
    },
    []
  );

  // -----------------------------------------------------------------------
  // Fetch
  // -----------------------------------------------------------------------

  const fetchData = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const groups = await fetchLedgerGroups(selectedCompany.co_id);
      const treeData = groups as unknown as LedgerGroup[];
      const flat = flattenGroups(treeData);
      setAllGroups(flattenAll(treeData));
      setRows(flat);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error fetching ledger groups";
      setSnackbar({ open: true, message, severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, flattenGroups, flattenAll]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // -----------------------------------------------------------------------
  // Filtered rows
  // -----------------------------------------------------------------------

  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      (r) =>
        r.group_name.toLowerCase().includes(q) ||
        r.parent_group_name.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
      setPaginationModel((prev) => ({ ...prev, page: 0 }));
    },
    []
  );

  const handleCreate = useCallback(() => {
    reset({ group_name: "", parent_group_id: undefined, nature: undefined });
    setDialogOpen(true);
  }, [reset]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
  }, []);

  const onSubmit = useCallback(
    async (data: CreateGroupFormData) => {
      if (!selectedCompany) return;
      try {
        await createLedgerGroup({
          co_id: selectedCompany.co_id,
          group_name: data.group_name,
          parent_group_id: data.parent_group_id,
          nature: data.nature,
        });
        await Swal.fire({
          icon: "success",
          title: "Created",
          text: "Ledger group created successfully.",
          timer: 1500,
          showConfirmButton: false,
        });
        setDialogOpen(false);
        fetchData();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error creating ledger group";
        await Swal.fire({ icon: "error", title: "Error", text: message });
      }
    },
    [selectedCompany, fetchData]
  );

  // -----------------------------------------------------------------------
  // Columns
  // -----------------------------------------------------------------------

  const columns = useMemo<GridColDef<LedgerGroupRow>[]>(
    () => [
      {
        field: "group_name",
        headerName: "Group Name",
        flex: 2,
        minWidth: 200,
      },
      {
        field: "parent_group_name",
        headerName: "Parent Group",
        flex: 1.5,
        minWidth: 180,
      },
      {
        field: "nature",
        headerName: "Nature",
        flex: 0.8,
        minWidth: 100,
        renderCell: (params) => NATURE_LABELS[params.value as AccountNature] ?? params.value,
      },
      {
        field: "normal_balance",
        headerName: "Normal Balance",
        flex: 0.8,
        minWidth: 120,
        renderCell: (params) =>
          params.value === "D" ? "Debit" : params.value === "C" ? "Credit" : "",
      },
      {
        field: "is_party_group",
        headerName: "Party Group",
        flex: 0.7,
        minWidth: 100,
        renderCell: (params) =>
          params.value ? (
            <Chip label="Yes" size="small" color="primary" />
          ) : (
            <Chip label="No" size="small" variant="outlined" />
          ),
      },
    ],
    []
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <IndexWrapper
      title="Ledger Groups"
      subtitle="Manage your chart of accounts group hierarchy"
      rows={filteredRows}
      columns={columns}
      rowCount={filteredRows.length}
      paginationModel={paginationModel}
      onPaginationModelChange={setPaginationModel}
      loading={loading}
      showLoadingUntilLoaded
      search={{
        value: searchQuery,
        onChange: handleSearchChange,
        placeholder: "Search by group name",
        debounceDelayMs: 300,
      }}
      createAction={{
        label: "Add Sub-Group",
        onClick: handleCreate,
      }}
    >
      {/* ── Create Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Create Ledger Sub-Group</DialogTitle>
          <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <Controller
              name="group_name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Group Name"
                  error={!!errors.group_name}
                  helperText={errors.group_name?.message}
                  fullWidth
                  margin="dense"
                />
              )}
            />

            <Controller
              name="parent_group_id"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="dense" error={!!errors.parent_group_id}>
                  <InputLabel>Parent Group</InputLabel>
                  <Select
                    {...field}
                    value={field.value ?? ""}
                    label="Parent Group"
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  >
                    {allGroups.map((g) => (
                      <MenuItem key={g.acc_ledger_group_id} value={g.acc_ledger_group_id}>
                        {g.group_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            />

            <Controller
              name="nature"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth margin="dense" error={!!errors.nature}>
                  <InputLabel>Nature</InputLabel>
                  <Select
                    {...field}
                    value={field.value ?? ""}
                    label="Nature"
                  >
                    <MenuItem value="A">Assets</MenuItem>
                    <MenuItem value="L">Liabilities</MenuItem>
                    <MenuItem value="I">Income</MenuItem>
                    <MenuItem value="E">Expenses</MenuItem>
                  </Select>
                </FormControl>
              )}
            />
          </DialogContent>
          <DialogActions>
            <button
              type="button"
              onClick={handleDialogClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Creating..." : "Create"}
            </button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </IndexWrapper>
  );
}
