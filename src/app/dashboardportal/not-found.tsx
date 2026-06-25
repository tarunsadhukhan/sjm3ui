"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useSidebarContextSafe, type MenuItem } from "@/components/dashboard/sidebarContext";
import { normalisePortalPath } from "@/utils/portalPermissions";

/**
 * Portal-scoped 404 boundary.
 *
 * Next.js renders the nearest `not-found` boundary when no route matches, and a
 * boundary placed here (inside `dashboardportal/`) renders within the portal
 * layout — so the sidebar stays in place — and covers unmatched routes at ANY
 * depth under `/dashboardportal`.
 *
 * Instead of a bare "404", we show a friendly placeholder with the menu's
 * display name in the center. The name is resolved from the sidebar menu data
 * (matched by `menu_path`); when no menu matches we fall back to humanising the
 * last URL segment.
 */

/** Convert a path segment like "yarnQualityMaster" / "yarn-quality" into "Yarn Quality Master". */
function humaniseSegment(segment: string): string {
  if (!segment) return "Page";
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function PortalNotFound() {
  const ctx = useSidebarContextSafe();
  const pathname = usePathname();

  const menuName = useMemo(() => {
    const normalisedPath = normalisePortalPath(pathname);

    // Gather every menu we know about: the active set plus the full company tree.
    const allMenus: MenuItem[] = [];
    if (ctx) {
      const push = (menus: MenuItem[] | undefined) => {
        if (!Array.isArray(menus)) return;
        for (const menu of menus) {
          if (menu && !allMenus.some(m => m.menu_id === menu.menu_id)) {
            allMenus.push(menu);
          }
        }
      };
      push(ctx.availableMenus);
      push(ctx.menuItems);
      ctx.companies.forEach(company =>
        company.branches.forEach(branch => push(branch.menus)),
      );
    }

    const match = allMenus.find(
      menu => normalisePortalPath(menu.menu_path) === normalisedPath,
    );
    if (match?.menu_name) return match.menu_name;

    // Fallback: humanise the last meaningful URL segment.
    const lastSegment = normalisedPath.split("/").filter(Boolean).pop() ?? "";
    return humaniseSegment(lastSegment);
  }, [ctx, pathname]);

  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <span className="text-xs font-semibold uppercase tracking-widest text-[#3ea6da]">
        Coming Soon
      </span>
      <h1 className="mt-3 text-3xl font-bold text-[#0c3c60] md:text-4xl">
        {menuName}
      </h1>
      <p className="mt-3 max-w-md text-sm text-gray-500">
        This page is not available yet. Please check back later.
      </p>
    </div>
  );
}
