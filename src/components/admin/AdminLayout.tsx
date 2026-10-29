import { useState, type ReactNode } from "react"
import { useAuth } from "../../context/AuthContext"
import { navigateTo, useCurrentPath } from "../../utils/navigation"

interface NavItem {
  id: string
  label: string
  path: string
  icon: (active: boolean) => ReactNode
  adminOnly?: boolean
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Overview",
    path: "/admin",
    icon: (active) => (
      <svg
        className={`size-5 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-700"}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
  {
    id: "schedule",
    label: "7-Day Meal Matrix",
    path: "/admin/schedule",
    icon: (active) => (
      <svg
        className={`size-5 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-700"}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
        <path d="m9 16 2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "orders",
    label: "Live Orders",
    path: "/admin/orders",
    icon: (active) => (
      <svg
        className={`size-5 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-700"}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
        <path d="M3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    id: "menu",
    label: "Menu & Dishes",
    path: "/admin/menu",
    icon: (active) => (
      <svg
        className={`size-5 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-700"}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
      </svg>
    ),
  },
  {
    id: "users",
    label: "Customers & Staff",
    path: "/admin/users",
    adminOnly: true,
    icon: (active) => (
      <svg
        className={`size-5 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-700"}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
]

interface AdminLayoutProps {
  children: ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth()
  const currentPath = useCurrentPath()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const isAdmin = user?.role === "ADMIN"

  const activeItem =
    NAV_ITEMS.find((item) => {
      if (item.path === "/admin") {
        return currentPath === "/admin" || currentPath === "/admin/"
      }
      return currentPath.startsWith(item.path)
    }) || NAV_ITEMS[0]

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Admin Navigation"
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#D70F64] font-bold text-white shadow-md shadow-[#D70F64]/30">
              BB
            </span>
            <div>
              <p className="text-sm font-bold text-slate-900 tracking-tight">Banglar Biriyani</p>
              <div className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Operations Console
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:text-slate-700 lg:hidden"
            aria-label="Close menu"
          >
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" x2="6" y1="6" y2="18" />
              <line x1="6" x2="18" y1="6" y2="18" />
            </svg>
          </button>
        </div>

        {/* User Card */}
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="truncate">
              <p className="truncate text-xs font-bold text-slate-900">{user?.fullName}</p>
              <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                isAdmin
                  ? "bg-[#FDF2F7] text-[#D70F64] border border-[#D70F64]/20"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {user?.role}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4" aria-label="Portal tabs">
          {NAV_ITEMS.map((item) => {
            if (item.adminOnly && !isAdmin) return null

            const isCurrent = activeItem.id === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  navigateTo(item.path)
                  setIsMobileMenuOpen(false)
                }}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
                  isCurrent
                    ? "bg-[#D70F64] text-white shadow-md shadow-[#D70F64]/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
                aria-current={isCurrent ? "page" : undefined}
              >
                <div className="flex items-center gap-3">
                  {item.icon(isCurrent)}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isCurrent
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="border-t border-slate-200 p-4 space-y-2">
          {/* Back to Live Storefront Button */}
          <button
            type="button"
            onClick={() => navigateTo("/")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-[#D70F64] hover:bg-[#FDF2F7] hover:text-[#D70F64] cursor-pointer"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Back to Live Storefront</span>
          </button>

          {/* Sign Out Button */}
          <button
            type="button"
            onClick={() => {
              logout()
              navigateTo("/")
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className="flex flex-1 flex-col overflow-x-hidden">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden cursor-pointer"
              aria-label="Open sidebar"
            >
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="3" x2="21" y1="12" y2="12" />
                <line x1="3" x2="21" y1="6" y2="6" />
                <line x1="3" x2="21" y1="18" y2="18" />
              </svg>
            </button>
            <h1 className="font-display text-lg font-bold text-slate-900 sm:text-xl">
              {activeItem.label}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateTo("/")}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#D70F64] hover:bg-[#FDF2F7] hover:text-[#D70F64] cursor-pointer"
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              Storefront Preview
            </button>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1.5">
              <span className="text-xs font-semibold text-slate-700">
                {user?.fullName.split(" ")[0]}
              </span>
              <span className="rounded-full bg-[#D70F64] px-2 py-0.5 text-[10px] font-bold text-white">
                {user?.role}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-slate-50">{children}</main>
      </div>
    </div>
  )
}
