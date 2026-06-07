/**
 * @file weightDistribution.ts
 * @description Shared MR weight distribution + shortage/accepted calculations.
 *
 * Weights carry 2 decimal places:
 * - actual_weight   -> 2 dp (DB column is Float)
 * - accepted_weight -> 2 dp (DB column is Float)
 * - shortage_kgs    -> 2 dp (DB column is Float)
 *
 * The largest-remainder distribution works in integer "cents" (hundredths of a
 * kg) so the per-line actual weights sum to the header weight exactly at 2 dp.
 */

/** Round to 2 decimal places. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Minimal line-item shape the distribution touches. */
export interface WeightLine {
	actualQty: number | null;
	actualWeight: number | null;
	allowableMoisture: number | null;
	actualMoisture: number | null;
	claimDust: number | null;
	shortageKgs: number | null;
	acceptedWeight: number | null;
}

/**
 * Calculate shortage_kgs and accepted_weight.
 *
 * shortage_kgs    = actual_weight * (moisture diff % + claim_dust%)   [2 dp]
 * accepted_weight = actual_weight - shortage_kgs                      [2 dp]
 */
export function calculateShortageAndAcceptedWeight(
	actualWeight: number | null,
	allowableMoisture: number | null,
	actualMoisture: number | null,
	claimDust: number | null
): { shortageKgs: number | null; acceptedWeight: number | null } {
	if (actualWeight == null || actualWeight <= 0) {
		return { shortageKgs: null, acceptedWeight: null };
	}

	const weight = round2(actualWeight);
	const allowable = allowableMoisture ?? 0;
	const actual = actualMoisture ?? 0;
	const dust = claimDust ?? 0;

	// Calculate moisture difference (only if actual > allowable)
	const moistureDiff = actual > allowable ? actual - allowable : 0;

	// Total deduction percentage
	const deductionPercentage = moistureDiff + dust;

	if (deductionPercentage <= 0) {
		return { shortageKgs: 0, acceptedWeight: weight };
	}

	// shortage_kgs keeps 2 decimals
	const shortageKgs = round2((weight * deductionPercentage) / 100.0);

	// accepted_weight keeps 2 decimals
	const acceptedWeight = round2(Math.max(0, weight - shortageKgs));

	return { shortageKgs, acceptedWeight };
}

/**
 * Distribute header actual weight to line items proportionally based on actualQty.
 * Uses the largest-remainder method in integer cents so the sum of line weights
 * equals the header weight exactly at 2 dp (no rounding loss).
 * Also recalculates shortage_kgs and accepted_weight for each line.
 */
export function distributeActualWeightToLineItems<T extends WeightLine>(
	lineItems: T[],
	headerActualWeight: number
): T[] {
	if (headerActualWeight <= 0 || lineItems.length === 0) {
		return lineItems;
	}

	const headerWeight = round2(headerActualWeight);

	// Calculate total actual quantity
	const totalActualQty = lineItems.reduce((sum, li) => sum + (li.actualQty ?? 0), 0);

	if (totalActualQty <= 0) {
		// If no quantities, assign all to first item (single item case)
		if (lineItems.length === 1) {
			const li = lineItems[0];
			const { shortageKgs, acceptedWeight } = calculateShortageAndAcceptedWeight(
				headerWeight,
				li.allowableMoisture,
				li.actualMoisture,
				li.claimDust
			);
			return [{ ...li, actualWeight: headerWeight, shortageKgs, acceptedWeight }];
		}
		return lineItems;
	}

	// --- Largest-remainder method in integer cents for fair 2 dp distribution ---
	// 1. Compute exact proportional cents and floor them
	const headerCents = Math.round(headerWeight * 100);
	const withQty = lineItems.map((li) => {
		const lineActualQty = li.actualQty ?? 0;
		const exactCents = lineActualQty > 0 ? (headerCents * lineActualQty) / totalActualQty : 0;
		const flooredCents = Math.floor(exactCents);
		const fractionalPart = exactCents - flooredCents;
		return { lineActualQty, flooredCents, fractionalPart };
	});

	// 2. Calculate remainder cents to distribute (0 .. N-1)
	const flooredSum = withQty.reduce((sum, entry) => sum + entry.flooredCents, 0);
	let remainder = headerCents - flooredSum;

	// 3. Sort by fractional part descending — give +1 cent to highest fractions
	const sortedIndices = withQty
		.map((_, idx) => idx)
		.filter((idx) => withQty[idx].lineActualQty > 0)
		.sort((a, b) => withQty[b].fractionalPart - withQty[a].fractionalPart);

	const finalCents = withQty.map((entry) => entry.flooredCents);
	for (const idx of sortedIndices) {
		if (remainder <= 0) break;
		finalCents[idx] += 1;
		remainder -= 1;
	}

	// 4. Apply distributed weights and recalculate shortage/accepted per line
	return lineItems.map((li, idx) => {
		const lineActualQty = li.actualQty ?? 0;
		if (lineActualQty <= 0) {
			return li;
		}

		const distributedWeight = finalCents[idx] / 100;
		const { shortageKgs, acceptedWeight } = calculateShortageAndAcceptedWeight(
			distributedWeight,
			li.allowableMoisture,
			li.actualMoisture,
			li.claimDust
		);

		return {
			...li,
			actualWeight: distributedWeight,
			shortageKgs,
			acceptedWeight,
		};
	});
}
