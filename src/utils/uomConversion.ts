/** UOM conversion record for a specific item. */
export type UomConversionEntry = {
	mapFromId: string;
	mapFromName: string;
	mapToId: string;
	mapToName: string;
	relationValue: number;
	rounding: number;
};

export type ConvertedRateResult = {
	convertedRate: string;
	otherUomName: string;
} | null;

/**
 * Compute the converted rate for the "other" UOM.
 * - If selected UOM = mapFromId: convertedRate = rate / relationValue (show per mapToName)
 * - If selected UOM = mapToId: convertedRate = rate * relationValue (show per mapFromName)
 * Returns null if no conversion applies.
 */
export function computeConvertedRate(
	rate: string,
	selectedUomId: string,
	conversions: UomConversionEntry[] | undefined,
): ConvertedRateResult {
	if (!rate || !selectedUomId || !conversions?.length) return null;

	const rateNum = parseFloat(rate);
	if (isNaN(rateNum) || rateNum === 0) return null;

	for (const conv of conversions) {
		if (conv.relationValue === 0) continue;

		let convertedRate: number;
		let otherUomName: string;

		if (selectedUomId === conv.mapFromId) {
			convertedRate = rateNum / conv.relationValue;
			otherUomName = conv.mapToName;
		} else if (selectedUomId === conv.mapToId) {
			convertedRate = rateNum * conv.relationValue;
			otherUomName = conv.mapFromName;
		} else {
			continue;
		}

		const rounding = conv.rounding ?? 2;
		return {
			convertedRate: convertedRate.toFixed(rounding),
			otherUomName,
		};
	}

	return null;
}
