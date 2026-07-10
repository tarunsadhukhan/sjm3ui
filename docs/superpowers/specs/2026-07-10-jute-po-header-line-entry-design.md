# Jute PO Create Page — Header-Style Line Item Entry

**Date:** 2026-07-10
**Status:** Approved

## Goal

Replace the inline-editable line-items grid on the Jute PO create/edit page
(`src/app/dashboardportal/jutePurchase/po/createPO/`) with a header-style entry
panel: line-item fields are entered in a form section above, and added lines
appear in a read-only table below.

## UX

- **Entry panel** (below the header form, above the table): Item, Quality,
  Crop Year, Marka, Weight (Qtl), Rate (per Qtl), Moisture % inputs, plus a
  read-only Amount preview (weight × rate) and an **Add** button.
- Quality cascades from Item (existing per-item quality fetch).
- **Add** is disabled until Item, Weight > 0, Rate > 0 (existing
  `lineIsComplete` rule). On Add the row is appended and inputs clear.
- **Table rows** get Edit / Delete icon actions (editable modes only).
  - Edit loads the row into the entry panel; buttons flip to **Update** /
    **Cancel**. Update writes back to the row; Cancel clears the panel.
  - Delete removes the row directly (replaces checkbox multi-select removal).
- Panel is hidden in view mode and for non-editable statuses; inputs are
  disabled until mandatory header fields are filled (existing rules, existing
  amber alert).

## Implementation

| File | Change |
|------|--------|
| `components/JutePOLineEntryForm.tsx` | New: entry panel with local draft state, Add/Update/Cancel. |
| `hooks/useJutePOLineItems.ts` | `maintainTrailingBlank: false`; add `addLine` / `updateLine`; drop per-cell `handleLineFieldChange`. |
| `components/JutePOLineItemsTable.tsx` | Columns become display-only; add Actions column (Edit/Delete) when editable. |
| `page.tsx` | Render entry panel after header form; `editingLineId` state; drop checkbox multi-select and per-cell change wiring. |
| `components/index.ts` | Export new component. |

## Unchanged

Save payload mapping, totals, preview, approval bar, edit/view data loading
(`replaceLineItems` still fills the table from the API), header form, schemas.
