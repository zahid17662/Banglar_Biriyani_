import { useState, useEffect, useCallback } from "react"
import { useAuth } from "../context/AuthContext"
import { useBodyScrollLock } from "../hooks/useBodyScrollLock"

interface AdminStats {
  totalRevenueBdt: number
  todayRevenueBdt: number
  totalOrders: number
  totalCustomers: number
  orderCountsByStatus: Record<string, number>
  revenueByDayOfWeek: { day: string; orderCount: number; revenueBdt: number }[]
  recentOrders: any[]
}

export function AdminPanelModal() {
  const { isAdminModalOpen, closeAdminModal, user } = useAuth()
  const [activeTab, setActiveTab] = useState<"stats" | "orders" | "schedule" | "users">("stats")

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [usersList, setUsersList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [actionMessage, setActionMessage] = useState<string | null>(null)

  const isStaffOrAdmin = user?.role === "ADMIN" || user?.role === "STAFF"
  const isAdmin = user?.role === "ADMIN"

  useBodyScrollLock(isAdminModalOpen && isStaffOrAdmin)

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats", { credentials: "include" })
      if (res.ok) {
        const body = await res.json()
        setStats(body.data)
      }
    } catch (err) {
      console.warn("Failed to fetch admin stats:", err)
    }
  }, [])

  const fetchOrders = useCallback(async () => {
    try {
      const query = statusFilter ? `?status=${statusFilter}` : ""
      const res = await fetch(`/api/admin/orders${query}`, {
        credentials: "include",
      })
      if (res.ok) {
        const body = await res.json()
        setOrders(body.data || [])
      }
    } catch (err) {
      console.warn("Failed to fetch admin orders:", err)
    }
  }, [statusFilter])

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return
    try {
      const res = await fetch("/api/admin/users", { credentials: "include" })
      if (res.ok) {
        const body = await res.json()
        setUsersList(body.data || [])
      }
    } catch (err) {
      console.warn("Failed to fetch admin users:", err)
    }
  }, [isAdmin])

  useEffect(() => {
    if (!isAdminModalOpen || !isStaffOrAdmin) return
    setIsLoading(true)

    if (activeTab === "stats") {
      fetchStats().finally(() => setIsLoading(false))
    } else if (activeTab === "orders") {
      fetchOrders().finally(() => setIsLoading(false))
    } else if (activeTab === "users" && isAdmin) {
      fetchUsers().finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [isAdminModalOpen, activeTab, isStaffOrAdmin, isAdmin, fetchStats, fetchOrders, fetchUsers])

  const handleUpdateOrderStatus = async (orderId: number, nextStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      })

      if (res.ok) {
        setActionMessage(`Order #${orderId} status changed to ${nextStatus}`)
        setTimeout(() => setActionMessage(null), 3000)
        fetchOrders()
      }
    } catch (err) {
      console.warn("Error changing order status:", err)
    }
  }

  const handleUpdateUserRole = async (targetUserId: number, nextRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: nextRole }),
      })

      if (res.ok) {
        setActionMessage(`User #${targetUserId} updated to ${nextRole}`)
        setTimeout(() => setActionMessage(null), 3000)
        fetchUsers()
      } else {
        const err = await res.json()
        setActionMessage(`Error: ${err?.error?.message || "Failed to update role"}`)
        setTimeout(() => setActionMessage(null), 4000)
      }
    } catch (err) {
      console.warn("Error changing user role:", err)
    }
  }

  // Escape key handler
  useEffect(() => {
    if (!isAdminModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAdminModal()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isAdminModalOpen, closeAdminModal])

  if (!isAdminModalOpen || !isStaffOrAdmin) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Banglar Biriyani Operations Management Panel"
    >
      <div
        className="fixed inset-0 bg-charcoal/60 backdrop-blur-xs transition-opacity"
        onClick={closeAdminModal}
        aria-hidden="true"
      />

      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-white via-[#FDF2F7]/50 to-white px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#D70F64] text-xs font-bold text-white shadow-xs">
              ADMIN
            </span>
            <div>
              <h2 className="text-lg font-bold text-charcoal">
                Banglar Biriyani Operations Portal
              </h2>
              <p className="text-xs text-slate">
                Role: <strong>{user?.role}</strong> • Signed in as {user?.fullName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeAdminModal}
              className="grid size-9 place-items-center rounded-full text-slate transition hover:bg-slate/10 hover:text-charcoal"
              aria-label="Close admin modal"
            >
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-line bg-alabaster/60 px-6 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("stats")}
            className={`border-b-2 px-4 py-3 transition ${
              activeTab === "stats"
                ? "border-[#D70F64] text-[#D70F64]"
                : "border-transparent text-slate hover:text-charcoal"
            }`}
          >
            Dashboard & Revenue
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`border-b-2 px-4 py-3 transition ${
              activeTab === "orders"
                ? "border-[#D70F64] text-[#D70F64]"
                : "border-transparent text-slate hover:text-charcoal"
            }`}
          >
            Order Processing
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={`border-b-2 px-4 py-3 transition ${
                activeTab === "users"
                  ? "border-[#D70F64] text-[#D70F64]"
                  : "border-transparent text-slate hover:text-charcoal"
              }`}
            >
              User Accounts & Roles
            </button>
          )}
        </div>

        {/* Action toast */}
        {actionMessage && (
          <div className="bg-emerald-600 px-6 py-2 text-xs font-semibold text-white">
            {actionMessage}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate">
              <span className="animate-spin text-2xl mr-2">⏳</span> Loading admin data...
            </div>
          ) : activeTab === "stats" && stats ? (
            <div className="space-y-6">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
                  <p className="text-xs text-slate">Total Lifetime Revenue</p>
                  <p className="mt-1 text-2xl font-bold text-[#D70F64]">
                    ৳{stats.totalRevenueBdt.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
                  <p className="text-xs text-slate">Today's Revenue</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">
                    ৳{stats.todayRevenueBdt.toLocaleString()}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
                  <p className="text-xs text-slate">Total Orders</p>
                  <p className="mt-1 text-2xl font-bold text-charcoal">{stats.totalOrders}</p>
                </div>
                <div className="rounded-xl border border-line bg-white p-4 shadow-xs">
                  <p className="text-xs text-slate">Registered Customers</p>
                  <p className="mt-1 text-2xl font-bold text-charcoal">{stats.totalCustomers}</p>
                </div>
              </div>

              {/* Status Breakdown & Day Breakdown */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-xl border border-line bg-white p-4">
                  <h3 className="text-sm font-bold text-charcoal">Order Status Breakdown</h3>
                  <div className="mt-3 divide-y divide-line/60 text-xs">
                    {Object.entries(stats.orderCountsByStatus).map(([st, cnt]) => (
                      <div key={st} className="flex justify-between py-2">
                        <span className="font-medium text-slate">{st}</span>
                        <span className="font-bold text-charcoal">{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-white p-4">
                  <h3 className="text-sm font-bold text-charcoal">7-Day Meal Revenue (BDT)</h3>
                  <div className="mt-3 divide-y divide-line/60 text-xs">
                    {stats.revenueByDayOfWeek.map((d) => (
                      <div key={d.day} className="flex justify-between py-2">
                        <span className="font-medium text-slate">{d.day}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate">{d.orderCount} orders</span>
                          <span className="font-bold text-[#D70F64]">৳{d.revenueBdt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "orders" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate">Filter Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-line bg-white px-2.5 py-1 text-xs text-charcoal"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="PREPARING">PREPARING</option>
                  <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="overflow-x-auto rounded-xl border border-line bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-alabaster text-slate font-semibold">
                    <tr>
                      <th className="p-3">Order #</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Day / Slot</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate">
                          No orders match criteria
                        </td>
                      </tr>
                    ) : (
                      orders.map(({ order }) => (
                        <tr key={order.id} className="hover:bg-alabaster/30">
                          <td className="p-3 font-mono font-bold text-charcoal">
                            #{order.orderNumber}
                          </td>
                          <td className="p-3">
                            <p className="font-semibold text-charcoal">{order.customerName}</p>
                            <p className="text-[11px] text-slate">{order.customerPhone}</p>
                          </td>
                          <td className="p-3">
                            <span className="rounded bg-[#D70F64]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#D70F64]">
                              {order.scheduledDay}
                            </span>
                            <p className="mt-0.5 text-[10px] text-slate">{order.deliverySlot}</p>
                          </td>
                          <td className="p-3 font-bold text-[#D70F64]">৳{order.totalBdt}</td>
                          <td className="p-3">
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              {order.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                              className="rounded border border-line bg-white px-2 py-1 text-xs"
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="CONFIRMED">CONFIRMED</option>
                              <option value="PREPARING">PREPARING</option>
                              <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                              <option value="DELIVERED">DELIVERED</option>
                              <option value="CANCELLED">CANCELLED</option>
                            </select>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === "users" && isAdmin ? (
            <div className="overflow-x-auto rounded-xl border border-line bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-alabaster text-slate font-semibold">
                  <tr>
                    <th className="p-3">User ID</th>
                    <th className="p-3">Name & Email</th>
                    <th className="p-3">Phone</th>
                    <th className="p-3">Orders</th>
                    <th className="p-3">Total Spend</th>
                    <th className="p-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {usersList.map((u) => (
                    <tr key={u.id} className="hover:bg-alabaster/30">
                      <td className="p-3 font-mono">#{u.id}</td>
                      <td className="p-3">
                        <p className="font-semibold text-charcoal">{u.fullName}</p>
                        <p className="text-[11px] text-slate">{u.email}</p>
                      </td>
                      <td className="p-3">{u.phone}</td>
                      <td className="p-3 font-bold">{u.orderCount}</td>
                      <td className="p-3 font-bold text-[#D70F64]">৳{u.totalSpendBdt}</td>
                      <td className="p-3">
                        {u.id === user?.id ? (
                          <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            Current Admin (Protected)
                          </span>
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                            className="rounded border border-line bg-white px-2 py-1 text-xs"
                          >
                            <option value="CUSTOMER">CUSTOMER</option>
                            <option value="STAFF">STAFF</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
