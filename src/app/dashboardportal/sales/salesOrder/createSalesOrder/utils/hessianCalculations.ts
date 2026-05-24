/**
 * Hessian (invoice_type_id = 2) computation utilities for Sales Order.
 *
 * These are pure functions extracted for testability.
 * Used by useSalesOrderLineItems hook for hessian line calculations.
 */

export type HessianComputedFields = {
	/** Quantity in metric tonnes (qtyBales / conversionFactor) */
	qtyMt: number;
	/** Rate per bale (rawRateMt / conversionFactor) */
	ratePerBale: number;
	/** Billing rate per MT after brokerage deduction */
	billingRateMt: number;
	/** Billing rate per bale after brokerage deduction */
	billingRateBale: number;
};

/**
 * Compute all hessian derived values.
 *
 * @param qtyBales     User-entered quantity in bales
 * @param rawRateMt    User-entered rate per MT (pre-brokerage)
 * @param convFactor   Bales per MT from uom_item_map_mst (relation_value)
 * @param brokeragePct Broker commission percent from header
 */
export function computeHessianFields(
	qtyBales: number,
	rawRateMt: number,
	convFactor: number,
	brokeragePct: number,
): HessianComputedFields {
	const qtyMt = convFactor > 0 ? qtyBales / convFactor : 0;
	const ratePerBale = convFactor > 0 ? rawRateMt / convFactor : 0;
	const billingRateMt = rawRateMt - (rawRateMt * brokeragePct) / 100;
	const billingRateBale = convFactor > 0 ? billingRateMt / convFactor : 0;
	return {
		qtyMt: Math.round(qtyMt * 10000) / 10000,
		ratePerBale: Math.round(ratePerBale * 100) / 100,
		billingRateMt: Math.round(billingRateMt),
		billingRateBale: Math.round(billingRateBale * 100) / 100,
	};
}
