import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import { exportReportExcel } from "./excelReportExport";

// jsdom's Blob has no arrayBuffer(), so capture the raw buffer instead.
const saved: ArrayBuffer[] = [];
vi.mock("file-saver", () => ({
	saveAs: (blob: { parts: ArrayBuffer[] }) => {
		saved.push(blob.parts[0]);
	},
}));
vi.stubGlobal(
	"Blob",
	class {
		parts: ArrayBuffer[];
		constructor(parts: ArrayBuffer[]) {
			this.parts = parts;
		}
	},
);

type Row = { shift: string; qty: number };

const load = async (): Promise<ExcelJS.Worksheet> => {
	const buf = saved[saved.length - 1];
	const wb = new ExcelJS.Workbook();
	await wb.xlsx.load(buf);
	return wb.worksheets[0];
};

describe("exportReportExcel groupBy", () => {
	it("repeats title + header after 3 blank rows on each group change", async () => {
		await exportReportExcel<Row>({
			title: (r) => `T ${r.shift}`,
			sheetName: "S",
			fileName: "s.xlsx",
			cols: [
				{ header: "Shift", width: 8, value: (r) => r.shift, text: true },
				{ header: "Qty", width: 8, value: (r) => r.qty },
			],
			rows: [
				{ shift: "A", qty: 1 },
				{ shift: "A", qty: 2 },
				{ shift: "B", qty: 3 },
			],
			groupBy: (r) => r.shift,
		});
		const ws = await load();
		// Section 1: title 1, header 2-3, data 4-5.
		expect(ws.getCell(1, 1).value).toBe("T A");
		expect(ws.getCell(4, 2).value).toBe(1);
		expect(ws.getCell(5, 2).value).toBe(2);
		// 3 blank rows (6-8), section 2: title 9, header 10-11, data 12.
		expect(ws.getCell(6, 1).value).toBeNull();
		expect(ws.getCell(9, 1).value).toBe("T B");
		expect(ws.getCell(10, 1).value).toBe("Shift");
		expect(ws.getCell(12, 2).value).toBe(3);
	});

	it("writes one continuous block without groupBy", async () => {
		await exportReportExcel<Row>({
			title: "T",
			sheetName: "S",
			fileName: "s.xlsx",
			cols: [{ header: "Qty", width: 8, value: (r) => r.qty }],
			rows: [
				{ shift: "A", qty: 1 },
				{ shift: "B", qty: 2 },
			],
		});
		const ws = await load();
		expect(ws.getCell(4, 1).value).toBe(1);
		expect(ws.getCell(5, 1).value).toBe(2);
		expect(ws.rowCount).toBe(5);
	});
});
