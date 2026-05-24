"use client";

/**
 * Client-side sidebar-menu access guard is DISABLED.
 *
 * This previously read the cached `sidebar_companies` from localStorage (once, on
 * mount) and, for any `/dashboardportal/...` route, did `router.replace('/dashboardportal/')`
 * whenever the path wasn't found among the cached menu paths — and "fail-closed"
 * whenever that cache was momentarily empty. Because it only re-synced on cross-tab
 * `storage` events (which never fire in the same tab), it raced the sidebar's menu
 * fetch and intermittently bounced users off valid pages (e.g. the employee edit
 * page) back to the portal root — perceived as the page "refreshing" by itself.
 *
 * It is now a no-op that renders nothing and never redirects. (Mirrors the disabled
 * PortalPermissionBoundary in `dashboardportal/layout.tsx`, the disabled auto-logout
 * in `auth.ts` / `sidebar.tsx`, and `bypassAuth` in `middleware.ts`.)
 */
export default function SidebarCompaniesGuard() {
  return null;
}
