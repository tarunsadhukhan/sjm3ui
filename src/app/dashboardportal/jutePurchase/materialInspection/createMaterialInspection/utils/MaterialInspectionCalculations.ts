/**
 * @file gateEntryCalculations.ts
 * @description Calculation functions for Jute Gate Entry.
 */

import type { GateEntryLineItem } from "../types/MaterialInspectionTypes";

/**
 * Calculate net weight from gross and tare weights.
 */
export const calculateNetWeight = (grossWeight: number, tareWeight: number): number => {
	const net = grossWeight - tareWeight;
	return Math.max(0, net);
};

/**
 * Calculate actual weight from net weight and variable shortage.
 * actual_weight = net_weight - variable_shortage
 */
export const calculateActualWeight = (netWeight: number, variableShortage: number): number => {
	const actual = netWeight - variableShortage;
	return Math.max(0, actual);
};

/**
 * Calculate challan weight for a line item based on proportion.
 * Formula: (header challan weight / total challan qty) * line challan qty
 */
export const calculateChallanWeight = (
	headerChallanWeight: number,
	totalChallanQty: number,
	lineChallanQty: number
): number => {
	if (!totalChallanQty || totalChallanQty === 0) return 0;
	return (headerChallanWeight / totalChallanQty) * lineChallanQty;
};

/**
 * Calculate line item actual weight based on proportion of header actual weight.
 * Uses header actual_weight (net - variable_shortage) and actual qty proportions.
 */
export const calculateLineActualWeight = (
	headerActualWeight: number,
	totalActualQty: number,
	lineActualQty: number
): number => {
	if (!totalActualQty || totalActualQty === 0) return 0;
	return (headerActualWeight / totalActualQty) * lineActualQty;
};

/**
 * Get total challan quantity from all line items.
 */
export const getTotalChallanQty = (lineItems: GateEntryLineItem[]): number =>
	lineItems.reduce((sum, li) => sum + (parseFloat(li.challanQty) || 0), 0);

/**
 * Get total actual quantity from all line items.
 */
export const getTotalActualQty = (lineItems: GateEntryLineItem[]): number =>
	lineItems.reduce((sum, li) => sum + (parseFloat(li.actualQty) || 0), 0);

/**
 * Get total challan weight from all line items.
 */
export const getTotalChallanWeight = (lineItems: GateEntryLineItem[]): number =>
	lineItems.reduce((sum, li) => sum + (parseFloat(li.challanWeight) || 0), 0);

/**
 * Get total actual weight from all line items.
 */
export const getTotalActualWeight = (lineItems: GateEntryLineItem[]): number =>
	lineItems.reduce((sum, li) => sum + (parseFloat(li.actualWeight) || 0), 0);

/**
 * Distribute a header total across line items based on the per-line Qty (%) value.
 *
 * Rules:
 * - Lines with % = 0 keep their manually entered weight (preserved as-is).
 * - The amount distributed across the % > 0 lines is the header total MINUS the
 *   sum of the 0% manual weights (the "distributable" amount):
 *     distributable = total - sum(weights where % = 0)
 * - Lines with % > 0 are auto-calculated against the distributable amount:
 *     weight = ROUND((% / 100) * distributable, 2)
 *   e.g. =+ROUND((C3-G5)*F3, 2) where C3 = header total, G5 = 0% row weight.
 * - The LAST line with % > 0 is the balancing row so the column total ties out to
 *   the header total exactly:
 *     lastWeight = total - sum(weights where % = 0) - sum(other % > 0 weights)
 *
 * @param lineItems  the line items
 * @param total      the header total to distribute (challan wt or tare wt)
 * @param field      which weight field to populate
 */
const distributeWeightsByPercent = (
	lineItems: GateEntryLineItem[],
	total: number,
	field: "challanWeight" | "actualWeight"
): string[] => {
	const pctOf = (li: GateEntryLineItem) => parseFloat(li.actualQty) || 0;

	// Start from the existing values (so % = 0 rows keep their manual weight)
	const result = lineItems.map((li) => li[field] ?? "");

	const pctIndices = lineItems
		.map((li, idx) => ({ idx, pct: pctOf(li) }))
		.filter((x) => x.pct > 0)
		.map((x) => x.idx);

	if (pctIndices.length === 0 || total <= 0) {
		return result;
	}

	// Sum of manually given weights on the 0% rows
	const zeroPctSum = lineItems.reduce(
		(sum, li) => (pctOf(li) === 0 ? sum + (parseFloat(li[field]) || 0) : sum),
		0
	);

	// Percentages are applied to the amount left after the 0% manual weights,
	// not the full header total: distributable = total - zeroPctSum.
	const distributable = total - zeroPctSum;

	const lastPctIdx = pctIndices[pctIndices.length - 1];
	let otherPctSum = 0;

	for (const idx of pctIndices) {
		if (idx === lastPctIdx) continue;
		const weight = Number(((pctOf(lineItems[idx]) / 100) * distributable).toFixed(2));
		result[idx] = weight.toFixed(2);
		otherPctSum += weight;
	}

	// Last % > 0 row balances the column so it ties out to the header total
	const lastWeight = total - zeroPctSum - otherPctSum;
	result[lastPctIdx] = lastWeight.toFixed(2);

	return result;
};

/**
 * Recalculate line item weights from the per-line Qty (%) input.
 * - challan weight is distributed against the header challan weight
 * - actual weight is distributed against the header tare weight
 */
export const recalculateLineItemWeights = (
	lineItems: GateEntryLineItem[],
	headerChallanWeight: number,
	headerTareWeight: number
): GateEntryLineItem[] => {
	const challanWeights = distributeWeightsByPercent(lineItems, headerChallanWeight, "challanWeight");
	const actualWeights = distributeWeightsByPercent(lineItems, headerTareWeight, "actualWeight");

	return lineItems.map((li, i) => ({
		...li,
		challanWeight: challanWeights[i],
		actualWeight: actualWeights[i],
	}));
};

/** Tolerance for floating-point percent/weight tie-out comparisons. */
const TIE_TOLERANCE = 0.01;

/**
 * Validate the line-item distribution before a save/complete action.
 *
 * Rules (per the challan-weight distribution spec):
 * - The challan weight column must tie out to the header challan weight.
 * - The actual weight column must tie out to the header tare weight.
 *
 * A line "participates" if it carries a percentage or a weight (so blank
 * trailing rows are ignored). Returns null when there is nothing to validate or
 * everything ties out; otherwise returns a human-readable error message.
 *
 * @param lineItems            the line items
 * @param headerChallanWeight  header challan weight (challan column should equal this)
 * @param headerTareWeight     header tare weight (actual column should equal this)
 */
export const validateLineItemDistribution = (
	lineItems: GateEntryLineItem[],
	headerChallanWeight: number,
	headerTareWeight: number
): string | null => {
	const participating = lineItems.filter(
		(li) =>
			(parseFloat(li.actualQty) || 0) > 0 ||
			(parseFloat(li.challanWeight) || 0) > 0 ||
			(parseFloat(li.actualWeight) || 0) > 0
	);

	if (participating.length === 0) return null;

	// Challan weight column must tie out to the header challan weight.
	if (headerChallanWeight > 0) {
		const totalChallanWeight = participating.reduce(
			(sum, li) => sum + (parseFloat(li.challanWeight) || 0),
			0
		);
		if (Math.abs(totalChallanWeight - headerChallanWeight) > TIE_TOLERANCE) {
			return `Total challan weight (${totalChallanWeight.toFixed(2)}) must equal the header challan weight (${headerChallanWeight.toFixed(2)}).`;
		}
	}

	// Actual weight column must tie out to the header tare weight.
	if (headerTareWeight > 0) {
		const totalActualWeight = participating.reduce(
			(sum, li) => sum + (parseFloat(li.actualWeight) || 0),
			0
		);
		if (Math.abs(totalActualWeight - headerTareWeight) > TIE_TOLERANCE) {
			return `Total actual weight (${totalActualWeight.toFixed(2)}) must equal the tare weight (${headerTareWeight.toFixed(2)}).`;
		}
	}

	return null;
};

/**
 * Calculate line item totals summary.
 */
export const calculateLineItemTotals = (lineItems: GateEntryLineItem[]) => ({
	totalChallanQty: getTotalChallanQty(lineItems),
	totalChallanWeight: getTotalChallanWeight(lineItems),
	totalActualQty: getTotalActualQty(lineItems),
	totalActualWeight: getTotalActualWeight(lineItems),
	validLineCount: lineItems.filter((li) => li.challanItem || li.actualItem).length,
});
