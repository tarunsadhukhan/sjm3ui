"use client";

/**
 * @component JutePOPreview
 * @description Printable preview modal for Jute PO. Print layout matches the
 * Material Receipt print format: centered company letterhead, document title,
 * key:value header block, centered Mukam line, bordered line items table.
 */

import * as React from "react";
import { Dialog, DialogTitle, DialogContent, IconButton, Box, Divider, Typography } from "@mui/material";
import { X, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  JutePOFormValues,
  JutePOLineItem,
  JutePOLabelResolvers,
  CompanyLetterhead,
  BranchRecord,
  ApprovalStatusId,
} from "../types/jutePOTypes";
import { formatWeight, formatAmount, formatDate } from "../utils/jutePOCalculations";
import { JUTE_PO_STATUS_LABELS } from "../utils/jutePOConstants";

// ── Inline styles (print-friendly HTML table, same as MRPreview) ──
const thStyle: React.CSSProperties = {
  border: "1px solid #333",
  padding: "6px 8px",
  fontWeight: 600,
  fontSize: "11px",
  textAlign: "center",
  verticalAlign: "bottom",
  backgroundColor: "#f5f5f5",
};
const tdStyle: React.CSSProperties = { border: "1px solid #333", padding: "5px 8px", fontSize: "11px" };
const tdRight: React.CSSProperties = { ...tdStyle, textAlign: "right" };
const tdCenter: React.CSSProperties = { ...tdStyle, textAlign: "center" };
const thRight: React.CSSProperties = { ...thStyle, textAlign: "right" };

type JutePOPreviewProps = {
  open: boolean;
  onClose: () => void;
  poNumber?: string;
  statusId: ApprovalStatusId;
  formValues: JutePOFormValues;
  lineItems: JutePOLineItem[];
  labelResolvers: JutePOLabelResolvers;
  totalWeight: number;
  totalAmount: number;
  company?: CompanyLetterhead | null;
  branchInfo?: BranchRecord | null;
};

export function JutePOPreview({
  open,
  onClose,
  poNumber,
  statusId,
  formValues,
  lineItems,
  labelResolvers,
  totalWeight,
  totalAmount,
  company,
  branchInfo,
}: JutePOPreviewProps) {
  const printRef = React.useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    if (!printRef.current || downloading) return;
    setDownloading(true);
    try {
      // Dynamic import keeps html2pdf (and its canvas deps) out of the page bundle
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 8,
          filename: `Jute PO - ${poNumber || "Draft"}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(printRef.current)
        .save();
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    const content = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank");
    if (!win) {
      alert("Please allow popups to print.");
      return;
    }

    const title = `Jute PO - ${poNumber || "Draft"}`;
    win.document.open();
    win.document.write(`<!DOCTYPE html><html><head><title>${title}</title></head><body><div id="root"></div></body></html>`);
    win.document.close();

    document.querySelectorAll("style, link[rel=\"stylesheet\"]").forEach((n) => {
      win.document.head.appendChild(n.cloneNode(true));
    });

    const s = win.document.createElement("style");
    s.textContent = `
      @media print { @page { size: A4; margin: 8mm; } }
      body { margin: 0; padding: 16px; font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      table { width: 100%; border-collapse: collapse; }
      .print-hidden { display: none !important; }
      .co-header { text-align: center; margin-bottom: 12px; }
      .co-logo { display: block; margin: 0 auto 4px; max-height: 56px; max-width: 180px; object-fit: contain; }
    `;
    win.document.head.appendChild(s);

    const root = win.document.getElementById("root");
    if (root) root.innerHTML = content;
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  // Filter out blank lines
  const validLines = lineItems.filter((line) => line.itemId && parseFloat(line.weight) > 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex justify-between items-center">
        <span>Jute Purchase Order Preview</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload} disabled={downloading}>
            <Download className="w-4 h-4 mr-2" />
            {downloading ? "Downloading..." : "Download"}
          </Button>
          <IconButton onClick={onClose} size="small">
            <X className="w-4 h-4" />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent dividers>
        <Box ref={printRef} sx={{ p: 2, fontFamily: "Arial, sans-serif", fontSize: "12px" }}>
          {/* ── Centered Company Letterhead + Title ── */}
          <Box className="co-header" sx={{ textAlign: "center", mb: 2 }}>
            {company?.co_logo && (
              <Box
                component="img"
                src={company.co_logo}
                alt="Company Logo"
                className="co-logo"
                sx={{ maxHeight: 56, maxWidth: 180, objectFit: "contain", mb: 0.5, mx: "auto", display: "block" }}
              />
            )}
            {company?.co_name && (
              <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                {company.co_name}
              </Typography>
            )}
            {company?.co_address1 && (
              <Typography variant="caption" display="block" sx={{ mb: 0.25 }}>
                {company.co_address1}
              </Typography>
            )}
            {company?.co_address2 && (
              <Typography variant="caption" display="block" sx={{ mb: 0.25 }}>
                {company.co_address2}
              </Typography>
            )}
            {company?.co_zipcode && (
              <Typography variant="caption" display="block" sx={{ mb: 0.25 }}>
                {String(company.co_zipcode)}
              </Typography>
            )}
            {(branchInfo?.branch_contact_no || branchInfo?.branch_email) && (
              <Typography variant="caption" display="block" sx={{ mb: 0.25 }}>
                {branchInfo?.branch_contact_no && <>Phone: {String(branchInfo.branch_contact_no)}</>}
                {branchInfo?.branch_contact_no && branchInfo?.branch_email && <>{"  |  "}</>}
                {branchInfo?.branch_email && <>Email: {branchInfo.branch_email}</>}
              </Typography>
            )}
            {branchInfo?.branch_name && (
              <Typography
                variant="caption"
                display="block"
                sx={{ fontStyle: "italic", color: "text.secondary", mt: 0.5 }}
              >
                {branchInfo.branch_name}
              </Typography>
            )}

            {/* Document Title */}
            <Typography variant="h5" fontWeight={700} sx={{ mt: 1.5 }}>
              Purchase Order
            </Typography>
          </Box>

          {/* ── Header Fields (two-column key:value pairs) ── */}
          <Box
            component="table"
            sx={{
              width: "100%",
              borderCollapse: "collapse",
              mb: 2,
              "& td": { padding: "3px 6px", fontSize: "12px", border: "none" },
            }}
          >
            <tbody>
              <tr>
                <td style={{ width: "18%", fontWeight: 600 }}>PO NO</td>
                <td style={{ width: "3%" }}>:</td>
                <td style={{ width: "29%" }}>{poNumber || "Draft"}</td>
                <td style={{ width: "21%", fontWeight: 600, textAlign: "right" }}>PO DATE :</td>
                <td style={{ width: "29%" }}>{formatDate(formValues.poDate)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>M/S</td>
                <td>:</td>
                <td colSpan={3}>{labelResolvers.supplier(formValues.supplier) || "-"}</td>
              </tr>
              {formValues.partyName && (
                <tr>
                  <td style={{ fontWeight: 600 }}>PARTY</td>
                  <td>:</td>
                  <td colSpan={3}>{labelResolvers.party(formValues.partyName)}</td>
                </tr>
              )}
              {(formValues.brokerName || formValues.payTo) && (
                <tr>
                  <td style={{ fontWeight: 600 }}>BROKER</td>
                  <td>:</td>
                  <td>{formValues.brokerName ? labelResolvers.broker(formValues.brokerName) : "-"}</td>
                  <td style={{ fontWeight: 600, textAlign: "right" }}>PAY TO :</td>
                  <td>{formValues.payTo ? labelResolvers.payTo(formValues.payTo) : "-"}</td>
                </tr>
              )}
              <tr>
                <td style={{ fontWeight: 600 }}>VEHICLE TYPE</td>
                <td>:</td>
                <td>{labelResolvers.vehicleType(formValues.vehicleType) || "-"}</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>VEHICLE QTY :</td>
                <td>{formValues.vehicleQty || "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>CHANNEL</td>
                <td>:</td>
                <td>{formValues.channelType || "-"}</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>UNIT :</td>
                <td>{formValues.juteUnit || "-"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>CREDIT TERM</td>
                <td>:</td>
                <td>{formValues.creditTerm ? `${formValues.creditTerm} days` : "-"}</td>
                <td style={{ fontWeight: 600, textAlign: "right" }}>EXPECTED DATE :</td>
                <td>{formatDate(formValues.expectedDate)}</td>
              </tr>
              {(formValues.freightCharge || formValues.daltaPc) && (
                <tr>
                  <td style={{ fontWeight: 600 }}>FREIGHT CHARGES</td>
                  <td>:</td>
                  <td>{formValues.freightCharge ? `₹ ${formatAmount(parseFloat(formValues.freightCharge) || 0)}` : "-"}</td>
                  <td style={{ fontWeight: 600, textAlign: "right" }}>LESS (%) :</td>
                  <td>{formValues.daltaPc || "-"}</td>
                </tr>
              )}
            </tbody>
          </Box>

          {/* Mukam */}
          {formValues.mukam && (
            <Typography variant="body2" textAlign="center" sx={{ mb: 1 }}>
              <strong>Mukam :</strong> {labelResolvers.mukam(formValues.mukam)}
            </Typography>
          )}

          <Divider sx={{ my: 1 }} />

          {/* ── Line Items Table ── */}
          <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <thead>
              <tr>
                <th style={thStyle}>Item</th>
                <th style={thStyle}>Quality</th>
                <th style={thStyle}>Crop Year</th>
                <th style={thStyle}>Marka</th>
                <th style={thRight}>Weight in<br />Qtls</th>
                <th style={thRight}>Rate per<br />Qtls Rs</th>
                <th style={thRight}>Moisture %</th>
                <th style={thRight}>Amount Rs</th>
              </tr>
            </thead>
            <tbody>
              {validLines.map((line, index) => (
                <tr key={line.id || index}>
                  <td style={tdStyle}>{line.itemName || labelResolvers.item(line.itemId)}</td>
                  <td style={tdStyle}>{line.qualityName || labelResolvers.quality(line.itemId, line.quality)}</td>
                  <td style={tdCenter}>{line.cropYear || "-"}</td>
                  <td style={tdCenter}>{line.marka || "-"}</td>
                  <td style={tdRight}>{formatWeight(parseFloat(line.weight) || 0)}</td>
                  <td style={tdRight}>{formatAmount(parseFloat(line.rate) || 0)}</td>
                  <td style={tdRight}>{line.allowableMoisture || "-"}</td>
                  <td style={tdRight}>{formatAmount(parseFloat(line.amount) || 0)}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr style={{ fontWeight: 700 }}>
                <td style={tdStyle}><strong>Total</strong></td>
                <td style={tdStyle} />
                <td style={tdStyle} />
                <td style={tdStyle} />
                <td style={tdRight}><strong>{formatWeight(totalWeight)}</strong></td>
                <td style={tdStyle} />
                <td style={tdStyle} />
                <td style={tdRight}><strong>{formatAmount(totalAmount)}</strong></td>
              </tr>
            </tbody>
          </Box>

          {/* ── Remarks ── */}
          {formValues.remarks && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" fontSize="12px">
                <strong>Remarks:</strong> {formValues.remarks}
              </Typography>
            </Box>
          )}

          {/* ── Status ── */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Status: <strong>{JUTE_PO_STATUS_LABELS[statusId]}</strong>
            </Typography>
          </Box>

          {/* ── Footer ── */}
          <Typography
            variant="caption"
            display="block"
            textAlign="center"
            color="text.secondary"
            sx={{ mt: 4 }}
          >
            Note*: This is a computer generated print, Signature is not required.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default JutePOPreview;
