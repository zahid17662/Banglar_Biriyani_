import { useState, useEffect, useCallback } from "react"
import { navigateTo } from "../../utils/navigation"

interface DayRevenueStat {
  day: string
  orderCount: number
  revenueBdt: number
}

interface AdminStats {
  totalRevenueBdt: number
  todayRevenueBdt: number
  totalOrders: number
  totalCustomers: number
  orderCountsByStatus: Record<string, number>
  revenueByDayOfWeek: DayRevenueStat[]
  recentOrders: {
    id: number
    orderNumber: string
    customerName: string
    customerPhone: string
    customerAddress: string
    scheduledDay: string
    totalBdt: number
    status: string
    paymentMethod: string
    createdAt: string
  }[]
}

const STATUS_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  PENDING: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-300",
  },
  CONFIRMED: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-300",
  },
  PREPARING: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    ring: "ring-purple-300",
  },
  OUT_FOR_DELIVERY: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    ring: "ring-orange-300",
  },
  DELIVERED: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-300",
  },
  CANCELLED: {
    bg: "bg-rose-50",
    text: "text-rose-700",
    ring: "ring-rose-300",
  },
}

export function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch("/api/admin/stats", { credentials: "include" })
      if (!res.ok) {
        throw new Error(`Failed to fetch stats (HTTP ${res.status})`)
      }
      const json = await res.json()
      setStats(json.data)
    } catch (err) {
      console.error("Admin stats fetch error:", err)
      setError(err instanceof Error ? err.message : "Failed to load dashboard metrics")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-3">
        <div className="size-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#D70F64]" />
        <p className="text-xs font-semibold text-slate-500">Loading live business metrics...</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <p className="text-sm font-semibold text-rose-600">{error || "Could not load stats"}</p>
        <button
          type="button"
          onClick={fetchStats}
          className="mt-4 rounded-xl bg-[#D70F64] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#B80C55] cursor-pointer"
        >
          Retry
        </button>
      </div>
    )
  }

  // Calculate active kitchen orders (in-flight before delivery/cancel)
  const activeOrdersCount =
    (stats.orderCountsByStatus.PENDING || 0) +
    (stats.orderCountsByStatus.CONFIRMED || 0) +
    (stats.orderCountsByStatus.PREPARING || 0) +
    (stats.orderCountsByStatus.OUT_FOR_DELIVERY || 0)

  // Find max revenue day for bar chart scaling
  const maxRevenue = Math.max(...stats.revenueByDayOfWeek.map((d) => d.revenueBdt), 1)

  const topDay = [...stats.revenueByDayOfWeek].sort((a, b) => b.revenueBdt - a.revenueBdt)[0]

  return (
    <div className="space-y-8">
      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Revenue
            </span>
            <span className="rounded-xl bg-[#FDF2F7] p-2 text-[#D70F64]">
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </span>
          </div>
          <div className="mt-3">
            <p className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              ৳{stats.totalRevenueBdt.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              From <strong className="text-slate-800">{stats.totalOrders}</strong> total orders
            </p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#D70F64] to-transparent" />
        </div>

        {/* Today's Revenue */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Today's Revenue
            </span>
            <span className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
            </span>
          </div>
          <div className="mt-3">
            <p className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              ৳{stats.todayRevenueBdt.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Neon DB Live Sync
            </p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-500 to-transparent" />
        </div>

        {/* Active Kitchen Orders */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Orders
            </span>
            <span className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </span>
          </div>
          <div className="mt-3">
            <p className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {activeOrdersCount}
            </p>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
              <span>{stats.orderCountsByStatus.PREPARING || 0} In Kitchen</span>
              <span>•</span>
              <span>{stats.orderCountsByStatus.OUT_FOR_DELIVERY || 0} In Transit</span>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-amber-500 to-transparent" />
        </div>

        {/* Registered Customers */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Registered Customers
            </span>
            <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
          </div>
          <div className="mt-3">
            <p className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {stats.totalCustomers}
            </p>
            <p className="mt-1 text-xs text-slate-500">Customer Accounts</p>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-indigo-500 to-transparent" />
        </div>
      </div>

      {/* 7-Day Revenue & Order Demand Visual Bar Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              7-Day Biriyani Demand & Revenue Matrix
            </h2>
            <p className="text-xs text-slate-500">
              Daily pre-order distribution across the weekly feast schedule
            </p>
          </div>

          {topDay && topDay.revenueBdt > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D70F64]/20 bg-[#FDF2F7] px-3 py-1 text-xs font-semibold text-[#D70F64]">
              <span>🔥 Peak Day:</span>
              <strong className="text-slate-900">{topDay.day}</strong>
              <span>(৳{topDay.revenueBdt.toLocaleString()})</span>
            </div>
          )}
        </div>

        {/* Visual Bar Chart */}
        <div className="mt-8 grid grid-cols-7 gap-2 sm:gap-4 items-end pt-8 pb-2">
          {stats.revenueByDayOfWeek.map((dayStat) => {
            const heightPercent = Math.max(Math.round((dayStat.revenueBdt / maxRevenue) * 100), 8)
            const isHighest = topDay && topDay.day === dayStat.day && dayStat.revenueBdt > 0

            return (
              <div key={dayStat.day} className="flex flex-col items-center group">
                {/* Tooltip on hover */}
                <div className="mb-2 text-center opacity-90 transition-opacity">
                  <span className="block font-mono text-[11px] font-bold text-slate-800">
                    ৳
                    {dayStat.revenueBdt >= 1000
                      ? `${(dayStat.revenueBdt / 1000).toFixed(1)}k`
                      : dayStat.revenueBdt}
                  </span>
                  <span className="block text-[10px] text-slate-500">
                    {dayStat.orderCount} orders
                  </span>
                </div>

                {/* Bar */}
                <div className="relative w-full max-w-[48px] h-44 rounded-xl bg-slate-100 flex items-end p-1 overflow-hidden">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-lg transition-all duration-500 ${
                      isHighest
                        ? "bg-[#D70F64] shadow-md shadow-[#D70F64]/30"
                        : "bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                </div>

                {/* Day label */}
                <span
                  className={`mt-3 text-xs font-bold ${
                    isHighest ? "text-[#D70F64]" : "text-slate-600"
                  }`}
                >
                  {dayStat.day.slice(0, 3)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent 10 Orders Table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 bg-white">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Recent Kitchen Orders
            </h2>
            <p className="text-xs text-slate-500">
              Latest pre-orders synchronized with Neon PostgreSQL
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigateTo("/admin/orders")}
            className="text-xs font-semibold text-[#D70F64] hover:underline cursor-pointer"
          >
            View All Live Orders →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 uppercase tracking-wider text-slate-600">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Order #
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Customer
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Scheduled Day
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Amount
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 font-semibold">
                  Payment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stats.recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                    No orders placed yet.
                  </td>
                </tr>
              ) : (
                stats.recentOrders.map((ord) => {
                  const statusStyle = STATUS_COLORS[ord.status] || STATUS_COLORS.PENDING
                  return (
                    <tr key={ord.id} className="transition hover:bg-slate-50/80">
                      <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                        {ord.orderNumber}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">{ord.customerName}</p>
                        <p className="font-mono text-[11px] text-slate-500">{ord.customerPhone}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 border border-slate-200">
                          {ord.scheduledDay}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-[#D70F64]">
                        ৳{ord.totalBdt}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${statusStyle.bg} ${statusStyle.text} ${statusStyle.ring}`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                        {ord.paymentMethod}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
