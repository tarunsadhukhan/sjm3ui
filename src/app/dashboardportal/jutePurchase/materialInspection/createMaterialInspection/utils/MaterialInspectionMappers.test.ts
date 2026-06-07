/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { mapLineItemsFromAPI } from "./MaterialInspectionMappers";
import type { GateEntryLineItemAPI } from "../types/MaterialInspectionTypes";

/**
 * Build a line-item API row mirroring what get_jute_gate_entry_line_items_query
 * actually returns. The actual quality id is exposed under `actual_quality_id`
 * (aliased in SQL), while the challan quality id is `challan_item_id`.
 */
const apiRow = (overrides: Partial<GateEntryLineItemAPI> = {}): GateEntryLineItemAPI =>
	({
		jute_mr_li_id: 1,
		jute_mr_id: 100,
		jute_po_li_id: null,
		challan_item_grp_id: 7,
		challan_group_name: "DTD",
		challan_item_id: 55,
		challan_quality_name: "DTD 5",
		challan_quantity: 70,
		challan_weight: 46.32,
		actual_item_grp_id: 7,
		actual_group_name: "DTD",
		actual_quality_id: 55,
		actual_quality_name: "DTD 5",
		actual_qty: 70,
		actual_weight: 46.32,
		allowable_moisture: null,
		unit_conversion: "LOOSE",
		remarks: null,
		...overrides,
	}) as GateEntryLineItemAPI;

describe("mapLineItemsFromAPI", () => {
	it("maps the actual quality from the API's actual_quality_id field", () => {
		const [line] = mapLineItemsFromAPI([apiRow({ actual_quality_id: 42 })]);
		expect(line.actualQuality).toBe("42");
	});

	it("maps the actual item group from actual_item_grp_id", () => {
		const [line] = mapLineItemsFromAPI([apiRow({ actual_item_grp_id: 9 })]);
		expect(line.actualItem).toBe("9");
	});

	it("still maps the challan quality from challan_item_id", () => {
		const [line] = mapLineItemsFromAPI([apiRow({ challan_item_id: 88 })]);
		expect(line.challanQuality).toBe("88");
	});
});
