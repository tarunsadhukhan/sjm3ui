"use client";

/**
 * @component JutePOPreview
 * @description Printable preview modal for Jute PO with header and line items.
 */

import * as React from "react";
import { Dialog, DialogTitle, DialogContent, IconButton } from "@mui/material";
import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JutePOFormValues, JutePOLineItem, JutePOLabelResolvers } from "../types/jutePOTypes";
import { formatWeight, formatAmount, formatDate } from "../utils/jutePOCalculations";
import { JUTE_PO_STATUS_LABELS } from "../utils/jutePOConstants";
import type { ApprovalStatusId } from "../types/jutePOTypes";

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
}: JutePOPreviewProps) {
  const printRef = React.useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow && printRef.current) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Jute PO - ${poNumber || "Draft"}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .header { margin-bottom: 20px; }
              .header h1 { margin: 0; font-size: 24px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 20px 0; }
              .info-item { display: flex; gap: 8px; }
              .info-label { font-weight: bold; min-width: 120px; }
              .totals { margin-top: 20px; text-align: right; }
              .totals p { margin: 5px 0; }
              @media print { @page { size: A4; margin: 10mm; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            ${printRef.current.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Filter out blank lines
  const validLines = lineItems.filter((line) => line.itemId && parseFloat(line.quantity) > 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex justify-between items-center">
        <span>Jute Purchase Order Preview</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <IconButton onClick={onClose} size="small">
            <X className="w-4 h-4" />
          </IconButton>
        </div>
      </DialogTitle>

      <DialogContent dividers>
        <div ref={printRef}>
          {/* Header */}
          <div className="header">
            <h1 className="text-2xl font-bold">Jute Purchase Order</h1>
            <p className="text-gray-600">
              {poNumber ? `PO #${poNumber}` : "Draft"} • {JUTE_PO_STATUS_LABELS[statusId]}
            </p>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 my-4 p-4 bg-gray-50 rounded">
            <div className="flex gap-2">
              <span className="font-semibold">Branch:</span>
              <span>{labelResolvers.branch(formValues.branch)}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">PO Date:</span>
              <span>{formatDate(formValues.poDate)}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">Mukam:</span>
              <span>{labelResolvers.mukam(formValues.mukam)}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">Unit:</span>
              <span>{formValues.juteUnit}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">Supplier:</span>
              <span>{labelResolvers.supplier(formValues.supplier)}</span>
            </div>
            {formValues.partyName && (
              <div className="flex gap-2">
                <span className="font-semibold">Party:</span>
                <span>{labelResolvers.party(formValues.partyName)}</span>
              </div>
            )}
            <div className="flex gap-2">
              <span className="font-semibold">Vehicle Type:</span>
              <span>{labelResolvers.vehicleType(formValues.vehicleType)}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">Vehicle Qty:</span>
              <span>{formValues.vehicleQty}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">Channel:</span>
              <span>{formValues.channelType}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">Credit Term:</span>
              <span>{formValues.creditTerm} days</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">Expected Date:</span>
              <span>{formatDate(formValues.expectedDate)}</span>
            </div>
            <div className="flex gap-2">
              <span className="font-semibold">Freight Charge:</span>
              <span>₹ {formatAmount(parseFloat(formValues.freightCharge) || 0)}</span>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full border-collapse mt-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Item</th>
                <th className="border p-2 text-left">Quality</th>
                <th className="border p-2 text-left">Crop Year</th>
                <th className="border p-2 text-left">Marka</th>
                <th className="border p-2 text-right">Qty</th>
                <th className="border p-2 text-right">Rate</th>
                <th className="border p-2 text-right">Moisture %</th>
                <th className="border p-2 text-right">Weight (Kg)</th>
                <th className="border p-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {validLines.map((line, index) => (
                <tr key={line.id || index}>
                  <td className="border p-2">{labelResolvers.item(line.itemId)}</td>
                  <td className="border p-2">{labelResolvers.quality(line.itemId, line.quality)}</td>
                  <td className="border p-2">{line.cropYear}</td>
                  <td className="border p-2">{line.marka || "-"}</td>
                  <td className="border p-2 text-right">{line.quantity}</td>
                  <td className="border p-2 text-right">{formatAmount(parseFloat(line.rate) || 0)}</td>
                  <td className="border p-2 text-right">{line.allowableMoisture || "-"}</td>
                  <td className="border p-2 text-right">{formatWeight(parseFloat(line.weight) || 0)}</td>
                  <td className="border p-2 text-right">{formatAmount(parseFloat(line.amount) || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 text-right">
            <p className="text-sm">
              <span className="font-semibold">Total Weight:</span> {formatWeight(totalWeight)} Qtl
            </p>
            <p className="text-lg font-bold text-green-700">
              <span className="font-semibold">Total Amount:</span> ₹ {formatAmount(totalAmount)}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default JutePOPreview;
