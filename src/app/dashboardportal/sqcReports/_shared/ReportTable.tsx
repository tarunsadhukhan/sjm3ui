"use client";

import * as React from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";

export interface ReportColumn<T> {
  label: string;
  render: (row: T) => React.ReactNode;
  /** Flag a cell as out-of-standard (the register's "circled" values). */
  flag?: (row: T) => boolean;
  align?: "left" | "right" | "center";
}

interface ReportTableProps<T> {
  columns: ReportColumn<T>[];
  rows: T[];
  /** Footer cells, one per column (e.g. the "Avg" line). */
  footer?: React.ReactNode[];
}

/** Compact bordered table in the handwritten-register layout. */
export default function ReportTable<T>({
  columns,
  rows,
  footer,
}: ReportTableProps<T>) {
  // Wrapper scrolls sideways on phones instead of squashing the columns.
  return (
    <Box sx={{ overflowX: "auto", maxWidth: "100%" }}>
      <Table
        size="small"
        sx={{
          "& td, & th": {
            border: 1,
            borderColor: "divider",
            py: 0.5,
            px: 1,
            whiteSpace: "nowrap",
          },
        }}
      >
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell
                key={c.label}
                align={c.align ?? "center"}
                sx={{ fontWeight: 700, bgcolor: "action.hover" }}
              >
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {columns.map((c) => {
                const flagged = c.flag?.(r) ?? false;
                return (
                  <TableCell
                    key={c.label}
                    align={c.align ?? "center"}
                    sx={
                      flagged
                        ? { color: "error.main", fontWeight: 700 }
                        : undefined
                    }
                  >
                    {c.render(r)}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
          {footer && (
            <TableRow>
              {footer.map((f, i) => (
                <TableCell
                  key={i}
                  align={columns[i]?.align ?? "center"}
                  sx={{ fontWeight: 700 }}
                >
                  {f}
                </TableCell>
              ))}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
