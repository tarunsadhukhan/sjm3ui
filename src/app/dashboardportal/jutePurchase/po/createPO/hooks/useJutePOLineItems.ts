"use client";

/**
 * @hook useJutePOLineItems
 * @description Manages line items for Jute PO with auto-weight/amount calculation.
 */

import * as React from "react";
import type { JutePOLineItem, MuiFormMode, Option } from "../types/jutePOTypes";
import { createBlankLine, lineHasAnyData } from "../utils/jutePOFactories";
import { calculateWeight, calculateAmount, formatNumber } from "../utils/jutePOCalculations";
import { useLineItems } from "@/components/ui/transaction";

export type UseJutePOLineItemsParams = {
  mode: MuiFormMode;
  juteUnit: string;
  vehicleCapacity: number;
  vehicleQty: number;
  getQualityOptions: (itemId: string) => Option[];
};

type UseJutePOLineItemsReturn = {
  lineItems: JutePOLineItem[];
  setLineItems: React.Dispatch<React.SetStateAction<JutePOLineItem[]>>;
  replaceItems: (items: JutePOLineItem[]) => void;
  removeLineItems: (ids: string[]) => void;
  handleLineFieldChange: (id: string, field: keyof JutePOLineItem, value: string) => void;
  recalculateAllWeights: () => void;
};

export function useJutePOLineItems({
  mode,
  juteUnit,
  vehicleCapacity,
  vehicleQty,
}: UseJutePOLineItemsParams): UseJutePOLineItemsReturn {
  const {
    items: lineItems,
    setItems: setLineItems,
    replaceItems,
    removeItems: removeLineItems,
  } = useLineItems<JutePOLineItem>({
    createBlankItem: createBlankLine,
    hasData: lineHasAnyData,
    getItemId: (item) => item.id,
    maintainTrailingBlank: mode !== "view",
  });

  /**
   * Recalculate weight and amount for a single line item.
   */
  const recalculateLineWeightAmount = React.useCallback(
    (line: JutePOLineItem): JutePOLineItem => {
      const qty = Number(line.quantity);
      const rate = Number(line.rate);

      if (!Number.isFinite(qty) || qty <= 0) {
        return { ...line, weight: "", amount: "" };
      }

      const weight = calculateWeight(qty, vehicleCapacity, vehicleQty, juteUnit);
      const amount = calculateAmount(weight, rate);

      return {
        ...line,
        weight: formatNumber(weight, 2),
        amount: Number.isFinite(amount) && amount > 0 ? formatNumber(amount, 2) : "",
      };
    },
    [juteUnit, vehicleCapacity, vehicleQty]
  );

  /**
   * Recalculate weights/amounts for all line items.
   * Called when vehicle type, vehicle qty, or unit type changes.
   */
  const recalculateAllWeights = React.useCallback(() => {
    setLineItems((prev) => prev.map(recalculateLineWeightAmount));
  }, [recalculateLineWeightAmount, setLineItems]);

  /**
   * Handle field change on a line item.
   */
  const handleLineFieldChange = React.useCallback(
    (id: string, field: keyof JutePOLineItem, rawValue: string) => {
      if (mode === "view") return;

      // Item change: reset quality
      if (field === "itemId") {
        setLineItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            return { ...item, itemId: rawValue, quality: "" };
          })
        );
        return;
      }

      // Quantity or rate change: recalculate weight and amount
      if (field === "quantity" || field === "rate") {
        setLineItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: rawValue };
            return recalculateLineWeightAmount(updated);
          })
        );
        return;
      }

      // Other fields: simple update
      setLineItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: rawValue } : item))
      );
    },
    [mode, setLineItems, recalculateLineWeightAmount]
  );

  return {
    lineItems,
    setLineItems,
    replaceItems,
    removeLineItems,
    handleLineFieldChange,
    recalculateAllWeights,
  };
}
