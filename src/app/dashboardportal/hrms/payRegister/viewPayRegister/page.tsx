"use client";

import React, { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Typography, Paper, Snackbar, Alert } from "@mui/material";
import { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { Button } from "@/components/ui/button";
import MuiDataGrid from "@/components/ui/muiDataGrid";
import { useSelectedCompanyCoId } from "@/hooks/use-selected-company-coid";
import {
  fetchPayRegisterById,
  fetchPayRegisterSalary,
  updatePayRegister,
} from "@/utils/hrmsService";
import type { PayRegisterDetail, PaySalaryRow, FormMode } from "../types/payRegisterTypes";
import { PAY_REGISTER_STATUS } from "../types/payRegisterTypes";

function ViewPayRegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { coId } = useSelectedCompanyCoId();

  const payRegisterId = searchParams.get("id");
  const mode = (searchParams.get("mode") ?? "view") as FormMode;

  const [detail, setDetail] = useState<PayRegisterDetail | null>(null);
  const [salaryData, setSalaryData] = useState<PaySalaryRow[]>([]);
  const [salaryColumns, setSalaryColumns] = useState<GridColDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false, message: "", severity: "success",
  });

  // Load pay register details
  useEffect(() => {
    if (!coId || !payRegisterId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchPayRegisterById(coId, payRegisterId);
        if (cancelled) return;
        if (res?.error || !res?.data) throw new Error(res?.error || "Failed to load pay register");
        const data = res.data as PayRegisterDetail;
        setDetail(data);
      } catch (err: unknown) {
        if (!cancelled) {
          setSnackbar({ open: true, message: err instanceof Error ? err.message : "Error loading details", severity: "error" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [coId, payRegisterId]);

  // Load salary data once detail is available
  useEffect(() => {
    if (!coId || !detail || !payRegisterId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPayRegisterSalary(coId, {
          branch_id: detail.branchId ?? undefined,
          pay_scheme_id: detail.paySchemeId ?? undefined,
          from_date: detail.fromDateDesc ?? undefined,
          to_date: detail.toDateDesc ?? undefined,
          pay_period_id: Number(payRegisterId),
        });
        if (cancelled) return;
        if (res?.error || !res?.data) return;

        const rows = (res.data.data ?? []) as PaySalaryRow[];
        if (rows.length > 0) {
          // Build columns dynamically from the keys of the first row
          const keys = Object.keys(rows[0]);
          const cols: GridColDef[] = keys.map((key) => ({
            field: key,
            headerName: key,
            flex: 1,
            minWidth: 120,
          }));
          setSalaryColumns(cols);
          // Ensure each row has a unique id
          const mappedRows = rows.map((row, idx) => ({
            ...row,
            id: (row.id as number) ?? idx,
          }));
          setSalaryData(mappedRows);
        }
      } catch {
        // Silent failure for salary data
      }
    })();
    return () => { cancelled = true; };
  }, [coId, detail, payRegisterId]);

  // Approve / Reject handler
  const handleStatusUpdate = useCallback(async (status: number) => {
    if (!coId || !payRegisterId) return;
    setActionLoading(true);
    try {
      const payload = {
        id: Number(payRegisterId),
        status,
      };
      const res = await updatePayRegister(coId, payRegisterId, payload);
      if (res?.error) throw new Error(res.error);
      const statusLabel = status === PAY_REGISTER_STATUS.APPROVED ? "Approved" : "Rejected";
      setSnackbar({ open: true, message: `Pay register ${statusLabel} successfully`, severity: "success" });
      router.push("/dashboardportal/hrms/payRegister");
    } catch (err: unknown) {
      setSnackbar({ open: true, message: err instanceof Error ? err.message : "Failed to update status", severity: "error" });
    } finally {
      setActionLoading(false);
    }
  }, [coId, payRegisterId, router]);

  const showApprovalButtons = detail?.approveButton === true;
  const isNotApproved = detail?.status_id != null && String(detail.status_id) !== String(PAY_REGISTER_STATUS.APPROVED);

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 50 });

  return (
    <Box className="flex flex-col gap-6 p-4">
      {/* Header */}
      <Box className="flex items-center justify-between">
        <Typography variant="h5">View Pay Register</Typography>
        <Button variant="outline" onClick={() => router.push("/dashboardportal/hrms/payRegister")}>
          Back
        </Button>
      </Box>

      {/* Pay Register Details Summary */}
      {detail && (
        <Paper className="p-4">
          <Box className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Box>
              <Typography variant="caption" color="text.secondary">From Date</Typography>
              <Typography variant="body1">{detail.fromDateDesc ?? "-"}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">To Date</Typography>
              <Typography variant="body1">{detail.toDateDesc ?? "-"}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Status</Typography>
              <Typography variant="body1">{detail.status ?? "-"}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Pay Period ID</Typography>
              <Typography variant="body1">{detail.id}</Typography>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Salary Data Grid */}
      <Paper className="p-4">
        {salaryData.length > 0 ? (
          <MuiDataGrid
            rows={salaryData}
            columns={salaryColumns}
            rowCount={salaryData.length}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            loading={loading}
            paginationMode="client"
          />
        ) : (
          <Typography variant="body2" color="text.secondary" className="text-center py-8">
            {loading ? "Loading salary data..." : "No salary data available."}
          </Typography>
        )}
      </Paper>

      {/* Approval Buttons */}
      {showApprovalButtons && (
        <Box className="flex justify-end gap-3">
          {isNotApproved && (
            <Button
              onClick={() => handleStatusUpdate(PAY_REGISTER_STATUS.APPROVED)}
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Approve"}
            </Button>
          )}
          <Button
            variant="destructive"
            onClick={() => handleStatusUpdate(PAY_REGISTER_STATUS.REJECTED)}
            disabled={actionLoading}
          >
            {actionLoading ? "Processing..." : "Reject"}
          </Button>
        </Box>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default function ViewPayRegisterPage() {
  return (
    <Suspense fallback={<Box className="p-4"><Typography>Loading...</Typography></Box>}>
      <ViewPayRegisterContent />
    </Suspense>
  );
}
