import { describe, expect, it } from "vitest";
import {
	buildEntryRows,
	buildPivotRows,
	buildSummaryRows,
	dayLabel,
} from "./assortingRows";
import type { AssortingEntryRow } from "./types/assortingReportTypes";

// report_date arrives as DD-MM-YYYY — see DATE_FORMAT in assortingReportQueries.py.
const entry = (over: Partial<AssortingEntryRow>): AssortingEntryRow => ({
	report_date: "01-08-2026",
	shed_type: "A",
	mc_id: 1,
	mc_name: "MC-1",
	selector_id: 1,
	selector_name: "Ram",
	quality_id: 1,
	quality_name: "Q1",
	trolly_no: "T1",
	gross_wt: 100,
	tare_wt: 10,
	net_wt: 90,
	...over,
});

const entries: AssortingEntryRow[] = [
	entry({}),
	entry({ selector_name: "Shyam", quality_name: "Q2", gross_wt: 60, net_wt: 50 }),
	entry({ report_date: "02-08-2026", net_wt: 90 }),
];

describe("dayLabel", () => {
	it("shows day and month only", () => {
		expect(dayLabel("28-07-2026")).toBe("28/07");
		expect(dayLabel("12-08-2026")).toBe("12/08");
	});
});

describe("buildEntryRows", () => {
	it("appends a total per date and a grand total", () => {
		const rows = buildEntryRows(entries);
		// 3 entries + 2 date totals + 1 grand total
		expect(rows).toHaveLength(6);
		const dateTotal = rows.find(
			(r) => r.isDateTotal && r.report_date === "01-08-2026",
		);
		expect(dateTotal?.net_wt).toBe(140);
		const grand = rows[rows.length - 1];
		expect(grand.isGrandTotal).toBe(true);
		expect(grand.net_wt).toBe(230);
	});

	it("returns empty for no entries", () => {
		expect(buildEntryRows([])).toEqual([]);
	});
});

describe("buildSummaryRows", () => {
	it("sums each quality across the range plus a grand total", () => {
		const rows = buildSummaryRows(entries, "quality_name");
		expect(rows).toHaveLength(3);
		const q1 = rows.find((r) => r.quality_name === "Q1");
		expect(q1?.net_wt).toBe(180);
		expect(q1?.gross_wt).toBe(200);
		const grand = rows[rows.length - 1];
		expect(grand.isGrandTotal).toBe(true);
		expect(grand.net_wt).toBe(230);
	});
});

describe("buildPivotRows", () => {
	it("orders day columns chronologically across a month boundary", () => {
		// Deliberately out of order, and spanning July into August: a plain
		// string sort on DD-MM-YYYY would put 01-08 before 28-07.
		const { dates } = buildPivotRows([
			entry({ report_date: "01-08-2026" }),
			entry({ report_date: "31-07-2026" }),
			entry({ report_date: "12-08-2026" }),
			entry({ report_date: "28-07-2026" }),
		]);
		expect(dates).toEqual([
			"28-07-2026",
			"31-07-2026",
			"01-08-2026",
			"12-08-2026",
		]);
		expect(dates.map(dayLabel)).toEqual(["28/07", "31/07", "01/08", "12/08"]);
	});

	it("lays out worker+quality rows with a column per date", () => {
		const { dates, rows } = buildPivotRows(entries);
		expect(dates).toEqual(["01-08-2026", "02-08-2026"]);

		// Ram/Q1, Ram total, Shyam/Q2, Shyam total, grand total
		expect(rows.map((r) => r.id)).toEqual([
			"Ram|Q1",
			"__worker_total__Ram",
			"Shyam|Q2",
			"__worker_total__Shyam",
			"__GRAND_TOTAL__",
		]);

		const ram = rows[0];
		expect(ram.days).toEqual({ "01-08-2026": 90, "02-08-2026": 90 });
		expect(ram.total).toBe(180);

		// Shyam only worked day 1 — day 2 stays absent so the cell prints blank.
		const shyam = rows[2];
		expect(shyam.days).toEqual({ "01-08-2026": 50 });
		expect(shyam.total).toBe(50);
	});

	it("totals each worker and the whole report", () => {
		const { rows } = buildPivotRows(entries);
		const ramTotal = rows.find((r) => r.isWorkerTotal && r.selector_name === "Ram");
		expect(ramTotal?.quality_name).toBe("Total");
		expect(ramTotal?.total).toBe(180);

		const grand = rows[rows.length - 1];
		expect(grand.isGrandTotal).toBe(true);
		expect(grand.days).toEqual({ "01-08-2026": 140, "02-08-2026": 90 });
		expect(grand.total).toBe(230);
	});

	it("sums repeat entries for the same worker, quality and day", () => {
		const { rows } = buildPivotRows([entry({}), entry({ net_wt: 10 })]);
		expect(rows[0].days).toEqual({ "01-08-2026": 100 });
		expect(rows[0].total).toBe(100);
	});

	it("returns empty for no entries", () => {
		expect(buildPivotRows([])).toEqual({ dates: [], rows: [] });
	});
});
