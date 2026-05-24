"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Typography,
  Box,
  Autocomplete,
  TextField,
} from "@mui/material";
import { fetchWithCookie } from "@/utils/apiClient2";
import { apiRoutesPortalMasters } from "@/utils/api";
import BomTreeNode from "./BomTreeNode";
import AddComponentDialog from "./AddComponentDialog";
import ConfirmDialog from "./ConfirmDialog";
import { BomTreeItem, ItemOption, getCoId } from "./types";

type BomTreeEditorProps = {
  open: boolean;
  onClose: () => void;
  item: { item_id: number; item_code: string; full_item_code?: string; item_name: string } | null;
  onSnackbar: (message: string, severity: "success" | "error") => void;
};

const initialState = {
  tree: [] as BomTreeItem[],
  loading: false,
  expanded: {} as Record<number, boolean>,
  addDialogOpen: false,
  addParentItemId: null as number | null,
  editingNode: null as BomTreeItem | null,
  itemPickerMode: false,
  itemOptions: [] as ItemOption[],
  selectedRootItem: null as ItemOption | null,
  itemSearchValue: "",
  confirmRemoveNode: null as BomTreeItem | null,
};

const BOM_GRID_COLUMNS = "60px 1fr 80px 90px 80px 100px";

export default function BomTreeEditor({ open, onClose, item, onSnackbar }: BomTreeEditorProps) {
  const [tree, setTree] = useState(initialState.tree);
  const [loading, setLoading] = useState(initialState.loading);
  const [expanded, setExpanded] = useState(initialState.expanded);
  const [addDialogOpen, setAddDialogOpen] = useState(initialState.addDialogOpen);
  const [addParentItemId, setAddParentItemId] = useState(initialState.addParentItemId);
  const [editingNode, setEditingNode] = useState(initialState.editingNode);
  const [itemPickerMode, setItemPickerMode] = useState(initialState.itemPickerMode);
  const [itemOptions, setItemOptions] = useState(initialState.itemOptions);
  const [selectedRootItem, setSelectedRootItem] = useState(initialState.selectedRootItem);
  const [itemSearchValue, setItemSearchValue] = useState(initialState.itemSearchValue);
  const [confirmRemoveNode, setConfirmRemoveNode] = useState(initialState.confirmRemoveNode);

  const resetState = () => {
    setTree(initialState.tree);
    setLoading(initialState.loading);
    setExpanded(initialState.expanded);
    setAddDialogOpen(initialState.addDialogOpen);
    setAddParentItemId(initialState.addParentItemId);
    setEditingNode(initialState.editingNode);
    setItemPickerMode(initialState.itemPickerMode);
    setItemOptions(initialState.itemOptions);
    setSelectedRootItem(initialState.selectedRootItem);
    setItemSearchValue(initialState.itemSearchValue);
    setConfirmRemoveNode(initialState.confirmRemoveNode);
  };

  const fetchTree = useCallback(async (itemId: number) => {
    setLoading(true);
    try {
      const co_id = getCoId();
      const params = new URLSearchParams({ co_id, item_id: String(itemId) });
      const { data, error } = await fetchWithCookie(
        `${apiRoutesPortalMasters.BOM_TREE}?${params}`,
        "GET"
      );
      if (error || !data) throw new Error(error || "Failed to fetch BOM tree");
      setTree(data.data || []);
      // Auto-expand first level
      const initialExpanded: Record<number, boolean> = {};
      (data.data || []).forEach((node: BomTreeItem) => {
        if (!node.is_leaf) initialExpanded[node.child_item_id] = true;
      });
      setExpanded(initialExpanded);
    } catch (err: any) {
      onSnackbar(err.message || "Failed to load BOM tree", "error");
    } finally {
      setLoading(false);
    }
  }, [onSnackbar]);

  // Reset and initialize when dialog opens/closes
  useEffect(() => {
    if (open && item) {
      resetState();
      setItemPickerMode(false);
      setSelectedRootItem(item as ItemOption);
      fetchTree(item.item_id);
    } else if (open && !item) {
      resetState();
      setItemPickerMode(true);
    } else if (!open) {
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item]);

  // Search items for the item picker (debounced)
  useEffect(() => {
    if (!itemPickerMode || !open) return;
    const searchItems = async () => {
      const co_id = getCoId();
      const params = new URLSearchParams({ co_id });
      if (itemSearchValue) params.append("search", itemSearchValue);
      const { data } = await fetchWithCookie(
        `${apiRoutesPortalMasters.BOM_CREATE_SETUP}?${params}`,
        "GET"
      );
      if (data?.items) setItemOptions(data.items);
    };
    const timeout = setTimeout(searchItems, 300);
    return () => clearTimeout(timeout);
  }, [itemPickerMode, itemSearchValue, open]);

  const handleToggle = (itemId: number) => {
    setExpanded(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleAddChild = (parentItemId: number) => {
    setAddParentItemId(parentItemId);
    setEditingNode(null);
    setAddDialogOpen(true);
  };

  const handleEdit = (node: BomTreeItem) => {
    setEditingNode(node);
    setAddParentItemId(null);
    setAddDialogOpen(true);
  };

  const handleRemoveConfirm = async () => {
    const node = confirmRemoveNode;
    if (!node) return;
    try {
      const co_id = getCoId();
      const { error } = await fetchWithCookie(
        apiRoutesPortalMasters.BOM_REMOVE_COMPONENT,
        "POST",
        { bom_id: node.bom_id, co_id: parseInt(co_id) }
      );
      if (error) throw new Error(error);
      onSnackbar("Component removed", "success");
      if (selectedRootItem) fetchTree(selectedRootItem.item_id);
    } catch (err: any) {
      onSnackbar(err.message || "Failed to remove component", "error");
    } finally {
      setConfirmRemoveNode(null);
    }
  };

  const handleDialogSubmit = async () => {
    setAddDialogOpen(false);
    if (selectedRootItem) fetchTree(selectedRootItem.item_id);
  };

  const handleSelectRootItem = (newValue: ItemOption | null) => {
    if (newValue) {
      setSelectedRootItem(newValue);
      setItemPickerMode(false);
      setItemSearchValue("");
      setItemOptions([]);
      fetchTree(newValue.item_id);
    }
  };

  const rootItemId = selectedRootItem?.item_id ?? item?.item_id;
  const rootLabel = selectedRootItem
    ? `${selectedRootItem.full_item_code || selectedRootItem.item_code} — ${selectedRootItem.item_name}`
    : item
    ? `${item.full_item_code || item.item_code} — ${item.item_name}`
    : "";

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { minHeight: "60vh" } }}>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Item BOM {rootLabel ? `— ${rootLabel}` : ""}</span>
        </DialogTitle>
        <DialogContent dividers>
          {itemPickerMode ? (
            <Box sx={{ py: 2 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Select an item to define or view its BOM:
              </Typography>
              <Autocomplete
                options={itemOptions}
                getOptionLabel={(opt: ItemOption) => `${opt.full_item_code || opt.item_code} — ${opt.item_name}`}
                value={null}
                inputValue={itemSearchValue}
                onChange={(_, newValue) => handleSelectRootItem(newValue)}
                onInputChange={(_, value, reason) => {
                  if (reason !== "reset") setItemSearchValue(value);
                }}
                renderInput={(params) => (
                  <TextField {...params} label="Search Item" placeholder="Type to search..." size="small" autoFocus />
                )}
                isOptionEqualToValue={(opt, val) => opt.item_id === val.item_id}
              />
            </Box>
          ) : loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box sx={{ py: 1 }}>
              {tree.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                  No components defined yet. Click &quot;Add Component&quot; to get started.
                </Typography>
              ) : (
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
                  {/* Header row */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: BOM_GRID_COLUMNS,
                      bgcolor: "grey.50",
                      borderBottom: "2px solid",
                      borderColor: "divider",
                      position: "sticky",
                      top: 0,
                      zIndex: 1,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", py: 1, textAlign: "center", borderRight: "1px solid", borderColor: "divider" }}>
                      Seq
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", py: 1, px: 1, borderRight: "1px solid", borderColor: "divider" }}>
                      Item
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", py: 1, px: 1, textAlign: "right", borderRight: "1px solid", borderColor: "divider" }}>
                      Qty
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", py: 1, px: 1, textAlign: "right", borderRight: "1px solid", borderColor: "divider" }}>
                      BOM Qty
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", py: 1, px: 1, textAlign: "right", borderRight: "1px solid", borderColor: "divider" }}>
                      UOM
                    </Typography>
                    <Box />
                  </Box>
                  {/* Tree rows */}
                  {tree.map((node) => (
                    <BomTreeNode
                      key={node.bom_id}
                      node={node}
                      level={0}
                      expanded={expanded}
                      gridColumns={BOM_GRID_COLUMNS}
                      onToggle={handleToggle}
                      onAddChild={handleAddChild}
                      onEdit={handleEdit}
                      onRemove={(node) => setConfirmRemoveNode(node)}
                    />
                  ))}
                </Box>
              )}
              {rootItemId && (
                <Button
                  variant="outlined"
                  size="small"
                  sx={{ mt: 2 }}
                  onClick={() => handleAddChild(rootItemId)}
                >
                  + Add Component
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <AddComponentDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onSubmit={handleDialogSubmit}
        parentItemId={addParentItemId}
        editNode={editingNode}
        onSnackbar={onSnackbar}
      />

      <ConfirmDialog
        open={!!confirmRemoveNode}
        title="Remove Component"
        message={
          confirmRemoveNode
            ? `Remove "${confirmRemoveNode.child_item_code} — ${confirmRemoveNode.child_item_name}" from the BOM?`
            : ""
        }
        onConfirm={handleRemoveConfirm}
        onCancel={() => setConfirmRemoveNode(null)}
      />
    </>
  );
}