"use client"

import { ReactNode, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Sidebar from "@/components/dashboard/sidebar"
import { SidebarProvider } from "@/components/dashboard/sidebarContext"
import { Menu } from "lucide-react"

/**
 * Client-side portal permission auto-redirect is DISABLED.
 *
 * This previously ran a useEffect that called `router.replace('/dashboardportal')`
 * whenever `hasMenuAccess(pathname)` returned false. Because `hasMenuAccess`
 * changes identity every time the sidebar menu/permission data is (re)computed,
 * the effect re-ran a beat after a page loaded and bounced the user off create/edit
 * pages back to the portal index — felt like the page "auto-refreshing" while the
 * form was still being filled. We now render children directly: no auto-redirect,
 * even when access evaluates to false. (Mirrors the disabled auto-logout in
 * `auth.ts` / `sidebar.tsx` and `bypassAuth` in `middleware.ts`.)
 */
function PortalPermissionBoundary({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close mobile menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  return (
    // <ProtectedRoute>
    <SidebarProvider>
      <PortalPermissionBoundary>
        <div className="flex flex-col md:flex-row h-screen bg-gray-100">
          {/* Mobile top bar — visible only on small screens */}
          <div className="md:hidden flex items-center justify-end bg-[hsl(var(--sidebar-bg))] px-4 py-3 shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className="text-[hsl(var(--sidebar-fg))] p-1"
              aria-label="Toggle menu"
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Mobile sidebar overlay */}
          {isMobileMenuOpen && (
            <>
              <div
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="fixed top-0 left-0 bottom-0 w-72 z-50 md:hidden">
                <Sidebar
                  isCollapsed={false}
                  onToggle={() => setIsMobileMenuOpen(false)}
                  isMobile
                  onClose={() => setIsMobileMenuOpen(false)}
                />
              </div>
            </>
          )}

          {/* Desktop sidebar — hidden on mobile */}
          <div className="hidden md:block">
            <Sidebar 
              isCollapsed={isSidebarCollapsed} 
              onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              onMouseEnter={() => setIsSidebarCollapsed(false)}
              onMouseLeave={() => setIsSidebarCollapsed(true)}
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white">
              {children}
            </main>
          </div>
        </div>
      </PortalPermissionBoundary>
    </SidebarProvider>
    // </ProtectedRoute>
  )
}