"use client";

import * as React from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { Printer } from "lucide-react";
import type { useSqcReportFilters } from "./useSqcReport";

interface SqcReportShellProps {
  title: string;
  filters: ReturnType<typeof useSqcReportFilters>;
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  children: React.ReactNode;
}

/** Filter bar (date + branch + print) and printable sheet frame shared by all SQC reports. */
export default function SqcReportShell({
  title,
  filters,
  loading,
  error,
  isEmpty,
  children,
}: SqcReportShellProps) {
  const {
    mounted,
    branchId,
    setBranchId,
    branchOptions,
    entryDate,
    setEntryDate,
    companyName,
    branchName,
  } = filters;
  if (!mounted) return null;

  const displayDate = entryDate ? entryDate.split("-").reverse().join("-") : "";

  return (
    <Box className="flex flex-col gap-3 p-2 sm:p-4">
      <Box className="flex flex-wrap items-center gap-3 print:hidden">
        <Typography variant="h6" className="w-full sm:mr-auto sm:w-auto">
          {title}
        </Typography>
        <TextField
          type="date"
          size="small"
          label="Date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        {branchOptions.length > 1 && (
          <TextField
            select
            size="small"
            label="Branch"
            value={branchId ?? ""}
            onChange={(e) => setBranchId(Number(e.target.value))}
            sx={{ minWidth: 180 }}
          >
            {branchOptions.map((b) => (
              <MenuItem key={b.branch_id} value={Number(b.branch_id)}>
                {b.branch_name}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Button
          variant="outlined"
          startIcon={<Printer size={16} />}
          onClick={() => window.print()}
          disabled={isEmpty}
        >
          Print
        </Button>
      </Box>

      {branchId == null && (
        <Alert severity="info">Select a branch to view the report.</Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}

      <Paper variant="outlined" className="p-2 sm:p-4 print:border-0 print:p-0">
        <Box className="mb-3 text-center">
          <Typography variant="subtitle1" fontWeight={700}>
            {companyName}
            {branchName ? ` — ${branchName}` : ""}
          </Typography>
          <Typography variant="subtitle2">
            {title} as on {displayDate}
          </Typography>
        </Box>
        {loading ? (
          <Box className="flex justify-center p-6">
            <CircularProgress size={28} />
          </Box>
        ) : isEmpty ? (
          <Typography color="text.secondary" className="p-6 text-center">
            No entries found for this date.
          </Typography>
        ) : (
          <Box className="flex flex-col gap-6">{children}</Box>
        )}
      </Paper>
    </Box>
  );
}
