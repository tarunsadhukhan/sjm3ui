"use client";

import React from "react";
import { Box, IconButton, Typography, Tooltip } from "@mui/material";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Package, Box as BoxIcon } from "lucide-react";
import { BomTreeItem } from "./types";

type BomTreeNodeProps = {
  node: BomTreeItem;
  level: number;
  expanded: Record<number, boolean>;
  gridColumns: string;
  parentMultiplier?: number;
  onToggle: (itemId: number) => void;
  onAddChild: (parentItemId: number) => void;
  onEdit: (node: BomTreeItem) => void;
  onRemove: (node: BomTreeItem) => void;
};

export default function BomTreeNode({
  node,
  level,
  expanded,
  gridColumns,
  parentMultiplier = 1,
  onToggle,
  onAddChild,
  onEdit,
  onRemove,
}: BomTreeNodeProps) {
  const isExpanded = expanded[node.child_item_id] || false;
  const hasChildren = node.children && node.children.length > 0;
  const bomQty = node.qty * parentMultiplier;

  return (
    <div>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: gridColumns,
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          "&:hover": { bgcolor: "action.hover" },
          "&:hover .bom-actions": { opacity: 1 },
        }}
      >
        {/* Seq# */}
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 0.75, borderRight: "1px solid", borderColor: "divider" }}>
          <Typography variant="body2" sx={{ fontWeight: 500, color: "text.secondary" }}>
            {node.sequence_no}
          </Typography>
        </Box>

        {/* Item (tree column with indentation) */}
        <Box sx={{ display: "flex", alignItems: "center", overflow: "hidden", pl: level * 3 + 1, pr: 1, py: 0.75, borderRight: "1px solid", borderColor: "divider" }}>
          <Box
            sx={{ width: 24, minWidth: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: hasChildren ? "pointer" : "default", mr: 0.5 }}
            onClick={() => hasChildren && onToggle(node.child_item_id)}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            ) : (
              <Box sx={{ width: 16 }} />
            )}
          </Box>
          {hasChildren ? (
            <Package size={16} style={{ marginRight: 8, flexShrink: 0, color: "#1976d2" }} />
          ) : (
            <BoxIcon size={16} style={{ marginRight: 8, flexShrink: 0, color: "#666" }} />
          )}
          <Typography variant="body2" noWrap sx={{ fontWeight: hasChildren ? 600 : 400, mr: 1, flexShrink: 0 }}>
            {node.child_full_item_code || node.child_item_code}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {node.child_item_name}
          </Typography>
        </Box>

        {/* Qty */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", py: 0.75, px: 1, borderRight: "1px solid", borderColor: "divider" }}>
          <Typography variant="body2">{node.qty}</Typography>
        </Box>

        {/* BOM Qty (qty × all ancestor quantities) */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", py: 0.75, px: 1, borderRight: "1px solid", borderColor: "divider" }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {Math.round(bomQty * 1000) / 1000}
          </Typography>
        </Box>

        {/* UOM */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", alignItems: "center", py: 0.75, px: 1, borderRight: "1px solid", borderColor: "divider" }}>
          <Typography variant="body2" color="text.secondary">{node.uom_name}</Typography>
        </Box>

        {/* Action buttons (visible on hover) */}
        <Box className="bom-actions" sx={{ opacity: 0, transition: "opacity 0.2s", display: "flex", justifyContent: "center", gap: 0.25, py: 0.75 }}>
          {hasChildren || !node.is_leaf ? (
            <Tooltip title="Add child component">
              <IconButton size="small" onClick={() => onAddChild(node.child_item_id)}>
                <Plus size={14} />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title="Edit qty / UOM">
            <IconButton size="small" onClick={() => onEdit(node)}>
              <Pencil size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove component">
            <IconButton size="small" color="error" onClick={() => onRemove(node)}>
              <Trash2 size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Recursive children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <BomTreeNode
              key={child.bom_id}
              node={child}
              level={level + 1}
              expanded={expanded}
              gridColumns={gridColumns}
              parentMultiplier={bomQty}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}