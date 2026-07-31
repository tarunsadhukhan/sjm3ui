"use client";

import { useMemo } from "react";
import { useSidebarContextSafe } from "@/components/dashboard/sidebarContext";
import { normalisePortalPath } from "@/utils/portalPermissions";

/** Permission-only menu paths (normalised/lowercase) controlling jute rate visibility. */
const RATES_MENU_PATHS = {
  po: "jutepurchase/porates",
  mr: "jutepurchase/mrrates",
} as const;

export type JuteRateScope = keyof typeof RATES_MENU_PATHS;

/**
 * Field-level permission for Rate/Amount values on Jute PO and MR pages,
 * controlled independently per document via two permission-only menus:
 * `jutePurchase/poRates` (Jute PO) and `jutePurchase/mrRates` (Jute MR),
 * assigned to users/roles via the normal menu-permission mapping.
 *
 * Uses an EXACT path match (unlike `hasMenuAccess`, which falls back to parent
 * paths) so having access to the PO/MR pages alone never grants rate visibility.
 *
 * access_type_id >= 1 (view) => rates visible; >= 4 (edit) => rates editable.
 * Users without the menu entry see no rate fields at all.
 */
export function useJuteRatePermission(scope: JuteRateScope): { canViewRates: boolean; canEditRates: boolean } {
  const ctx = useSidebarContextSafe();
  const menus = ctx?.availableMenus;

  return useMemo(() => {
    // Outside SidebarProvider (tests/storybook) permissions cannot be resolved —
    // default to visible, matching IndexWrapper's `?? (() => true)` convention.
    if (!menus) return { canViewRates: true, canEditRates: true };
    const level = menus
      .filter((m) => normalisePortalPath(m.menu_path) === RATES_MENU_PATHS[scope])
      .reduce((max, m) => {
        const numeric = Number(m.access_type_id);
        return Number.isFinite(numeric) && numeric > max ? numeric : max;
      }, 0);
    return { canViewRates: level >= 1, canEditRates: level >= 4 };
  }, [menus, scope]);
}
