"use client";

// Yarn Test Report Excel export (R-08-16 count observations).
// Mirrors the mill's manual workbook (Yarn_Test_Report_*.xlsx): a "Test Report"
// sheet with one block per frame+yarn (readings, Average row, SD/CV% as live
// Excel formulas) and a "Summary" sheet cross-referencing each block's results.
// The sample groups frames by shed; sjm has no shed data, so blocks are listed
// flat by frame. Loaded via dynamic import so exceljs stays out of the main bundle.

import type { SqcCountReadingRow, YarnItemOption } from "../types/sqcSpinningTypes";

type FrameBlock = {
	frameLabel: string;
	dpTp: string;
	stdCount: number | null;
	readings: SqcCountReadingRow[];
};

// 'YYYY-MM-DD' -> 'DD-MM-YYYY' (title + filename convention of the manual report).
function ddmmyyyy(iso: string): string {
	const [y, m, d] = iso.split("-");
	return y && m && d ? `${d}-${m}-${y}` : iso;
}

function buildBlocks(readings: SqcCountReadingRow[], yarnItems: YarnItemOption[]): FrameBlock[] {
	const stdCountByItem = new Map<number, number | null>(
		yarnItems.map((y) => [y.item_id, y.std_count ?? null])
	);
	const blocks = new Map<string, FrameBlock>();
	for (const r of readings) {
		const mcId = r.mc_id ?? r.machine_id ?? null;
		const key = `${mcId ?? "none"}|${r.item_id}`;
		let block = blocks.get(key);
		if (!block) {
			block = {
				frameLabel: r.mech_code || r.machine_name || "—",
				dpTp: r.dp != null || r.tp != null ? `${r.dp ?? "—"}/${r.tp ?? "—"}` : "",
				stdCount: stdCountByItem.get(r.item_id) ?? null,
				readings: [],
			};
			blocks.set(key, block);
		}
		block.readings.push(r);
	}
	return [...blocks.values()].sort((a, b) =>
		a.frameLabel.localeCompare(b.frameLabel, undefined, { numeric: true })
	);
}

export async function exportYarnTestReport(
	entryDate: string,
	readings: SqcCountReadingRow[],
	yarnItems: YarnItemOption[]
): Promise<void> {
	const ExcelJS = (await import("exceljs")).default;
	const { saveAs } = await import("file-saver");

	const dateLabel = ddmmyyyy(entryDate);
	const blocks = buildBlocks(readings, yarnItems);

	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet("Test Report");
	ws.columns = [
		{ width: 12 }, // A Frame No
		{ width: 10 }, // B DP/TP
		{ width: 12 }, // C Count (lbs)
		{ width: 9 }, // D Reading
		{ width: 15 }, // E Actual Wt (lbs)
		{ width: 10 }, // F M.R. (%)
		{ width: 15 }, // G Regain Wt (lbs)
		{ width: 10 }, // H SD (lbs)
		{ width: 9 }, // I CV %
	];

	ws.mergeCells("A1:I1");
	ws.getCell("A1").value = `YARN TEST REPORT — Date: ${dateLabel}`;
	ws.getCell("A1").font = { bold: true, size: 14 };
	ws.mergeCells("A2:I2");
	ws.getCell("A2").value =
		"Regain Wt = Actual Wt × (100 + Std MR%) / (100 + M.R.%)   |   SD & CV% calculated on the Regain Wt readings per frame";
	ws.getCell("A2").font = { italic: true, size: 9 };

	const HEADERS = [
		"Frame No",
		"DP/TP",
		"Count (lbs)",
		"Reading",
		"Actual Wt (lbs)",
		"M.R. (%)",
		"Regain Wt (lbs)",
		"SD (lbs)",
		"CV %",
	];
	const headerRow = ws.getRow(4);
	HEADERS.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		cell.font = { bold: true };
		cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
	});

	// Summary rows collect the block anchor rows for cross-sheet formulas.
	const summaryRefs: Array<{
		block: FrameBlock;
		firstRow: number;
		avgRow: number;
	}> = [];

	let rowNo = 5;
	for (const block of blocks) {
		const firstRow = rowNo;
		const lastReadingRow = firstRow + block.readings.length - 1;
		const avgRow = lastReadingRow + 1;

		block.readings.forEach((r, i) => {
			const row = ws.getRow(firstRow + i);
			row.getCell(4).value = i + 1;
			row.getCell(5).value = r.observed_count ?? null;
			row.getCell(6).value = r.mr_pct ?? null;
			row.getCell(7).value = r.corrected_count ?? null;
		});

		const anchor = ws.getRow(firstRow);
		anchor.getCell(1).value = block.frameLabel;
		anchor.getCell(2).value = block.dpTp;
		anchor.getCell(3).value = block.stdCount;
		anchor.getCell(8).value = { formula: `STDEVP(G${firstRow}:G${lastReadingRow})` };
		anchor.getCell(9).value = { formula: `H${firstRow}/G${avgRow}*100` };

		const avg = ws.getRow(avgRow);
		avg.getCell(4).value = "Average";
		avg.getCell(5).value = { formula: `AVERAGE(E${firstRow}:E${lastReadingRow})` };
		avg.getCell(6).value = { formula: `AVERAGE(F${firstRow}:F${lastReadingRow})` };
		avg.getCell(7).value = { formula: `AVERAGE(G${firstRow}:G${lastReadingRow})` };
		avg.font = { bold: true };

		for (const col of ["A", "B", "C", "H", "I"]) {
			ws.mergeCells(`${col}${firstRow}:${col}${avgRow}`);
			ws.getCell(`${col}${firstRow}`).alignment = { horizontal: "center", vertical: "middle" };
		}

		summaryRefs.push({ block, firstRow, avgRow });
		rowNo = avgRow + 2; // one blank row between blocks, as in the manual sheet
	}

	// Light table borders + 2dp number format over the data region.
	for (let r = 4; r < rowNo - 1; r++) {
		const row = ws.getRow(r);
		for (let c = 1; c <= 9; c++) {
			const cell = row.getCell(c);
			cell.border = {
				top: { style: "thin" },
				left: { style: "thin" },
				bottom: { style: "thin" },
				right: { style: "thin" },
			};
			if (r > 4 && c >= 5) cell.numFmt = "0.00";
		}
	}

	const sum = wb.addWorksheet("Summary");
	sum.columns = [
		{ width: 12 }, // A Frame No
		{ width: 12 }, // B Count (lbs)
		{ width: 10 }, // C DP/TP
		{ width: 16 }, // D Avg Actual (lbs)
		{ width: 13 }, // E Avg M.R. (%)
		{ width: 16 }, // F Avg Regain (lbs)
		{ width: 10 }, // G SD (lbs)
		{ width: 9 }, // H CV %
	];
	sum.mergeCells("A1:H1");
	sum.getCell("A1").value = `SUMMARY — Yarn Test Report, ${dateLabel}`;
	sum.getCell("A1").font = { bold: true, size: 13 };

	const SUM_HEADERS = [
		"Frame No",
		"Count (lbs)",
		"DP/TP",
		"Avg Actual (lbs)",
		"Avg M.R. (%)",
		"Avg Regain (lbs)",
		"SD (lbs)",
		"CV %",
	];
	const sumHeader = sum.getRow(3);
	SUM_HEADERS.forEach((h, i) => {
		const cell = sumHeader.getCell(i + 1);
		cell.value = h;
		cell.font = { bold: true };
		cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
	});

	summaryRefs.forEach(({ block, firstRow, avgRow }, i) => {
		const row = sum.getRow(4 + i);
		row.getCell(1).value = block.frameLabel;
		row.getCell(2).value = block.stdCount;
		row.getCell(3).value = block.dpTp;
		row.getCell(4).value = { formula: `'Test Report'!E${avgRow}` };
		row.getCell(5).value = { formula: `'Test Report'!F${avgRow}` };
		row.getCell(6).value = { formula: `'Test Report'!G${avgRow}` };
		row.getCell(7).value = { formula: `'Test Report'!H${firstRow}` };
		row.getCell(8).value = { formula: `'Test Report'!I${firstRow}` };
	});

	for (let r = 3; r < 4 + summaryRefs.length; r++) {
		const row = sum.getRow(r);
		for (let c = 1; c <= 8; c++) {
			const cell = row.getCell(c);
			cell.border = {
				top: { style: "thin" },
				left: { style: "thin" },
				bottom: { style: "thin" },
				right: { style: "thin" },
			};
			if (r > 3 && c >= 4) cell.numFmt = "0.00";
		}
	}

	const buffer = await wb.xlsx.writeBuffer();
	saveAs(
		new Blob([buffer], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}),
		`Yarn_Test_Report_${dateLabel}.xlsx`
	);
}
