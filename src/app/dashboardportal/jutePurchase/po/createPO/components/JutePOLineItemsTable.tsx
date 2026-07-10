"use client";

/**
 * @component JutePOLineItemsTable
 * @description Read-only line items table for Jute PO. Lines are entered via
 * JutePOLineEntryForm above; each row has Edit / Delete actions when editable.
 * Columns: Item, Quality, Crop Year, Marka, Weight, Rate, Moisture, Amount, Actions
 */

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { TransactionLineColumn } from "@/components/ui/transaction";
import { Button } from "@/components/ui/button";
import type { JutePOLineItem, JutePOLabelResolvers } from "../types/jutePOTypes";
import { formatAmount } from "../utils/jutePOCalculations";

type UseJutePOLineItemColumnsParams = {
  canEdit: boolean;
  labelResolvers: JutePOLabelResolvers;
  /** ID of the row currently loaded in the entry panel, if any. */
  editingLineId: string | null;
  onEditLine: (item: JutePOLineItem) => void;
  onDeleteLine: (id: string) => void;
};

export function useJutePOLineItemColumns({
  canEdit,
  labelResolvers,
  editingLineId,
  onEditLine,
  onDeleteLine,
}: UseJutePOLineItemColumnsParams): TransactionLineColumn<JutePOLineItem>[] {
  return React.useMemo<TransactionLineColumn<JutePOLineItem>[]>(() => {
    const columns: TransactionLineColumn<JutePOLineItem>[] = [
      {
        id: "item",
        header: "Item",
        width: "1.5fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => (
          <span className="text-xs">{item.itemName || labelResolvers.item(item.itemId)}</span>
        ),
        getTooltip: ({ item }: { item: JutePOLineItem }) =>
          item.itemName || labelResolvers.item(item.itemId) || undefined,
      },
      {
        id: "quality",
        header: "Quality",
        width: "1.2fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => (
          <span className="text-xs">
            {item.qualityName || labelResolvers.quality(item.itemId, item.quality)}
          </span>
        ),
        getTooltip: ({ item }: { item: JutePOLineItem }) =>
          item.qualityName || labelResolvers.quality(item.itemId, item.quality) || undefined,
      },
      {
        id: "cropYear",
        header: "Crop Year",
        width: "0.9fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => (
          <span className="text-xs">{item.cropYear || "-"}</span>
        ),
      },
      {
        id: "marka",
        header: "Marka",
        width: "0.8fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => (
          <span className="text-xs">{item.marka || "-"}</span>
        ),
      },
      {
        id: "weight",
        header: "Weight (Qtl)",
        width: "0.9fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => (
          <span className="text-xs text-right font-medium">{item.weight || "-"}</span>
        ),
      },
      {
        id: "rate",
        header: "Rate (per Qtl)",
        width: "0.8fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => (
          <span className="text-xs text-right">{formatAmount(parseFloat(item.rate) || 0)}</span>
        ),
      },
      {
        id: "allowableMoisture",
        header: "Moisture %",
        width: "0.8fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => (
          <span className="text-xs text-right">{item.allowableMoisture || "-"}</span>
        ),
      },
      {
        id: "amount",
        header: "Amount",
        width: "1fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => (
          <span className="text-xs text-right font-medium">
            {formatAmount(parseFloat(item.amount) || 0)}
          </span>
        ),
        getTooltip: ({ item }: { item: JutePOLineItem }) =>
          `Line total: ${formatAmount(parseFloat(item.amount) || 0)}`,
      },
    ];

    if (canEdit) {
      columns.push({
        id: "actions",
        header: "Actions",
        width: "0.7fr",
        renderCell: ({ item }: { item: JutePOLineItem }) => (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => onEditLine(item)}
              disabled={item.id === editingLineId}
              title="Edit line"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 text-red-600 hover:text-red-700"
              onClick={() => onDeleteLine(item.id)}
              title="Delete line"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      });
    }

    return columns;
  }, [canEdit, labelResolvers, editingLineId, onEditLine, onDeleteLine]);
}

export default useJutePOLineItemColumns;
