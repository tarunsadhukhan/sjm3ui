"use client";

/**
 * @component BillPassViewPage
 * @description Read-only detail page for Bill Pass.
 * Shows SR line items with inline DR/CR adjustments, invoice info, and payment summary.
 */

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { ArrowLeft, Printer, FileText, MinusCircle, PlusCircle, Receipt } from "lucide-react";

import {
  fetchBillPassById,
  formatCurrency,
  formatBillPassDate,
  buildDrcrLinesByInwardDtl,
  type BillPassDetail,
  type BillPassDRCRLine,
} from "@/utils/billPassService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatAmount = (value?: number | null): string => {
  if (value == null) return "0.00";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

type DrcrLineWithNote = BillPassDRCRLine & { note_type: number; note_type_name: string };

// ─── Sub-components ───────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "baseline" }}>
      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
        {label}:
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value || "-"}
      </Typography>
    </Box>
  );
}

type SummaryCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  color?: "primary" | "error" | "success" | "info";
  icon?: React.ReactNode;
};

function SummaryCard({ title, value, subtitle, color = "primary", icon }: SummaryCardProps) {
  const colorMap = {
    primary: { bg: "primary.50", border: "primary.200", text: "primary.700" },
    error: { bg: "error.50", border: "error.200", text: "error.700" },
    success: { bg: "success.50", border: "success.200", text: "success.700" },
    info: { bg: "info.50", border: "info.200", text: "info.700" },
  };
  const colors = colorMap[color];

  return (
    <Card variant="outlined" sx={{ bgcolor: colors.bg, borderColor: colors.border, height: "100%" }}>
      <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          {icon && <Box sx={{ color: colors.text }}>{icon}</Box>}
          <Typography variant="body2" color="text.secondary" fontWeight={500}>
            {title}
          </Typography>
        </Stack>
        <Typography variant="h5" fontWeight={700} sx={{ color: colors.text, fontFamily: "monospace" }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function DrcrInlineRows({ lines }: { lines: DrcrLineWithNote[] }) {
  if (lines.length === 0) return null;

  return (
    <>
      {lines.map((line) => {
        const isDebit = line.note_type === 1;
        return (
          <Box
            key={line.drcr_note_dtl_id}
            component="tr"
            sx={{
              bgcolor: isDebit ? "error.50" : "success.50",
              borderLeft: `3px solid`,
              borderLeftColor: isDebit ? "error.main" : "success.main",
            }}
          >
            <Box component="td" colSpan={5} sx={{ p: 0.75, pl: 4, fontSize: "0.7rem" }}>
              <Chip
                label={isDebit ? "DEBIT" : "CREDIT"}
                size="small"
                color={isDebit ? "error" : "success"}
                variant="outlined"
                sx={{ fontSize: "0.6rem", height: 18, mr: 1 }}
              />
              <Typography component="span" variant="caption" color="text.secondary">
                {line.adjustment_reason}
              </Typography>
            </Box>
            <Box component="td" sx={{ p: 0.75, fontSize: "0.7rem", textAlign: "right" }}>
              {formatAmount(line.quantity)}
            </Box>
            <Box component="td" sx={{ p: 0.75, fontSize: "0.7rem", textAlign: "right" }}>
              {formatAmount(line.rate)}
            </Box>
            <Box
              component="td"
              colSpan={2}
              sx={{
                p: 0.75,
                fontSize: "0.7rem",
                textAlign: "right",
                fontWeight: 600,
                color: isDebit ? "error.main" : "success.main",
              }}
            >
              {isDebit ? "-" : "+"}{formatAmount(line.line_amount)}
            </Box>
          </Box>
        );
      })}
    </>
  );
}

function SummaryRow({
  label,
  value,
  bold,
  indent,
  color,
  prefix,
}: {
  label: string;
  value: number;
  bold?: boolean;
  indent?: boolean;
  color?: string;
  prefix?: string;
}) {
  return (
    <Box display="flex" justifyContent="space-between" sx={{ px: 0.5, pl: indent ? 3 : 0.5 }}>
      <Typography variant="body2" fontWeight={bold ? 600 : 400} color={color || "text.primary"}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={bold ? 600 : 400}
        color={color || "text.primary"}
        sx={{ fontFamily: "monospace" }}
      >
        {prefix ? `${prefix} ` : ""}{formatAmount(value)}
      </Typography>
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BillPassViewPage() {
  const router = useRouter();
  const params = useParams();
  const inwardId = params?.id as string;

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<BillPassDetail | null>(null);

  React.useEffect(() => {
    if (!inwardId) {
      setError("Invalid Bill Pass ID");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await fetchBillPassById(inwardId);
      if (fetchError) {
        setError(fetchError);
      } else if (data) {
        setDetail(data);
      } else {
        setError("Bill Pass not found");
      }
      setLoading(false);
    };

    void load();
  }, [inwardId]);

  const drcrByLine = React.useMemo(() => {
    if (!detail) return new Map<number, DrcrLineWithNote[]>();
    return buildDrcrLinesByInwardDtl(detail.debit_notes, detail.credit_notes);
  }, [detail]);

  const netPayable = React.useMemo(() => {
    if (!detail) return 0;
    const s = detail.summary;
    return s.sr_total - s.dr_total + s.cr_total + (detail.round_off_value || 0);
  }, [detail]);

  const handleBack = () => router.push("/dashboardportal/procurement/billPass");

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="outlined" startIcon={<ArrowLeft size={16} />} onClick={handleBack}>
          Back to List
        </Button>
      </Box>
    );
  }

  if (!detail) {
    return (
      <Box p={3}>
        <Alert severity="warning">No Bill Pass data found.</Alert>
        <Button variant="outlined" startIcon={<ArrowLeft size={16} />} onClick={handleBack} sx={{ mt: 2 }}>
          Back to List
        </Button>
      </Box>
    );
  }

  const { summary } = detail;

  return (
    <Box p={2} className="print:p-0">
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} className="print:hidden">
        <Box display="flex" alignItems="center" gap={2}>
          <Button variant="outlined" size="small" startIcon={<ArrowLeft size={16} />} onClick={handleBack}>
            Back
          </Button>
          <Typography variant="h5" fontWeight={600}>
            Bill Pass {detail.bill_pass_no ? `- ${detail.bill_pass_no}` : ""}
          </Typography>
          <Chip
            label={detail.billpass_status === 1 ? "Complete" : "Pending"}
            size="small"
            color={detail.billpass_status === 1 ? "success" : "warning"}
            variant="outlined"
          />
        </Box>
        <Button variant="outlined" size="small" startIcon={<Printer size={16} />} onClick={() => window.print()}>
          Print
        </Button>
      </Stack>

      {/* ── Summary Cards ────────────────────────────────────────────────── */}
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="SR TOTAL"
            value={formatCurrency(summary.sr_total)}
            subtitle={`${summary.sr_line_count} item(s)`}
            color="info"
            icon={<Receipt size={18} />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="DEBIT NOTES"
            value={summary.dr_count > 0 ? `-${formatCurrency(summary.dr_total)}` : "-"}
            subtitle={summary.dr_count > 0 ? `${summary.dr_count} note(s)` : "No debit notes"}
            color="error"
            icon={<MinusCircle size={18} />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="CREDIT NOTES"
            value={summary.cr_count > 0 ? `+${formatCurrency(summary.cr_total)}` : "-"}
            subtitle={summary.cr_count > 0 ? `${summary.cr_count} note(s)` : "No credit notes"}
            color="success"
            icon={<PlusCircle size={18} />}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="NET PAYABLE"
            value={formatCurrency(netPayable)}
            subtitle="Final amount to pay"
            color="primary"
            icon={<FileText size={18} />}
          />
        </Grid>
      </Grid>

      {/* ── Header Info ──────────────────────────────────────────────────── */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="SR No." value={detail.bill_pass_no} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="SR Date" value={formatBillPassDate(detail.bill_pass_date)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Inward No." value={detail.inward_no} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Inward Date" value={formatBillPassDate(detail.inward_date)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Supplier" value={detail.supplier_name} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Branch" value={detail.branch_name} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Challan No." value={detail.challan_no} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Challan Date" value={formatBillPassDate(detail.challan_date)} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── Invoice Info ─────────────────────────────────────────────────── */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            Invoice Details
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Invoice Date" value={formatBillPassDate(detail.invoice_date)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Invoice Amount" value={formatCurrency(detail.invoice_amount)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Invoice Received" value={formatBillPassDate(detail.invoice_recvd_date)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <InfoField label="Payment Due" value={formatBillPassDate(detail.invoice_due_date)} />
            </Grid>
            {detail.sr_remarks && (
              <Grid size={{ xs: 12, md: 6 }}>
                <InfoField label="Remarks" value={detail.sr_remarks} />
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* ── SR Line Items with Inline DR/CR ──────────────────────────────── */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={1}>
            SR Line Items
          </Typography>
          <Typography variant="caption" color="text.secondary" mb={2} display="block">
            {summary.sr_line_count} item(s) &mdash;
            {summary.dr_count > 0 && ` ${summary.dr_count} debit note(s)`}
            {summary.cr_count > 0 && ` ${summary.cr_count} credit note(s)`}
            {summary.dr_count === 0 && summary.cr_count === 0 && " No DR/CR adjustments"}
          </Typography>

          <Box sx={{ overflowX: "auto" }}>
            <Paper variant="outlined">
              <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
                <Box component="thead" sx={{ bgcolor: "primary.main" }}>
                  <Box component="tr">
                    {["PO No.", "Item Code", "Item", "Make", "UOM", "Qty", "PO Rate", "Accepted Rate", "Amount", "Tax", "Total"].map(
                      (h) => (
                        <Box
                          key={h}
                          component="th"
                          sx={{
                            p: 1,
                            color: "white",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textAlign: ["PO No.", "Item Code", "Item", "Make", "UOM"].includes(h) ? "left" : "right",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </Box>
                      )
                    )}
                  </Box>
                </Box>

                <Box component="tbody">
                  {detail.sr_lines.map((line, idx) => {
                    const adjustments = drcrByLine.get(line.inward_dtl_id) ?? [];
                    const drTotal = adjustments
                      .filter((a) => a.note_type === 1)
                      .reduce((s, a) => s + a.line_amount, 0);
                    const crTotal = adjustments
                      .filter((a) => a.note_type === 2)
                      .reduce((s, a) => s + a.line_amount, 0);
                    const lineNet = line.line_total - drTotal + crTotal;
                    const hasAdjustments = adjustments.length > 0;

                    return (
                      <React.Fragment key={line.inward_dtl_id}>
                        <Box
                          component="tr"
                          sx={{
                            bgcolor: idx % 2 === 0 ? "grey.50" : "white",
                            borderBottom: hasAdjustments ? "none" : undefined,
                          }}
                        >
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem" }}>
                            <Typography variant="caption" color="text.secondary">
                              {line.po_no || "-"}
                            </Typography>
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem" }}>
                            <Typography variant="caption" sx={{ fontFamily: "monospace" }}>
                              {line.full_item_code || line.item_code || "-"}
                            </Typography>
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem" }}>
                            <Typography variant="caption" fontWeight={600}>
                              {line.item_name || "-"}
                            </Typography>
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem" }}>
                            {line.accepted_make_name || "-"}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem" }}>
                            {line.uom_name}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                            {formatAmount(line.approved_qty)}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                            {formatAmount(line.po_rate)}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                            {formatAmount(line.accepted_rate)}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                            {formatAmount(line.line_amount)}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right" }}>
                            {formatAmount(line.tax_amount)}
                          </Box>
                          <Box component="td" sx={{ p: 1, fontSize: "0.75rem", textAlign: "right", fontWeight: 600 }}>
                            {formatAmount(line.line_total)}
                          </Box>
                        </Box>

                        <DrcrInlineRows lines={adjustments} />

                        {hasAdjustments && (
                          <Box
                            component="tr"
                            sx={{ bgcolor: "grey.100", borderBottom: "2px solid", borderBottomColor: "divider" }}
                          >
                            <Box
                              component="td"
                              colSpan={10}
                              sx={{ p: 0.75, pl: 4, fontSize: "0.7rem", textAlign: "right", fontWeight: 600 }}
                            >
                              Line Net Payable:
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                p: 0.75,
                                fontSize: "0.75rem",
                                textAlign: "right",
                                fontWeight: 700,
                                color: "primary.main",
                              }}
                            >
                              {formatAmount(lineNet)}
                            </Box>
                          </Box>
                        )}
                      </React.Fragment>
                    );
                  })}
                </Box>
              </Box>
            </Paper>
          </Box>
        </CardContent>
      </Card>

      {/* ── Payment Summary Footer ───────────────────────────────────────── */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} mb={2}>
            Payment Summary
          </Typography>
          <Box sx={{ maxWidth: 500, ml: "auto" }}>
            <SummaryRow label="SR Taxable" value={summary.sr_taxable} />
            {summary.sr_cgst > 0 && <SummaryRow label="CGST" value={summary.sr_cgst} indent />}
            {summary.sr_sgst > 0 && <SummaryRow label="SGST" value={summary.sr_sgst} indent />}
            {summary.sr_igst > 0 && <SummaryRow label="IGST" value={summary.sr_igst} indent />}
            <Divider sx={{ my: 1 }} />
            <SummaryRow label="SR Total" value={summary.sr_total} bold />
            {summary.dr_count > 0 && (
              <SummaryRow
                label={`Less: Debit Notes (${summary.dr_count})`}
                value={summary.dr_total}
                color="error.main"
                prefix="-"
              />
            )}
            {summary.cr_count > 0 && (
              <SummaryRow
                label={`Add: Credit Notes (${summary.cr_count})`}
                value={summary.cr_total}
                color="success.main"
                prefix="+"
              />
            )}
            {(detail.round_off_value || 0) !== 0 && (
              <SummaryRow label="Round Off" value={detail.round_off_value} />
            )}
            <Divider sx={{ my: 1, borderWidth: 2 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ py: 1, px: 0.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                NET PAYABLE
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                color="primary.main"
                sx={{ fontFamily: "monospace" }}
              >
                {formatCurrency(netPayable)}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
