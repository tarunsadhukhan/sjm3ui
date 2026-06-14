"use client";

/**
 * Portal dashboard landing page.
 *
 * Shows only the "Dashboard" heading — no data. It is the permission fallback
 * route; the portal layout still renders the permission-gated sidebar/menu
 * around it, so menu permissions continue to apply.
 */
export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
    </div>
  );
}
