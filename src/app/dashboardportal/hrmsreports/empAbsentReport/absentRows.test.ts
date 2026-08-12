import { describe, expect, it } from "vitest";
import { buildAbsentRows } from "./absentRows";

const columns = [
  { key: "2026-07-01", label: "01/07" },
  { key: "2026-07-02", label: "02/07" },
  { key: "2026-07-03", label: "03/07" },
];

describe("buildAbsentRows", () => {
  it("marks 0-hour days absent and >0-hour days present", () => {
    const [row] = buildAbsentRows(columns, [
      {
        emp_code: "0001",
        emp_name: "A",
        department: "Spinning",
        values: { "2026-07-01": 8, "2026-07-02": 0, "2026-07-03": 2.5 },
        total: 10.5,
      },
    ]);
    expect(row.marks).toEqual({
      "2026-07-01": "P",
      "2026-07-02": "A",
      "2026-07-03": "P",
    });
    expect(row.days).toBe(3);
    expect(row.present).toBe(2);
    expect(row.absent).toBe(1);
  });

  it("treats missing dates as absent", () => {
    const [row] = buildAbsentRows(columns, [
      {
        emp_code: "0002",
        emp_name: "B",
        department: "Weaving",
        values: {},
        total: 0,
      },
    ]);
    expect(row.absent).toBe(3);
    expect(row.present).toBe(0);
  });
});
