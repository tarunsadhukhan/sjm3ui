"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AppMenuItem = {
  menu_id: number;
  menu_name: string;
  menu_parent_id: number | null;
  is_group?: number | null;
  role_id?: number | null;
  access_type_id?: number | string | null;
};

export type MenuAccess = { menuId: number; accessTypeId: string };

// access_type table: 1=read, 2=print, 3=write, 4=edit. "0" = not mapped.
const ACCESS_OPTIONS = [
  { value: "0", label: "Not Accessible" },
  { value: "1", label: "Read" },
  { value: "2", label: "Print" },
  { value: "3", label: "Write" },
  { value: "4", label: "Edit" },
];

const GROUP_ACCESS = "1"; // container nodes are stored with a neutral access

type Props = {
  menuData: AppMenuItem[];
  onChange: (list: MenuAccess[]) => void;
};

export default function MenuAccessTree({ menuData, onChange }: Props) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // parentId (null -> 0) => children, preserving incoming order
  const childrenMap = useMemo(() => {
    const map = new Map<number, AppMenuItem[]>();
    for (const item of menuData) {
      const parent = item.menu_parent_id ?? 0;
      const bucket = map.get(parent) ?? [];
      bucket.push(item);
      map.set(parent, bucket);
    }
    return map;
  }, [menuData]);

  const isGroup = useCallback(
    (id: number) => (childrenMap.get(id)?.length ?? 0) > 0,
    [childrenMap]
  );

  // all descendant leaf ids for a node
  const descendantLeaves = useCallback(
    (id: number): number[] => {
      const children = childrenMap.get(id);
      if (!children || children.length === 0) return [id];
      return children.flatMap((c) => descendantLeaves(c.menu_id));
    },
    [childrenMap]
  );

  // ancestor group ids that have at least one selected descendant leaf
  const buildList = useCallback(
    (access: Record<number, string>): MenuAccess[] => {
      const list: MenuAccess[] = [];
      const selectedLeafIds = new Set<number>();
      for (const [idStr, lvl] of Object.entries(access)) {
        if (lvl && lvl !== "0") {
          const id = Number(idStr);
          selectedLeafIds.add(id);
          list.push({ menuId: id, accessTypeId: lvl });
        }
      }
      // include groups whose subtree has a selected leaf so the menu renders
      for (const id of childrenMap.keys()) {
        if (id === 0) continue;
        if (!isGroup(id)) continue;
        const hasSelected = descendantLeaves(id).some((leaf) => selectedLeafIds.has(leaf));
        if (hasSelected) list.push({ menuId: id, accessTypeId: GROUP_ACCESS });
      }
      return list;
    },
    [childrenMap, isGroup, descendantLeaves]
  );

  const [access, setAccess] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  // (re)initialize whenever a new menu set arrives (e.g. switching roles)
  useEffect(() => {
    const init: Record<number, string> = {};
    for (const item of menuData) {
      const leaf = (childrenMap.get(item.menu_id)?.length ?? 0) === 0;
      if (leaf && item.role_id !== null && item.role_id !== undefined) {
        const lvl =
          item.access_type_id !== null && item.access_type_id !== undefined
            ? String(item.access_type_id)
            : "1";
        if (lvl !== "0") init[item.menu_id] = lvl;
      }
    }
    const allExpanded: Record<number, boolean> = {};
    for (const id of childrenMap.keys()) {
      if (id !== 0) allExpanded[id] = true;
    }
    setAccess(init);
    setExpanded(allExpanded);
    onChangeRef.current(buildList(init));
  }, [menuData, childrenMap, buildList]);

  const emit = (next: Record<number, string>) => {
    setAccess(next);
    onChangeRef.current(buildList(next));
  };

  const setSubtree = (nodeId: number, selected: boolean) => {
    const next = { ...access };
    for (const leaf of descendantLeaves(nodeId)) {
      if (selected) {
        if (!next[leaf] || next[leaf] === "0") next[leaf] = "1";
      } else {
        delete next[leaf];
      }
    }
    emit(next);
  };

  const setLeafAccess = (leafId: number, value: string) => {
    const next = { ...access };
    if (value === "0") delete next[leafId];
    else next[leafId] = value;
    emit(next);
  };

  const toggleExpand = (id: number) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderNode = (node: AppMenuItem, depth: number): React.ReactNode => {
    const children = childrenMap.get(node.menu_id);
    const indent = { paddingLeft: `${depth * 1.5 + 0.5}rem` };

    if (children && children.length > 0) {
      const leaves = descendantLeaves(node.menu_id);
      const selectedCount = leaves.filter((id) => access[id] && access[id] !== "0").length;
      const allSelected = selectedCount === leaves.length && leaves.length > 0;
      const someSelected = selectedCount > 0 && !allSelected;
      const isOpen = !!expanded[node.menu_id];

      return (
        <React.Fragment key={node.menu_id}>
          <tr className="bg-white border-t">
            <td className="py-2" style={indent}>
              <button type="button" onClick={() => toggleExpand(node.menu_id)} className="font-medium">
                {isOpen ? "▼" : "►"} {node.menu_name}
              </button>
            </td>
            <td className="px-4 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => setSubtree(node.menu_id, e.target.checked)}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
              />
            </td>
          </tr>
          {isOpen && children.map((child) => renderNode(child, depth + 1))}
        </React.Fragment>
      );
    }

    const current = access[node.menu_id] && access[node.menu_id] !== "0" ? access[node.menu_id] : "0";
    return (
      <tr key={node.menu_id} className="bg-gray-50 border-t">
        <td className="py-2 text-gray-700" style={indent}>
          {"—"} {node.menu_name}
        </td>
        <td className="px-4 py-2">
          <select
            className="border rounded px-2 py-1 text-sm w-full max-w-[12rem]"
            value={current}
            onChange={(e) => setLeafAccess(node.menu_id, e.target.value)}
          >
            {ACCESS_OPTIONS.map((opt) => (
              <option key={`${node.menu_id}-${opt.value}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </td>
      </tr>
    );
  };

  const roots = childrenMap.get(0) ?? [];

  return (
    <table className="min-w-full border-blue text-sm">
      <thead className="border-blue">
        <tr>
          <th className="px-4 py-2 text-left">Menu Name</th>
          <th className="px-4 py-2 text-left">Access Level</th>
        </tr>
      </thead>
      <tbody>{roots.map((root) => renderNode(root, 0))}</tbody>
    </table>
  );
}
