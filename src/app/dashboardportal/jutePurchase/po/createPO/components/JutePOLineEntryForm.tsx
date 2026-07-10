"use client";

/**
 * @component JutePOLineEntryForm
 * @description Header-style entry panel for Jute PO line items.
 * Fields are entered here (instead of inline in the grid) and added to the
 * table below via Add. Editing a table row loads its values back into this
 * panel (Update / Cancel). Uses the same MUI field styling as the header form.
 */

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Autocomplete, TextField, Typography } from "@mui/material";
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

// Same look as the header form's MuiForm select fields
const selectFieldSx = { "& .MuiInputBase-root": { backgroundColor: "background.paper" } };

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
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {editingLine ? "Edit Line Item" : "Add Line Item"}
      </Typography>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Autocomplete<Option, false, false, false>
          options={itemOptions}
          value={itemValue}
          onChange={(_, next) => handleItemChange(next)}
          getOptionLabel={(opt) => opt.label}
          getOptionKey={(opt) => opt.value}
          isOptionEqualToValue={(a, b) => a.value === b.value}
          disabled={disabled}
          noOptionsText="No options"
          renderInput={(params) => (
            <TextField {...params} label="Item *" fullWidth size="small" sx={selectFieldSx} />
          )}
        />
        <Autocomplete<Option, false, false, false>
          options={qualityOptions}
          value={qualityValue}
          onChange={(_, next) =>
            setDraft((prev) => ({ ...prev, quality: next?.value ?? "", qualityName: next?.label ?? "" }))
          }
          getOptionLabel={(opt) => opt.label}
          getOptionKey={(opt) => opt.value}
          isOptionEqualToValue={(a, b) => a.value === b.value}
          disabled={disabled || !draft.itemId}
          noOptionsText="No options"
          renderInput={(params) => (
            <TextField {...params} label="Quality" fullWidth size="small" sx={selectFieldSx} />
          )}
        />
        <Autocomplete<Option, false, false, false>
          options={CROP_YEAR_OPTIONS}
          value={cropYearValue}
          onChange={(_, next) => setDraft((prev) => ({ ...prev, cropYear: next?.value ?? "" }))}
          getOptionLabel={(opt) => opt.label}
          getOptionKey={(opt) => opt.value}
          isOptionEqualToValue={(a, b) => a.value === b.value}
          disabled={disabled}
          noOptionsText="No options"
          renderInput={(params) => (
            <TextField {...params} label="Crop Year" fullWidth size="small" sx={selectFieldSx} />
          )}
        />
        <TextField
          label="Marka"
          value={draft.marka}
          onChange={(e) => setDraft((prev) => ({ ...prev, marka: e.target.value }))}
          disabled={disabled}
          fullWidth
          size="small"
        />
        <TextField
          label="Weight (Qtl)"
          type="number"
          required
          value={draft.weight}
          onChange={(e) => setDraft((prev) => ({ ...prev, weight: e.target.value }))}
          disabled={disabled}
          fullWidth
          size="small"
        />
        <TextField
          label="Rate (per Qtl)"
          type="number"
          required
          value={draft.rate}
          onChange={(e) => setDraft((prev) => ({ ...prev, rate: e.target.value }))}
          disabled={disabled}
          fullWidth
          size="small"
        />
        <TextField
          label="Moisture %"
          type="number"
          value={draft.allowableMoisture}
          onChange={(e) => setDraft((prev) => ({ ...prev, allowableMoisture: e.target.value }))}
          disabled={disabled}
          fullWidth
          size="small"
        />
        <TextField
          label="Amount"
          value={formatAmount(amount)}
          fullWidth
          size="small"
          InputProps={{ readOnly: true }}
        />
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
