"use client"

import { useState } from "react"
//import { usePathname } from "next/navigation"
import SidebarConsole from "@/components/dashboard/sidebarCompanyConsole"
// import Header from "@/components/dashboard/header"
// import ProtectedRoute from '@/components/auth/protected-route'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
 //const pathname = usePathname()

  return (
    // <ProtectedRoute>
    <div className="flex h-screen bg-gray-100">
      <SidebarConsole 
        isCollapsed={isSidebarCollapsed} 
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
      /> 
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* <Header /> */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white">
          {children}
        </main>
      </div>
    </div>
    // </ProtectedRoute>
  )
}