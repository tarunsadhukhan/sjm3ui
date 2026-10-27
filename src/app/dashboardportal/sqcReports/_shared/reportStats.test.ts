import { describe, expect, it } from "vitest";
import { cvPct, groupBy, hyLt, mean, pctOf, stdev } from "./reportStats";

describe("reportStats", () => {
  it("matches the Yarn Test register (frame 30 regain wts → SD 0.822, CV 6.52%)", () => {
    const regain = [14.22, 12.14, 13.13, 12.04, 12.04, 12.04];
    expect(mean(regain)).toBeCloseTo(12.6, 2);
    expect(stdev(regain)).toBeCloseTo(0.822, 2);
    expect(cvPct(regain)).toBeCloseTo(6.52, 1);
  });

  it("ignores nulls and handles tiny inputs", () => {
    expect(mean([null, 2, undefined, 4])).toBe(3);
    expect(stdev([5])).toBe(0);
    expect(stdev([2, 4])).toBe(1);
    expect(stdev([])).toBeNull();
  });

  it("labels deviation and percentages", () => {
    expect(hyLt(0.22)).toBe("+0.22% HY");
    expect(hyLt(-5.62)).toBe("-5.62% LT");
    expect(pctOf([1, 2, 3, 4], (x) => x > 2)).toBe(50);
    expect(groupBy(["a1", "b1", "a2"], (s) => s[0])).toEqual([
      ["a", ["a1", "a2"]],
      ["b", ["b1"]],
    ]);
  });
});
