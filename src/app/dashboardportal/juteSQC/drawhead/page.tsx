"use client";

// The Drawhead and Finisher Drawing backends are clones of each other (section enum +
// time-band vs DLV deltas only), so both routes render the same parameterized component.
import SliverWtSqcPage from "../finDraw/_components/SliverWtSqcPage";

/** Drawhead SQC (R-08-08/09/10) — DRAWHEAD_SWT / DRAWHEAD_SWP / FINISHER_CARD readings. */
export default function DrawheadSqcPage() {
  return <SliverWtSqcPage variant="drawhead" />;
}
