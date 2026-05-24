"use client";
import React, { useState, useMemo, useCallback, SyntheticEvent } from "react";
import {
  Box,
  Tabs,
  Tab,
  TextField,
  Autocomplete,
  Paper,
  Typography,
} from "@mui/material";
import { useSidebarContext } from "@/components/dashboard/sidebarContext";
import JuteStockReport from "./_components/JuteStockReport";
import BatchCostReport from "./_components/BatchCostReport";
import type { BranchOption } from "./types/reportTypes";

function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export default function JuteReportsPage() {
  const { selectedCompany } = useSidebarContext();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedBranch, setSelectedBranch] = useState<BranchOption | null>(
    null,
  );
  const [reportDate, setReportDate] = useState<string>(getYesterdayDate());

  // Get branch options from sidebar context
  const branchOptions: BranchOption[] = useMemo(
    () =>
      (selectedCompany?.branches ?? []).map((b) => ({
        branch_id: b.branch_id,
        branch_name: b.branch_name,
      })),
    [selectedCompany?.branches],
  );

  const handleTabChange = useCallback(
    (_: SyntheticEvent, newValue: number) => {
      setActiveTab(newValue);
    },
    [],
  );

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setReportDate(e.target.value);
    },
    [],
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{ color: "#0C3C60", fontWeight: "bold", mb: 2 }}
      >
        Jute Procurement Reports
      </Typography>

      <Paper elevation={1} sx={{ mb: 3 }}>
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
            },
            "& .Mui-selected": {
              color: "#0C3C60",
            },
            "& .MuiTabs-indicator": {
              backgroundColor: "#0C3C60",
            },
          }}
        >
          <Tab label="Jute Stock Report" />
          <Tab label="Batch Cost Report" />
        </Tabs>

        {/* Filters toolbar */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            p: 2,
            flexWrap: "wrap",
          }}
        >
          <Autocomplete
            options={branchOptions}
            getOptionLabel={(option) => option.branch_name}
            isOptionEqualToValue={(option, value) =>
              option.branch_id === value.branch_id
            }
            value={selectedBranch}
            onChange={(_, newValue) => setSelectedBranch(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Branch"
                size="small"
                required
              />
            )}
            sx={{ minWidth: 240 }}
          />
          <TextField
            type="date"
            label="Report Date"
            value={reportDate}
            onChange={handleDateChange}
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ width: 180 }}
          />
        </Box>
      </Paper>

      {/* Report content */}
      {activeTab === 0 && (
        <JuteStockReport
          branchId={selectedBranch?.branch_id ?? null}
          date={reportDate}
        />
      )}
      {activeTab === 1 && (
        <BatchCostReport
          branchId={selectedBranch?.branch_id ?? null}
          date={reportDate}
        />
      )}
    </Box>
  );
}
