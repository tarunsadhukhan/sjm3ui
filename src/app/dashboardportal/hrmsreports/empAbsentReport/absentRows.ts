/**
 * Pure transform for the Employee Absent Report.
 *
 * Input is the daily-mode response of /hrmsReports/emp_attendance_report
 * (one column per date, cell = worked hours). A date with 0 hours is an
 * absent day; anything > 0 counts as present.
 */

export interface ReportColumn {
  key: string; // ISO date, e.g. "2026-07-20"
  label: string; // "20/07"
}

export interface ReportRow {
  emp_code: string;
  emp_name: string;
  status?: string;
  department: string;
  values: Record<string, number>;
  total: number;
}

export interface AbsentRow {
  id: string;
  emp_code: string;
  emp_name: string;
  status: string;
  department: string;
  days: number;
  present: number;
  absent: number;
  marks: Record<string, "A" | "P">;
}

// ponytail: no holiday/weekly-off calendar in the DB, so off days count as
// absent for everyone; wire a holiday table here if that ever lands.
export function buildAbsentRows(
  columns: ReportColumn[],
  rows: ReportRow[],
): AbsentRow[] {
  return rows.map((r, idx) => {
    const marks: Record<string, "A" | "P"> = {};
    let present = 0;
    for (const c of columns) {
      if ((r.values?.[c.key] ?? 0) > 0) {
        marks[c.key] = "P";
        present += 1;
      } else {
        marks[c.key] = "A";
      }
    }
    return {
      id: `${r.emp_code}-${idx}`,
      emp_code: r.emp_code,
      emp_name: r.emp_name,
      status: r.status ?? "",
      department: r.department,
      days: columns.length,
      present,
      absent: columns.length - present,
      marks,
    };
  });
}
