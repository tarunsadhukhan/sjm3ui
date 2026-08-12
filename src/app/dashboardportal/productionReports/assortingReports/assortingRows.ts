import type { AssortingEntryRow } from "./types/assortingReportTypes";

export type TextField =
	| "report_date"
	| "shed_type"
	| "mc_name"
	| "selector_name"
	| "quality_name"
	| "trolly_no";

/**
 * Row for any assorting report view. Every measure is optional because the
 * views carry different ones: the entry/summary views use gross/tare/net,
 * the day-wise pivot uses `days` (date → net wt) plus `total`.
 */
export type ReportRow = Partial<Record<TextField, string | null>> & {
	id: string;
	gross_wt?: number;
	tare_wt?: number;
	net_wt?: number;
	days?: Record<string, number>;
	total?: number;
	isDateTotal?: boolean;
	isWorkerTotal?: boolean;
	isGrandTotal?: boolean;
};

type Sums = { gross_wt: number; tare_wt: number; net_wt: number };

const zeroSums = (): Sums => ({ gross_wt: 0, tare_wt: 0, net_wt: 0 });

const addEntry = (s: Sums, r: AssortingEntryRow) => {
	s.gross_wt += Number(r.gross_wt) || 0;
	s.tare_wt += Number(r.tare_wt) || 0;
	s.net_wt += Number(r.net_wt) || 0;
};

const addSums = (into: Sums, from: Sums) => {
	into.gross_wt += from.gross_wt;
	into.tare_wt += from.tare_wt;
	into.net_wt += from.net_wt;
};

/**
 * Raw entries view: entries come date-ordered from the backend; append a
 * total row per date and one grand-total row.
 */
export function buildEntryRows(entries: AssortingEntryRow[]): ReportRow[] {
	if (entries.length === 0) return [];

	const byDate = new Map<string, AssortingEntryRow[]>();
	entries.forEach((r) => {
		const bucket = byDate.get(r.report_date);
		if (bucket) bucket.push(r);
		else byDate.set(r.report_date, [r]);
	});

	const out: ReportRow[] = [];
	const grand = zeroSums();
	byDate.forEach((bucket, d) => {
		bucket.forEach((r, idx) => out.push({ ...r, id: `${d}_${idx}` }));
		const sums = zeroSums();
		bucket.forEach((r) => addEntry(sums, r));
		out.push({
			id: `__date_total__${d}`,
			report_date: d,
			selector_name: "Total",
			...sums,
			isDateTotal: true,
		});
		addSums(grand, sums);
	});
	out.push({
		id: "__GRAND_TOTAL__",
		report_date: "Grand Total",
		...grand,
		isGrandTotal: true,
	});
	return out;
}

/**
 * Summed view per worker (selector) or quality across the whole date range,
 * one row per group plus a grand total.
 */
export function buildSummaryRows(
	entries: AssortingEntryRow[],
	field: "selector_name" | "quality_name",
): ReportRow[] {
	if (entries.length === 0) return [];

	const groups = new Map<string, Sums>();
	const grand = zeroSums();
	entries.forEach((r) => {
		const key = r[field] ?? "—";
		let s = groups.get(key);
		if (!s) {
			s = zeroSums();
			groups.set(key, s);
		}
		addEntry(s, r);
		addEntry(grand, r);
	});

	const out: ReportRow[] = [];
	[...groups.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.forEach(([name, s]) => out.push({ id: name, [field]: name, ...s }));
	out.push({
		id: "__GRAND_TOTAL__",
		[field]: "Grand Total",
		...grand,
		isGrandTotal: true,
	});
	return out;
}

/**
 * The backend sends `report_date` as DD-MM-YYYY (see the DATE_FORMAT in
 * `assortingReportQueries.py`), which sorts by day-of-month as a plain string.
 * Reorder to YYYY-MM-DD so a lexical sort is chronological.
 */
const toSortKey = (reportDate: string): string => {
	const [d, m, y] = reportDate.split("-");
	return y && m && d ? `${y}-${m}-${d}` : reportDate;
};

/** DD-MM-YYYY → "28/07", short enough to fit a column per day. */
export const dayLabel = (reportDate: string): string => {
	const [d, m] = reportDate.split("-");
	return d && m ? `${d}/${m}` : reportDate;
};

const sumDays = (days: Record<string, number>): number =>
	Object.values(days).reduce((a, b) => a + b, 0);

const accumulate = (
	into: Record<string, number>,
	from: Record<string, number>,
) => {
	Object.entries(from).forEach(([d, v]) => {
		into[d] = (into[d] ?? 0) + v;
	});
};

/**
 * Day-wise pivot: one row per worker + quality, one column per date holding
 * that day's net weight, a row total, a subtotal row after each worker, and a
 * grand total at the end. Dates with no entry stay absent so the cell renders
 * blank rather than 0.
 *
 * ponytail: pivots net weight only — the measure everyone reads. Add a
 * measure toggle if gross/tare are ever asked for here.
 */
export function buildPivotRows(entries: AssortingEntryRow[]): {
	dates: string[];
	rows: ReportRow[];
} {
	if (entries.length === 0) return { dates: [], rows: [] };

	const dates = [...new Set(entries.map((e) => e.report_date))].sort((a, b) =>
		toSortKey(a).localeCompare(toSortKey(b)),
	);

	// worker → quality → date → net wt
	const byWorker = new Map<string, Map<string, Record<string, number>>>();
	entries.forEach((e) => {
		const worker = e.selector_name ?? "—";
		const quality = e.quality_name ?? "—";
		let qualities = byWorker.get(worker);
		if (!qualities) {
			qualities = new Map();
			byWorker.set(worker, qualities);
		}
		let days = qualities.get(quality);
		if (!days) {
			days = {};
			qualities.set(quality, days);
		}
		days[e.report_date] = (days[e.report_date] ?? 0) + (Number(e.net_wt) || 0);
	});

	const rows: ReportRow[] = [];
	const grand: Record<string, number> = {};

	[...byWorker.entries()]
		.sort((a, b) => a[0].localeCompare(b[0]))
		.forEach(([worker, qualities]) => {
			const workerDays: Record<string, number> = {};
			[...qualities.entries()]
				.sort((a, b) => a[0].localeCompare(b[0]))
				.forEach(([quality, days]) => {
					rows.push({
						id: `${worker}|${quality}`,
						selector_name: worker,
						quality_name: quality,
						days,
						total: sumDays(days),
					});
					accumulate(workerDays, days);
				});
			rows.push({
				id: `__worker_total__${worker}`,
				selector_name: worker,
				quality_name: "Total",
				days: workerDays,
				total: sumDays(workerDays),
				isWorkerTotal: true,
			});
			accumulate(grand, workerDays);
		});

	rows.push({
		id: "__GRAND_TOTAL__",
		selector_name: "Grand Total",
		quality_name: null,
		days: grand,
		total: sumDays(grand),
		isGrandTotal: true,
	});
	return { dates, rows };
}
