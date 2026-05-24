export type ManMachineDetailRow = {
  id: string;
  tran_date: string;
  department: string;
  hands_a: number;
  hands_b: number;
  hands_c: number;
  total_hands: number;
  target_a: number;
  target_b: number;
  target_c: number;
  total_target: number;
  excess_short: number;
  is_date_total?: boolean;
  raw?: Record<string, unknown>;
};

function toNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toDateKey(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.length >= 10 ? text.slice(0, 10) : text;
}

function safeText(...values: unknown[]): string {
  for (const value of values) {
    if (value !== null && value !== undefined) {
      const text = String(value).trim();
      if (text) return text;
    }
  }
  return "";
}

export function mapManMachineDetailRows(records: Record<string, unknown>[]): ManMachineDetailRow[] {
  return records.map((record, index) => {
    const tranDate = toDateKey(record.tran_date ?? record.date ?? record.work_date);
    const department = safeText(
      record.department,
      record.dept_desc,
      record.dept_name,
      record.department_name,
      record.sub_dept_desc,
      record.sub_dept_name,
      "Unknown"
    );

    const handsA = toNumber(record.hands_a);
    const handsB = toNumber(record.hands_b);
    const handsC = toNumber(record.hands_c);

    const targetA = toNumber(record.thands_a ?? record.target_a);
    const targetB = toNumber(record.thands_b ?? record.target_b);
    const targetC = toNumber(record.thands_c ?? record.target_c);

    const totalHands = toNumber(record.total_hands || handsA + handsB + handsC);
    const totalTarget = toNumber(record.total_target || targetA + targetB + targetC);

    const excessShort =
      record.excess_short !== null && record.excess_short !== undefined && record.excess_short !== ""
        ? toNumber(record.excess_short)
        : totalHands - totalTarget;

    const stableId = safeText(record.id, record.man_machine_id, record.daily_sum_mc_id, `${tranDate}-${department}-${index}`);

    return {
      id: stableId,
      tran_date: tranDate,
      department,
      hands_a: handsA,
      hands_b: handsB,
      hands_c: handsC,
      total_hands: totalHands,
      target_a: targetA,
      target_b: targetB,
      target_c: targetC,
      total_target: totalTarget,
      excess_short: excessShort,
      raw: record,
    };
  });
}

export function buildDepartmentSummaryRows(details: ManMachineDetailRow[]): ManMachineDetailRow[] {
  const summaryMap = new Map<string, ManMachineDetailRow>();

  for (const row of details) {
    const key = `${row.tran_date}__${row.department}`;
    const existing = summaryMap.get(key);
    if (!existing) {
      summaryMap.set(key, {
        ...row,
        id: `sum-${key}`,
      });
      continue;
    }

    existing.hands_a += row.hands_a;
    existing.hands_b += row.hands_b;
    existing.hands_c += row.hands_c;
    existing.total_hands += row.total_hands;
    existing.target_a += row.target_a;
    existing.target_b += row.target_b;
    existing.target_c += row.target_c;
    existing.total_target += row.total_target;
    existing.excess_short += row.excess_short;
  }

  const groupedByDate = new Map<string, ManMachineDetailRow[]>();
  for (const row of summaryMap.values()) {
    if (!groupedByDate.has(row.tran_date)) {
      groupedByDate.set(row.tran_date, []);
    }
    groupedByDate.get(row.tran_date)!.push(row);
  }

  const dateKeys = [...groupedByDate.keys()].sort((a, b) => a.localeCompare(b));
  const finalRows: ManMachineDetailRow[] = [];

  for (const dateKey of dateKeys) {
    const rows = groupedByDate.get(dateKey) ?? [];
    rows.sort((a, b) => a.department.localeCompare(b.department));
    finalRows.push(...rows);

    const dateTotal = rows.reduce(
      (acc, row) => {
        acc.hands_a += row.hands_a;
        acc.hands_b += row.hands_b;
        acc.hands_c += row.hands_c;
        acc.total_hands += row.total_hands;
        acc.target_a += row.target_a;
        acc.target_b += row.target_b;
        acc.target_c += row.target_c;
        acc.total_target += row.total_target;
        acc.excess_short += row.excess_short;
        return acc;
      },
      {
        hands_a: 0,
        hands_b: 0,
        hands_c: 0,
        total_hands: 0,
        target_a: 0,
        target_b: 0,
        target_c: 0,
        total_target: 0,
        excess_short: 0,
      }
    );

    finalRows.push({
      id: `total-${dateKey}`,
      tran_date: dateKey,
      department: "Date Total",
      hands_a: dateTotal.hands_a,
      hands_b: dateTotal.hands_b,
      hands_c: dateTotal.hands_c,
      total_hands: dateTotal.total_hands,
      target_a: dateTotal.target_a,
      target_b: dateTotal.target_b,
      target_c: dateTotal.target_c,
      total_target: dateTotal.total_target,
      excess_short: dateTotal.excess_short,
      is_date_total: true,
    });
  }

  return finalRows;
}

export function getExcessShortTone(row: ManMachineDetailRow): "positive" | "negative" | "neutral" {
  if (row.is_date_total) return "neutral";
  if (row.excess_short > 0) return "positive";
  if (row.excess_short < 0) return "negative";
  return "neutral";
}
