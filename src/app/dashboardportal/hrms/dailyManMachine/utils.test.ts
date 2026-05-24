/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { mapManMachineDetailRows, buildDepartmentSummaryRows, getExcessShortTone } from "./utils";

describe("dailyManMachine utils", () => {
  it("maps raw records with computed totals", () => {
    const rows = mapManMachineDetailRows([
      {
        tran_date: "2026-04-01T00:00:00",
        dept_desc: "Spinning",
        hands_a: "2",
        hands_b: 3,
        hands_c: 1,
        thands_a: "1",
        thands_b: 1,
        thands_c: 1,
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].tran_date).toBe("2026-04-01");
    expect(rows[0].department).toBe("Spinning");
    expect(rows[0].total_hands).toBe(6);
    expect(rows[0].total_target).toBe(3);
    expect(rows[0].excess_short).toBe(3);
  });

  it("builds date-wise summary rows and appends date total row", () => {
    const details = mapManMachineDetailRows([
      {
        tran_date: "2026-04-01",
        department: "A",
        hands_a: 1,
        hands_b: 1,
        hands_c: 0,
        thands_a: 1,
        thands_b: 1,
        thands_c: 1,
      },
      {
        tran_date: "2026-04-01",
        department: "A",
        hands_a: 1,
        hands_b: 0,
        hands_c: 0,
        thands_a: 1,
        thands_b: 1,
        thands_c: 1,
      },
      {
        tran_date: "2026-04-01",
        department: "B",
        hands_a: 2,
        hands_b: 0,
        hands_c: 0,
        thands_a: 1,
        thands_b: 1,
        thands_c: 1,
      },
    ]);

    const summary = buildDepartmentSummaryRows(details);
    expect(summary).toHaveLength(3);

    const rowA = summary.find((r) => r.department === "A");
    const rowB = summary.find((r) => r.department === "B");
    const total = summary.find((r) => r.is_date_total);

    expect(rowA?.total_hands).toBe(3);
    expect(rowA?.total_target).toBe(6);
    expect(rowB?.total_hands).toBe(2);
    expect(total?.department).toBe("Date Total");
    expect(total?.total_hands).toBe(5);
  });

  it("returns row tones by excess/short sign", () => {
    expect(
      getExcessShortTone({
        id: "1",
        tran_date: "2026-04-01",
        department: "A",
        hands_a: 0,
        hands_b: 0,
        hands_c: 0,
        total_hands: 10,
        target_a: 0,
        target_b: 0,
        target_c: 0,
        total_target: 6,
        excess_short: 4,
      })
    ).toBe("positive");

    expect(
      getExcessShortTone({
        id: "2",
        tran_date: "2026-04-01",
        department: "A",
        hands_a: 0,
        hands_b: 0,
        hands_c: 0,
        total_hands: 3,
        target_a: 0,
        target_b: 0,
        target_c: 0,
        total_target: 7,
        excess_short: -4,
      })
    ).toBe("negative");
  });
});
