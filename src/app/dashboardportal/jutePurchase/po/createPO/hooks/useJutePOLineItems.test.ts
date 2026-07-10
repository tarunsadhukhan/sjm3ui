/**
 * Tests for useJutePOLineItems add/update behavior (header-style line entry).
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useJutePOLineItems } from "./useJutePOLineItems";

const draft = {
  itemId: "1",
  itemName: "Raw Jute",
  quality: "2",
  qualityName: "TD5",
  cropYear: "2026",
  marka: "MK",
  weight: "10",
  rate: "5000",
  allowableMoisture: "12",
};

describe("useJutePOLineItems", () => {
  it("addLine appends a line with computed amount (weight * rate)", () => {
    const { result } = renderHook(() => useJutePOLineItems({ mode: "create" }));

    act(() => result.current.addLine(draft));

    expect(result.current.lineItems).toHaveLength(1);
    const line = result.current.lineItems[0];
    expect(line.itemId).toBe("1");
    expect(line.amount).toBe("50000.00");
    expect(line.id).toBeTruthy();
  });

  it("updateLine overwrites fields and recalculates amount", () => {
    const { result } = renderHook(() => useJutePOLineItems({ mode: "edit" }));

    act(() => result.current.addLine(draft));
    const id = result.current.lineItems[0].id;

    act(() => result.current.updateLine(id, { ...draft, weight: "20", rate: "100" }));

    expect(result.current.lineItems).toHaveLength(1);
    expect(result.current.lineItems[0].weight).toBe("20");
    expect(result.current.lineItems[0].amount).toBe("2000.00");
  });

  it("addLine is a no-op in view mode", () => {
    const { result } = renderHook(() => useJutePOLineItems({ mode: "view" }));

    act(() => result.current.addLine(draft));

    expect(result.current.lineItems).toHaveLength(0);
  });
});
