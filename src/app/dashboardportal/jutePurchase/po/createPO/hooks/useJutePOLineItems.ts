"use client";

/**
 * @hook useJutePOLineItems
 * @description Manages line items for Jute PO. Lines are added/updated from the
 * entry panel (JutePOLineEntryForm) rather than edited inline, so there is no
 * trailing blank row.
 */

import * as React from "react";
import type { JutePOLineItem, MuiFormMode } from "../types/jutePOTypes";
import { createBlankLine, lineHasAnyData } from "../utils/jutePOFactories";
import { calculateAmount, formatNumber } from "../utils/jutePOCalculations";
import { useLineItems } from "@/components/ui/transaction";

export type UseJutePOLineItemsParams = {
  mode: MuiFormMode;
};

type UseJutePOLineItemsReturn = {
  lineItems: JutePOLineItem[];
  setLineItems: React.Dispatch<React.SetStateAction<JutePOLineItem[]>>;
  replaceItems: (items: JutePOLineItem[]) => void;
  removeLineItems: (ids: string[]) => void;
  addLine: (draft: Partial<Omit<JutePOLineItem, "id">>) => void;
  updateLine: (id: string, draft: Partial<Omit<JutePOLineItem, "id">>) => void;
};

/**
 * Recalculate the line amount from the directly-entered weight and rate.
 * Weight is entered in quintals and rate is per quintal, so amount = weight * rate.
 */
const recalculateLineAmount = (line: JutePOLineItem): JutePOLineItem => {
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
};

export function useJutePOLineItems({ mode }: UseJutePOLineItemsParams): UseJutePOLineItemsReturn {
  const {
    items: lineItems,
    setItems: setLineItems,
    replaceItems,
    removeItems: removeLineItems,
  } = useLineItems<JutePOLineItem>({
    createBlankItem: createBlankLine,
    hasData: lineHasAnyData,
    getItemId: (item) => item.id,
    maintainTrailingBlank: false,
  });

  /** Append a new line from the entry panel draft. */
  const addLine = React.useCallback(
    (draft: Partial<Omit<JutePOLineItem, "id">>) => {
      if (mode === "view") return;
      const line = recalculateLineAmount({ ...createBlankLine(), ...draft });
      setLineItems((prev) => [...prev, line]);
    },
    [mode, setLineItems]
  );

  /** Overwrite an existing line with the entry panel draft. */
  const updateLine = React.useCallback(
    (id: string, draft: Partial<Omit<JutePOLineItem, "id">>) => {
      if (mode === "view") return;
      setLineItems((prev) =>
        prev.map((item) => (item.id === id ? recalculateLineAmount({ ...item, ...draft }) : item))
      );
    },
    [mode, setLineItems]
  );

  return {
    lineItems,
    setLineItems,
    replaceItems,
    removeLineItems,
    addLine,
    updateLine,
  };
}
