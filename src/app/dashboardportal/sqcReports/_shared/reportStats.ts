export type Num = number | null | undefined;

const clean = (vals: Num[]): number[] =>
  vals.filter((v): v is number => typeof v === "number" && Number.isFinite(v));

export function mean(vals: Num[]): number | null {
  const v = clean(vals);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
}

/** Population (÷n) standard deviation — what the QC registers use (frame 30: SD 0.822). */
export function stdev(vals: Num[]): number | null {
  const v = clean(vals);
  if (!v.length) return null;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / v.length);
}

export function cvPct(vals: Num[]): number | null {
  const m = mean(vals);
  const sd = stdev(vals);
  return m && sd != null ? (sd / m) * 100 : null;
}

/** Percent of rows matching `pred`, over rows that have a value. */
export function pctOf<T>(rows: T[], pred: (r: T) => boolean): number | null {
  return rows.length ? (rows.filter(pred).length / rows.length) * 100 : null;
}

export function fmt(v: Num, digits = 2): string {
  return typeof v === "number" && Number.isFinite(v) ? v.toFixed(digits) : "-";
}

/** "+0.22% HY" / "-5.62% LT" deviation label against a standard. */
export function hyLt(pct: Num): string {
  if (typeof pct !== "number" || !Number.isFinite(pct)) return "-";
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% ${pct >= 0 ? "HY" : "LT"}`;
}

/** Groups rows by key, preserving first-seen order. */
export function groupBy<T>(rows: T[], key: (r: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const g = map.get(k);
    if (g) g.push(r);
    else map.set(k, [r]);
  }
  return [...map.entries()];
}
