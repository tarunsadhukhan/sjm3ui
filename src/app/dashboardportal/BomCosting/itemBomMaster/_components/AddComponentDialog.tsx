"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Box,
} from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import { ItemOption, UomOption, getCoId } from "./types";

type EditNode = {
  bom_id: number;
  qty: number;
  uom_id: number;
  uom_name: string;
  child_item_id: number;
  child_item_code: string;
  child_full_item_code?: string;
  child_item_name: string;
  sequence_no: number;
};

type AddComponentDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  parentItemId: number | null;
  editNode: EditNode | null;
  onSnackbar: (message: string, severity: "success" | "error") => void;
};

export default function AddComponentDialog({
  open,
  onClose,
  onSubmit,
  parentItemId,
  editNode,
  onSnackbar,
}: AddComponentDialogProps) {
  const [itemOptions, setItemOptions] = useState<ItemOption[]>([]);
  const [uomOptions, setUomOptions] = useState<UomOption[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null);
  const [qty, setQty] = useState<string>("1");
  const [selectedUom, setSelectedUom] = useState<UomOption | null>(null);
  const [sequenceNo, setSequenceNo] = useState<string>("0");
  const [itemSearchValue, setItemSearchValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = !!editNode;

  // Fetch items and UOMs for dropdowns (debounced)
  useEffect(() => {
    if (!open) return;
    const fetchSetup = async () => {
      const co_id = getCoId();
      const params = new URLSearchParams({ co_id });
      if (itemSearchValue) params.append("search", itemSearchValue);
      const { data } = await fetchWithCookie(
        `${apiRoutesPortalMasters.BOM_CREATE_SETUP}?${params}`,
        "GET"
      );
      if (data) {
        if (data.items) setItemOptions(data.items);
        if (data.uoms) setUomOptions(data.uoms);
      }
    };
    const timeout = setTimeout(fetchSetup, 300);
    return () => clearTimeout(timeout);
  }, [open, itemSearchValue]);

  // Pre-fill form in edit mode, reset form in add mode
  useEffect(() => {
    if (open && editNode) {
      setQty(String(editNode.qty));
      setSequenceNo(String(editNode.sequence_no ?? 0));
      setSelectedItem({
        item_id: editNode.child_item_id,
        item_code: editNode.child_item_code,
        item_name: editNode.child_item_name,
      });
      setSelectedUom({ uom_id: editNode.uom_id, uom_name: editNode.uom_name });
      setItemSearchValue("");
    } else if (open && !editNode) {
      setQty("1");
      setSequenceNo("0");
      setSelectedItem(null);
      setSelectedUom(null);
      setItemSearchValue("");
    }
  }, [open, editNode]);

  const handleSubmit = async () => {
    if (!isEditMode && !selectedItem) {
      onSnackbar("Please select an item", "error");
      return;
    }
    if (!qty || parseFloat(qty) <= 0) {
      onSnackbar("Quantity must be greater than 0", "error");
      return;
    }
    if (!selectedUom) {
      onSnackbar("Please select a UOM", "error");
      return;
    }

    setSubmitting(true);
    try {
      const co_id = getCoId();

      if (isEditMode && editNode) {
        const { error } = await fetchWithCookie(
          apiRoutesPortalMasters.BOM_EDIT_COMPONENT,
          "POST",
          {
            bom_id: editNode.bom_id,
            co_id: parseInt(co_id),
            qty: parseFloat(qty),
            uom_id: selectedUom.uom_id,
            sequence_no: parseInt(sequenceNo),
          }
        );
        if (error) throw new Error(error);
        onSnackbar("Component updated", "success");
      } else {
        const { data, error } = await fetchWithCookie(
          apiRoutesPortalMasters.BOM_ADD_COMPONENT,
          "POST",
          {
            parent_item_id: parentItemId,
            child_item_id: selectedItem!.item_id,
            qty: parseFloat(qty),
            uom_id: selectedUom.uom_id,
            co_id: parseInt(co_id),
            sequence_no: parseInt(sequenceNo),
          }
        );
        if (error) throw new Error(error);
        onSnackbar(data?.message || "Component added", "success");
      }
      onSubmit();
    } catch (err: any) {
      onSnackbar(err.message || "Operation failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEditMode ? "Edit Component" : "Add Component"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {!isEditMode ? (
            <Autocomplete
              options={itemOptions}
              getOptionLabel={(opt: ItemOption) => `${opt.full_item_code || opt.item_code} — ${opt.item_name}`}
              value={selectedItem}
              inputValue={itemSearchValue}
              onChange={(_, newValue) => {
                setSelectedItem(newValue);
                if (newValue?.uom_id && newValue?.uom_name) {
                  setSelectedUom({ uom_id: newValue.uom_id, uom_name: newValue.uom_name });
                }
              }}
              onInputChange={(_, value, reason) => {
                if (reason !== "reset") setItemSearchValue(value);
              }}
              renderInput={(params) => (
                <TextField {...params} label="Item *" placeholder="Search item..." size="small" autoFocus />
              )}
              isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
            />
          ) : (
            <TextField
              label="Item"
              value={editNode ? `${editNode.child_full_item_code || editNode.child_item_code} — ${editNode.child_item_name}` : ""}
              size="small"
              disabled
            />
          )}

          <TextField
            label="Quantity *"
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            size="small"
            inputProps={{ min: 0, step: "any" }}
          />

          <Autocomplete
            options={uomOptions}
            getOptionLabel={(opt: UomOption) => opt.uom_name || ""}
            value={selectedUom}
            onChange={(_, newValue) => setSelectedUom(newValue)}
            renderInput={(params) => (
              <TextField {...params} label="UOM *" placeholder="Search UOM..." size="small" />
            )}
            isOptionEqualToValue={(opt, val) => opt.uom_id === val.uom_id}
          />

          <TextField
            label="Sequence No"
            type="number"
            value={sequenceNo}
            onChange={(e) => setSequenceNo(e.target.value)}
            size="small"
            inputProps={{ min: 0 }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
          {submitting ? "Saving..." : isEditMode ? "Update" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}