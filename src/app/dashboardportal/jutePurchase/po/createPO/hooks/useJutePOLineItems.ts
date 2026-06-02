"use client";

/**
 * @hook useJutePOLineItems
 * @description Manages line items for Jute PO with auto-weight/amount calculation.
 */

import * as React from "react";
import type { JutePOLineItem, MuiFormMode, Option } from "../types/jutePOTypes";
import { createBlankLine, lineHasAnyData } from "../utils/jutePOFactories";
import { calculateAmount, formatNumber } from "../utils/jutePOCalculations";
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
   * Recalculate the line amount from the directly-entered weight and rate.
   * Weight is entered in quintals and rate is per quintal, so amount = weight * rate.
   */
  const recalculateLineAmount = React.useCallback(
    (line: JutePOLineItem): JutePOLineItem => {
      const weight = Number(line.weight);
      const rate = Number(line.rate);

      if (!Number.isFinite(weight) || weight <= 0) {
        return { ...line, amount: "" };
      }

      const amount = calculateAmount(weight, rate);

      return {
        ...line,
        amount: Number.isFinite(amount) && amount > 0 ? formatNumber(amount, 2) : "",
      };
    },
    []
  );

  /**
   * Recalculate amounts for all line items.
   */
  const recalculateAllWeights = React.useCallback(() => {
    setLineItems((prev) => prev.map(recalculateLineAmount));
  }, [recalculateLineAmount, setLineItems]);

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

      // Weight or rate change: recalculate amount (amount = weight * rate)
      if (field === "weight" || field === "rate") {
        setLineItems((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: rawValue };
            return recalculateLineAmount(updated);
          })
        );
        return;
      }

      // Other fields: simple update
      setLineItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, [field]: rawValue } : item))
      );
    },
    [mode, setLineItems, recalculateLineAmount]
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
