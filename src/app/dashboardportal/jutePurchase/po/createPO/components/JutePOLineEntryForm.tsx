"use client";

/**
 * @component JutePOLineEntryForm
 * @description Header-style entry panel for Jute PO line items.
 * Fields are entered here (instead of inline in the grid) and added to the
 * table below via Add. Editing a table row loads its values back into this
 * panel (Update / Cancel).
 */

import * as React from "react";
import { Plus, X } from "lucide-react";
import { SearchableSelect } from "@/components/ui/transaction";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { JutePOLineItem, Option } from "../types/jutePOTypes";
import { CROP_YEAR_OPTIONS } from "../utils/jutePOConstants";
import { calculateAmount, formatAmount } from "../utils/jutePOCalculations";

/** Fields captured by the entry panel (amount is derived, id assigned by hook). */
export type JutePOLineDraft = {
  itemId: string;
  itemName: string;
  quality: string;
  qualityName: string;
  cropYear: string;
  marka: string;
  weight: string;
  rate: string;
  allowableMoisture: string;
};

const BLANK_DRAFT: JutePOLineDraft = {
  itemId: "",
  itemName: "",
  quality: "",
  qualityName: "",
  cropYear: "",
  marka: "",
  weight: "",
  rate: "",
  allowableMoisture: "",
};

export type JutePOLineEntryFormProps = {
  /** Disable all inputs (e.g., mandatory header fields not filled yet). */
  disabled: boolean;
  itemOptions: Option[];
  getQualityOptions: (itemId: string) => Option[];
  /** Called when an item is selected, to fetch its qualities. */
  onItemSelect: (itemId: string) => void;
  /** Row currently being edited, or null when adding. */
  editingLine: JutePOLineItem | null;
  onAdd: (draft: JutePOLineDraft) => void;
  onUpdate: (id: string, draft: JutePOLineDraft) => void;
  onCancelEdit: () => void;
};

export function JutePOLineEntryForm({
  disabled,
  itemOptions,
  getQualityOptions,
  onItemSelect,
  editingLine,
  onAdd,
  onUpdate,
  onCancelEdit,
}: JutePOLineEntryFormProps) {
  const [draft, setDraft] = React.useState<JutePOLineDraft>(BLANK_DRAFT);

  // Load the row being edited into the entry fields; reset when editing ends
  React.useEffect(() => {
    if (editingLine) {
      setDraft({
        itemId: editingLine.itemId,
        itemName: editingLine.itemName ?? "",
        quality: editingLine.quality,
        qualityName: editingLine.qualityName ?? "",
        cropYear: editingLine.cropYear,
        marka: editingLine.marka,
        weight: editingLine.weight,
        rate: editingLine.rate,
        allowableMoisture: editingLine.allowableMoisture,
      });
      if (editingLine.itemId) onItemSelect(editingLine.itemId);
    } else {
      setDraft(BLANK_DRAFT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingLine?.id]);

  const qualityOptions = draft.itemId ? getQualityOptions(draft.itemId) : [];
  const itemValue = itemOptions.find((opt) => opt.value === draft.itemId) ?? null;
  const qualityValue = qualityOptions.find((opt) => opt.value === draft.quality) ?? null;
  const cropYearValue = CROP_YEAR_OPTIONS.find((opt) => opt.value === draft.cropYear) ?? null;

  const amount = calculateAmount(Number(draft.weight), Number(draft.rate));
  // Same completeness rule as lineIsComplete: item, weight > 0, rate > 0
  const canSubmit =
    !disabled && Boolean(draft.itemId) && Number(draft.weight) > 0 && Number(draft.rate) > 0;

  const handleItemChange = (next: Option | null) => {
    const itemId = next?.value ?? "";
    // Item change resets quality (cascade)
    setDraft((prev) => ({ ...prev, itemId, itemName: next?.label ?? "", quality: "", qualityName: "" }));
    if (itemId) onItemSelect(itemId);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (editingLine) {
      onUpdate(editingLine.id, draft);
    } else {
      onAdd(draft);
      setDraft(BLANK_DRAFT);
    }
  };

  return (
    <div className="mt-4 rounded-md border p-3 space-y-3">
      <div className="text-sm font-semibold">
        {editingLine ? "Edit Line Item" : "Add Line Item"}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Item *</label>
          <SearchableSelect<Option>
            options={itemOptions}
            value={itemValue}
            onChange={handleItemChange}
            getOptionLabel={(opt: Option) => opt.label}
            getOptionKey={(opt: Option) => opt.value}
            isOptionEqualToValue={(a: Option, b: Option) => a.value === b.value}
            placeholder="Select item"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Quality</label>
          <SearchableSelect<Option>
            options={qualityOptions}
            value={qualityValue}
            onChange={(next: Option | null) =>
              setDraft((prev) => ({ ...prev, quality: next?.value ?? "", qualityName: next?.label ?? "" }))
            }
            getOptionLabel={(opt: Option) => opt.label}
            getOptionKey={(opt: Option) => opt.value}
            isOptionEqualToValue={(a: Option, b: Option) => a.value === b.value}
            placeholder="Select quality"
            disabled={disabled || !draft.itemId}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Crop Year</label>
          <SearchableSelect<Option>
            options={CROP_YEAR_OPTIONS}
            value={cropYearValue}
            onChange={(next: Option | null) =>
              setDraft((prev) => ({ ...prev, cropYear: next?.value ?? "" }))
            }
            getOptionLabel={(opt: Option) => opt.label}
            getOptionKey={(opt: Option) => opt.value}
            isOptionEqualToValue={(a: Option, b: Option) => a.value === b.value}
            placeholder="Year"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Marka</label>
          <Input
            value={draft.marka}
            onChange={(e) => setDraft((prev) => ({ ...prev, marka: e.target.value }))}
            placeholder="Marka"
            disabled={disabled}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Weight (Qtl) *</label>
          <Input
            type="number"
            value={draft.weight}
            onChange={(e) => setDraft((prev) => ({ ...prev, weight: e.target.value }))}
            placeholder="0.00"
            disabled={disabled}
            className="h-9 text-xs text-right"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Rate (per Qtl) *</label>
          <Input
            type="number"
            value={draft.rate}
            onChange={(e) => setDraft((prev) => ({ ...prev, rate: e.target.value }))}
            placeholder="0.00"
            disabled={disabled}
            className="h-9 text-xs text-right"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Moisture %</label>
          <Input
            type="number"
            value={draft.allowableMoisture}
            onChange={(e) => setDraft((prev) => ({ ...prev, allowableMoisture: e.target.value }))}
            placeholder="0"
            disabled={disabled}
            className="h-9 text-xs text-right"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Amount</label>
          <div className="h-9 flex items-center justify-end rounded-md border bg-muted/50 px-3 text-xs font-medium">
            {formatAmount(amount)}
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {editingLine && (
          <Button type="button" variant="outline" size="sm" onClick={onCancelEdit}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
        <Button type="button" size="sm" onClick={handleSubmit} disabled={!canSubmit}>
          <Plus className="h-4 w-4 mr-1" />
          {editingLine ? "Update Line" : "Add Line"}
        </Button>
      </div>
    </div>
  );
}

export default JutePOLineEntryForm;
