/**
 * @description Tests for MR weight distribution and rounding logic.
 * actual_weight, accepted_weight and shortage_kgs all carry 2 decimal places.
 * The largest-remainder distribution (in integer cents) sums to the exact
 * header weight at 2 dp.
 */
import { describe, it, expect } from "vitest";
import {
	round2,
	calculateShortageAndAcceptedWeight,
	distributeActualWeightToLineItems,
	type WeightLine,
} from "./weightDistribution";

type TestLineItem = WeightLine & { id: string };

const sum2 = (lines: TestLineItem[]): number =>
	round2(lines.reduce((s, li) => s + (li.actualWeight ?? 0), 0));

// ─── Tests ───────────────────────────────────────────────────────────

describe("calculateShortageAndAcceptedWeight", () => {
	it("should return null for null/zero weight", () => {
		expect(calculateShortageAndAcceptedWeight(null, 10, 12, 0)).toEqual({ shortageKgs: null, acceptedWeight: null });
		expect(calculateShortageAndAcceptedWeight(0, 10, 12, 0)).toEqual({ shortageKgs: null, acceptedWeight: null });
	});

	it("keeps shortage and accepted to 2 decimals", () => {
		const result = calculateShortageAndAcceptedWeight(1000, 10, 16.67, 2);
		// deduction = (16.67-10) + 2 = 8.67% -> shortage = round2(86.7) = 86.7
		expect(result.shortageKgs).toBe(86.7);
		expect(result.acceptedWeight).toBe(913.3); // round2(1000 - 86.7)
		expect(round2(result.shortageKgs ?? 0)).toBe(result.shortageKgs);
		expect(round2(result.acceptedWeight ?? 0)).toBe(result.acceptedWeight);
	});

	it("should return shortageKgs=0 when no deduction", () => {
		const result = calculateShortageAndAcceptedWeight(500, 15, 10, 0);
		expect(result.shortageKgs).toBe(0);
		expect(result.acceptedWeight).toBe(500);
	});

	it("should correctly compute shortage and accepted", () => {
		// 1000 kg, moisture diff = 16 - 10 = 6%, dust = 2%, total = 8%
		// shortage = round(1000 * 8 / 100) = 80, accepted = 1000 - 80 = 920
		const result = calculateShortageAndAcceptedWeight(1000, 10, 16, 2);
		expect(result.shortageKgs).toBe(80);
		expect(result.acceptedWeight).toBe(920);
	});

	it("preserves 2 decimals on a fractional actual weight", () => {
		// 999.6 kg, deduction 8% -> shortage = round2(79.968) = 79.97
		// accepted = round2(999.6 - 79.97) = 919.63
		const result = calculateShortageAndAcceptedWeight(999.6, 10, 16, 2);
		expect(result.shortageKgs).toBe(79.97);
		expect(result.acceptedWeight).toBe(919.63);
	});

	it("should handle negative weight as null-like", () => {
		const result = calculateShortageAndAcceptedWeight(-5, 10, 16, 2);
		expect(result.shortageKgs).toBeNull();
		expect(result.acceptedWeight).toBeNull();
	});
});

describe("distributeActualWeightToLineItems", () => {
	const makeLine = (id: string, qty: number): TestLineItem => ({
		id, actualQty: qty, actualWeight: null, allowableMoisture: null,
		actualMoisture: null, claimDust: null, shortageKgs: null, acceptedWeight: null,
	});

	it("should return unchanged for 0 header weight", () => {
		const lines = [makeLine("1", 10)];
		const result = distributeActualWeightToLineItems(lines, 0);
		expect(result).toBe(lines);
	});

	it("should return unchanged for empty lines", () => {
		const lines: TestLineItem[] = [];
		const result = distributeActualWeightToLineItems(lines, 1000);
		expect(result).toBe(lines);
	});

	it("should assign all weight to a single line", () => {
		const result = distributeActualWeightToLineItems([makeLine("1", 5)], 1000);
		expect(result[0].actualWeight).toBe(1000);
	});

	it("should sum to exact header weight (3 equal lines, remainder case)", () => {
		// 1000 / 3 -> 333.33, 333.33, 333.34 (one line gets the spare cent)
		const lines = [makeLine("1", 10), makeLine("2", 10), makeLine("3", 10)];
		const result = distributeActualWeightToLineItems(lines, 1000);
		expect(sum2(result)).toBe(1000);
	});

	it("should sum to exact header weight (7 lines, unequal qty)", () => {
		const lines = [
			makeLine("1", 3), makeLine("2", 7), makeLine("3", 5),
			makeLine("4", 2), makeLine("5", 8), makeLine("6", 4), makeLine("7", 1),
		];
		const result = distributeActualWeightToLineItems(lines, 1543);
		expect(sum2(result)).toBe(1543);
		// Each weight should be at most 2 decimal places
		result.forEach((li) => {
			if ((li.actualQty ?? 0) > 0) {
				expect(round2(li.actualWeight ?? 0)).toBe(li.actualWeight);
			}
		});
	});

	it("should keep the fractional header weight (2 dp)", () => {
		const lines = [makeLine("1", 5), makeLine("2", 5)];
		const result = distributeActualWeightToLineItems(lines, 999.7);
		// 999.70 split evenly -> 499.85 each
		expect(result[0].actualWeight).toBe(499.85);
		expect(result[1].actualWeight).toBe(499.85);
		expect(sum2(result)).toBe(999.7);
	});

	it("should skip lines with 0 qty", () => {
		const lines = [makeLine("1", 0), makeLine("2", 10)];
		const result = distributeActualWeightToLineItems(lines, 500);
		expect(result[0].actualWeight).toBeNull(); // unchanged
		expect(result[1].actualWeight).toBe(500);
	});

	it("computes 2 dp shortage and accepted per line", () => {
		const line: TestLineItem = {
			id: "1", actualQty: 10, actualWeight: null,
			allowableMoisture: 10, actualMoisture: 16, claimDust: 2,
			shortageKgs: null, acceptedWeight: null,
		};
		const result = distributeActualWeightToLineItems([line], 1000);
		expect(result[0].shortageKgs).toBe(80);
		expect(result[0].acceptedWeight).toBe(920);
	});

	it("should distribute 2-line split with no remainder", () => {
		const lines = [makeLine("1", 5), makeLine("2", 5)];
		const result = distributeActualWeightToLineItems(lines, 1000);
		expect(result[0].actualWeight).toBe(500);
		expect(result[1].actualWeight).toBe(500);
	});

	it("should handle a fractional split correctly", () => {
		// 7.00 / 4 = 1.75 each (exact), sum = 7.00
		const lines = [makeLine("1", 1), makeLine("2", 1), makeLine("3", 1), makeLine("4", 1)];
		const result = distributeActualWeightToLineItems(lines, 7);
		expect(result.every((li) => li.actualWeight === 1.75)).toBe(true);
		expect(sum2(result)).toBe(7);
	});
});
