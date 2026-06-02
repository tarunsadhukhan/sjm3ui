"use client";

/**
 * @component JutePOTotalsDisplay
 * @description Displays the calculated totals for Jute PO (total weight and amount).
 */

import * as React from "react";
import { formatWeight, formatAmount } from "../utils/jutePOCalculations";

type JutePOTotalsDisplayProps = {
  totalWeight: number;
  totalAmount: number;
  lineCount: number;
};

export function JutePOTotalsDisplay({
  totalWeight,
  totalAmount,
  lineCount,
}: JutePOTotalsDisplayProps) {
  return (
    <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Order Summary</h4>

      <div className="grid grid-cols-3 gap-4">
        {/* Line Count */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Line Items</span>
          <span className="text-lg font-medium text-gray-900">{lineCount}</span>
        </div>

        {/* Total Weight */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Total Weight</span>
          <span className="text-lg font-medium text-gray-900">{formatWeight(totalWeight)} Qtl</span>
        </div>

        {/* Total Amount */}
        <div className="flex flex-col">
          <span className="text-xs text-gray-500">Total Amount</span>
          <span className="text-lg font-semibold text-green-700">₹ {formatAmount(totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}

export default JutePOTotalsDisplay;
