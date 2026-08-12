/**
 * Shared Excel export for report pages (exceljs + file-saver, loaded lazily).
 *
 * Produces the standard report layout: merged title row, a two-row header
 * (contiguous `group` columns get a merged group header with sub-headers,
 * ungrouped columns span both rows), bordered data rows, frozen header, and
 * per-row total styling matching the on-screen grids.
 */
import type ExcelJS from "exceljs";

/** One worksheet column: header, width, and a value getter per row. */
export interface ExcelReportCol<R> {
	header: string;
	width: number;
	/** Row → cell value; numbers right-aligned unless `text` is set. */
	value: (row: R) => unknown;
	/** Left-aligned string column. */
	text?: boolean;
	/** Excel number format, e.g. "0.00". */
	fmt?: string;
	/** Group header label; contiguous columns with the same group are merged. */
	group?: string;
}

/** Row tint: "total" = light blue (per-date totals), "grand" = dark navy. */
export type ExcelRowKind = "normal" | "total" | "grand";

export interface ExcelReportOptions<R> {
	/**
	 * Content of the merged title row. With `groupBy`, pass a function to title
	 * each section from its first row (e.g. include the shift name).
	 */
	title: string | ((firstRowOfSection: R) => string);
	sheetName: string;
	/** Download file name (should end in .xlsx). */
	fileName: string;
	cols: Array<ExcelReportCol<R>>;
	rows: R[];
	/** Optional per-row styling resolver; defaults to "normal". */
	rowKind?: (row: R) => ExcelRowKind;
	/**
	 * Section key (e.g. shift/spell). When it changes between consecutive rows,
	 * 3 blank rows are left and the title + header block is repeated.
	 */
	groupBy?: (row: R) => string;
}

const thinBorder = {
	top: { style: "thin" as const },
	left: { style: "thin" as const },
	bottom: { style: "thin" as const },
	right: { style: "thin" as const },
};

export async function exportReportExcel<R>(
	opts: ExcelReportOptions<R>,
): Promise<void> {
	const { title, sheetName, fileName, cols, rows, rowKind, groupBy } = opts;
	if (rows.length === 0) return;
	const ExcelJSLib = (await import("exceljs")).default;
	const { saveAs } = await import("file-saver");

	const wb = new ExcelJSLib.Workbook();
	const ws = wb.addWorksheet(sheetName);
	const total = cols.length;

	const styleHeader = (cell: ExcelJS.Cell) => {
		cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
		cell.fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FF3EA6DA" },
		};
		cell.alignment = { horizontal: "center", vertical: "middle" };
		cell.border = thinBorder;
	};

	/** Writes title (`top`) + header rows (`top+1` group, `top+2` sub). */
	const writeHeaderBlock = (top: number, first: R) => {
		ws.mergeCells(top, 1, top, total);
		const titleCell = ws.getCell(top, 1);
		titleCell.value = typeof title === "function" ? title(first) : title;
		titleCell.font = { bold: true, size: 13, color: { argb: "FF0C3C60" } };
		titleCell.alignment = { horizontal: "center", vertical: "middle" };
		ws.getRow(top).height = 22;

		// Non-group columns span both header rows.
		cols.forEach((c, i) => {
			if (c.group) return;
			const col = i + 1;
			ws.mergeCells(top + 1, col, top + 2, col);
			const cell = ws.getCell(top + 1, col);
			cell.value = c.header;
			styleHeader(cell);
		});
		let gi = 0;
		while (gi < cols.length) {
			const g = cols[gi].group;
			if (g) {
				let gj = gi;
				while (gj < cols.length && cols[gj].group === g) gj++;
				ws.mergeCells(top + 1, gi + 1, top + 1, gj);
				const gcell = ws.getCell(top + 1, gi + 1);
				gcell.value = g;
				styleHeader(gcell);
				for (let k = gi; k < gj; k++) {
					const sc = ws.getCell(top + 2, k + 1);
					sc.value = cols[k].header;
					styleHeader(sc);
				}
				gi = gj;
			} else {
				gi++;
			}
		}
		ws.getRow(top + 1).height = 20;
		ws.getRow(top + 2).height = 18;
	};

	writeHeaderBlock(1, rows[0]);

	// Data rows
	let prevGroup: string | null = null;
	for (const r of rows) {
		if (groupBy) {
			const g = groupBy(r);
			// New section: 3 blank rows, then repeat title + header.
			if (prevGroup !== null && g !== prevGroup)
				writeHeaderBlock(ws.rowCount + 4, r);
			prevGroup = g;
		}
		const kind: ExcelRowKind = rowKind ? rowKind(r) : "normal";
		const rowVals = cols.map((c) => {
			const v = c.value(r);
			if (c.text) return v == null ? "" : String(v);
			return v == null ? null : Number(v);
		});
		const row = ws.addRow(rowVals);
		row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
			cell.border = thinBorder;
			const c = cols[colNumber - 1];
			if (c && !c.text) {
				cell.alignment = { horizontal: "right" };
				if (c.fmt) cell.numFmt = c.fmt;
			}
			if (kind === "total") {
				cell.font = { bold: true };
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FFBBDEFB" },
				};
			} else if (kind === "grand") {
				cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
				cell.fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FF0C3C60" },
				};
			}
		});
	}

	cols.forEach((c, idx) => {
		ws.getColumn(idx + 1).width = c.width;
	});
	ws.views = [{ state: "frozen", xSplit: 0, ySplit: 3 }];

	const buf = await wb.xlsx.writeBuffer();
	const blob = new Blob([buf], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	saveAs(blob, fileName);
}
