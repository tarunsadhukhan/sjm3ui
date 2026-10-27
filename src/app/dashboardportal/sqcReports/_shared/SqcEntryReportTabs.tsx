"use client";

import * as React from "react";
import { Box, MenuItem, Tab, Tabs, TextField } from "@mui/material";

export interface SqcEntryOption {
  label: string;
  /** Existing Jute SQC entry page, rendered as-is so it saves to the same tables. */
  render: () => React.ReactNode;
}

interface SqcEntryReportTabsProps {
  entries: SqcEntryOption[];
  report: React.ReactNode;
}

/**
 * Entry / Report tabs for an SQC report page. Only the active tab is mounted, so switching
 * back to Report refetches and shows what was just entered.
 */
export default function SqcEntryReportTabs({
  entries,
  report,
}: SqcEntryReportTabsProps) {
  const [tab, setTab] = React.useState<"entry" | "report">("entry");
  const [entryIdx, setEntryIdx] = React.useState(0);

  return (
    <Box>
      <Box
        className="flex flex-wrap items-center gap-3 px-2 sm:px-4 print:hidden"
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab value="entry" label="Entry" />
          <Tab value="report" label="Report" />
        </Tabs>
        {tab === "entry" && entries.length > 1 && (
          <TextField
            select
            size="small"
            label="Test"
            value={entryIdx}
            onChange={(e) => setEntryIdx(Number(e.target.value))}
            className="w-full sm:w-auto"
            sx={{ minWidth: 220, my: 1 }}
          >
            {entries.map((e, i) => (
              <MenuItem key={e.label} value={i}>
                {e.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Box>
      {tab === "entry" ? (
        <Box key={entryIdx}>{entries[entryIdx]?.render()}</Box>
      ) : (
        report
      )}
    </Box>
  );
}
