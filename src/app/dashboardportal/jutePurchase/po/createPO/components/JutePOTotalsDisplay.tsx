"use client";

/**
 * @component JutePOTotalsDisplay
 * @description Displays the calculated totals for Jute PO (total weight and amount).
 * Shows vehicle weight validation status.
 */

import * as React from "react";
import { formatWeight, formatAmount, validateVehicleWeight, VEHICLE_WEIGHT_TOLERANCE_PERCENT } from "../utils/jutePOCalculations";

type JutePOTotalsDisplayProps = {
  totalWeight: number;
  totalAmount: number;
  lineCount: number;
  vehicleCapacityQtl?: number;
  vehicleQty?: number;
};

export function JutePOTotalsDisplay({
  totalWeight,
  totalAmount,
  lineCount,
  vehicleCapacityQtl = 0,
  vehicleQty = 1,
}: JutePOTotalsDisplayProps) {
  // Validate vehicle weight tolerance
  const weightValidation = React.useMemo(
    () => validateVehicleWeight(totalWeight, vehicleCapacityQtl, vehicleQty),
    [totalWeight, vehicleCapacityQtl, vehicleQty]
  );

  const expectedWeight = vehicleCapacityQtl * vehicleQty;
  const hasVehicleCapacity = expectedWeight > 0;

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
          <span className={`text-lg font-medium ${
            hasVehicleCapacity && totalWeight > 0
              ? weightValidation.isValid
                ? "text-green-700"
                : "text-red-600"
              : "text-gray-900"
          }`}>
            {formatWeight(totalWeight)} Qtl
          </span>
          {hasVehicleCapacity && totalWeight > 0 && (
            <span className={`text-xs ${weightValidation.isValid ? "text-green-600" : "text-red-500"}`}>
              {weightValidation.isValid
                ? `✓ Within ±${VEHICLE_WEIGHT_TOLERANCE_PERCENT}% of ${formatWeight(expectedWeight)} Qtl`
                : `✗ ${Math.abs(weightValidation.variancePercent).toFixed(1)}% ${weightValidation.variancePercent > 0 ? "over" : "under"} capacity`}
            </span>
          )}
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
