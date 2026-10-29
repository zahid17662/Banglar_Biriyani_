import { useState, useEffect, useCallback, useMemo } from "react"

interface OrderItem {
  id: number
  orderId: number
  menuItemId: number
  scheduledDay: string
  itemNameSnapshot: string
  quantity: number
  unitPriceBdt: number
  lineTotalBdt: number
  imageUrl?: string | null
  portionSize?: string | null
}

interface AdminOrder {
  id: number
  orderNumber: string
  userId: number | null
  customerName: string
  customerPhone: string
  customerAddress: string
  scheduledDay: string
  deliverySlot: string
  paymentMethod: string
  subtotalBdt: number
  deliveryFeeBdt: number
  totalBdt: number
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED"
  paymentTrxId?: string | null
  isPaymentVerified?: boolean
  notes: string | null
  createdAt: string
  items?: OrderItem[]
}

const DAYS_LIST = [
  "ALL",
  "SATURDAY",
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
] as const

const STATUS_LIST = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const

const PAYMENT_LIST = ["ALL", "COD", "BKASH", "NAGAD"] as const

const KANBAN_COLUMNS: {
  key: AdminOrder["status"]
  title: string
  badgeColor: string
}[] = [
  {
    key: "PENDING",
    title: "New Orders",
    badgeColor: "bg-amber-50 text-amber-700 ring-amber-300",
  },
  {
    key: "CONFIRMED",
    title: "Confirmed",
    badgeColor: "bg-blue-50 text-blue-700 ring-blue-300",
  },
  {
    key: "PREPARING",
    title: "Kitchen Dum",
    badgeColor: "bg-purple-50 text-purple-700 ring-purple-300",
  },
  {
    key: "OUT_FOR_DELIVERY",
    title: "On The Way",
    badgeColor: "bg-orange-50 text-orange-700 ring-orange-300",
  },
  {
    key: "DELIVERED",
    title: "Delivered",
    badgeColor: "bg-emerald-50 text-emerald-700 ring-emerald-300",
  },
]

export function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table")

  // Filter state
  const [dayFilter, setDayFilter] = useState<string>("ALL")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Active selected order for kitchen ticket & details
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState<{
    text: string
    isError?: boolean
  } | null>(null)

  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError })
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Fetch orders with current active filters
  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (dayFilter !== "ALL") params.append("day", dayFilter)
      if (statusFilter !== "ALL") params.append("status", statusFilter)
      if (paymentFilter !== "ALL") params.append("paymentMethod", paymentFilter)
      if (searchQuery.trim()) params.append("search", searchQuery.trim())

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        credentials: "include",
      })

      if (!res.ok) throw new Error("Failed to load orders")
      const json = await res.json()
      const formatted: AdminOrder[] = (json.data || []).map((entry: any) => {
        if (entry && entry.order) {
          return {
            ...entry.order,
            items: entry.items || [],
          }
        }
        return entry
      })
      setOrders(formatted)
    } catch (err) {
      console.error("Fetch orders error:", err)
      showToast(err instanceof Error ? err.message : "Error fetching orders", true)
    } finally {
      setIsLoading(false)
    }
  }, [dayFilter, statusFilter, paymentFilter, searchQuery])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // One-click status update with optimistic UI update
  const handleUpdateStatus = async (orderId: number, nextStatus: AdminOrder["status"]) => {
    const previousOrders = [...orders]
    const targetOrder = orders.find((o) => o.id === orderId)

    // Optimistic update
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o)))
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: nextStatus } : null))
    }

    try {
      setUpdatingId(orderId)
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: nextStatus }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || "Failed to update order status")
      }

      const resJson = await res.json().catch(() => null)
      if (resJson?.data?.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, ...resJson.data.order } : o)),
        )
      }

      showToast(`Order #${targetOrder?.orderNumber || orderId} transitioned to ${nextStatus}`)
    } catch (err) {
      // Rollback on error
      console.error("Status update error:", err)
      setOrders(previousOrders)
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(previousOrders.find((o) => o.id === orderId) || null)
      }
      showToast(err instanceof Error ? err.message : "Status update rollback", true)
    } finally {
      setUpdatingId(null)
    }
  }

  // One-click payment verification toggle (PATCH /api/admin/orders/:id/verify-payment)
  const handleVerifyPayment = async (orderId: number, currentVerified: boolean) => {
    const nextVerified = !currentVerified
    const previousOrders = [...orders]

    // Optimistic UI update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, isPaymentVerified: nextVerified } : o)),
    )
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, isPaymentVerified: nextVerified } : null))
    }

    try {
      const res = await fetch(`/api/admin/orders/${orderId}/verify-payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isVerified: nextVerified }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || "Failed to update payment status")
      }

      const resJson = await res.json().catch(() => null)
      if (resJson?.data?.order) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, ...resJson.data.order } : o)),
        )
      }

      showToast(nextVerified ? "Payment marked as Verified ✓" : "Payment marked as Unverified")
    } catch (err) {
      console.error("Verify payment error:", err)
      setOrders(previousOrders)
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(previousOrders.find((o) => o.id === orderId) || null)
      }
      showToast(err instanceof Error ? err.message : "Failed to verify payment", true)
    }
  }

  // Grouped orders for Kanban
  const kanbanGroups = useMemo(() => {
    const groups: Record<string, AdminOrder[]> = {
      PENDING: [],
      CONFIRMED: [],
      PREPARING: [],
      OUT_FOR_DELIVERY: [],
      DELIVERED: [],
    }
    orders.forEach((order) => {
      if (groups[order.status]) {
        groups[order.status].push(order)
      }
    })
    return groups
  }, [orders])

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl transition animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.isError
              ? "border border-rose-200 bg-white text-rose-600 shadow-rose-500/10"
              : "border border-emerald-200 bg-white text-emerald-700 shadow-emerald-500/10"
          }`}
        >
          <span className="size-2 rounded-full bg-current animate-ping" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header and View Mode Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#FDF2F7] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#D70F64] border border-[#D70F64]/20">
              OPERATIONS & KITCHEN
            </span>
            <span className="text-xs text-slate-500">
              Live Order Management ({orders.length} orders)
            </span>
          </div>
          <h2 className="mt-1 font-display text-xl font-bold text-slate-900 sm:text-2xl">
            Orders & Kitchen Dispatch
          </h2>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                viewMode === "table"
                  ? "bg-[#D70F64] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <svg
                className="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18M3 15h18M9 3v18" />
              </svg>
              <span>Table View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-[#D70F64] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <svg
                className="size-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect width="5" height="14" x="3" y="5" rx="1" />
                <rect width="5" height="18" x="10" y="3" rx="1" />
                <rect width="5" height="10" x="17" y="7" rx="1" />
              </svg>
              <span>Kitchen Kanban</span>
            </button>
          </div>

          <button
            type="button"
            onClick={fetchOrders}
            title="Refresh Orders"
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 shadow-xs cursor-pointer"
          >
            <svg
              className={`size-4 ${isLoading ? "animate-spin text-[#D70F64]" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 16h5v5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Search Input */}
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order # (BB-...), Phone (01XXXXXXXXX), or Customer Name..."
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 transition focus:border-[#D70F64] focus:outline-none focus:ring-1 focus:ring-[#D70F64]/20"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Payment:</span>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-[#D70F64] focus:outline-none"
            >
              {PAYMENT_LIST.map((p) => (
                <option key={p} value={p}>
                  {p === "ALL" ? "All Payments" : p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Scheduled Day and Status Pills */}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Day Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Day:</span>
            {DAYS_LIST.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setDayFilter(day)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                  dayFilter === day
                    ? "bg-[#D70F64] text-white shadow-xs"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                {day === "ALL" ? "All Days" : day.slice(0, 3)}
              </button>
            ))}
          </div>

          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Status:</span>
            {STATUS_LIST.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-2 py-1 text-[10px] font-bold transition cursor-pointer ${
                  statusFilter === st
                    ? "bg-[#D70F64] text-white shadow-xs"
                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main View: Table or Kanban */}
      {isLoading ? (
        <div className="flex min-h-[350px] flex-col items-center justify-center space-y-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#D70F64]" />
          <p className="text-xs text-slate-500">Loading orders from Neon DB...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800">No orders found</p>
          <p className="mt-1 text-xs text-slate-500">
            No pre-orders match the selected filter criteria.
          </p>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 uppercase tracking-wider text-slate-600">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Order #
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Customer
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Scheduled Day & Slot
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Items & Portions
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Total (BDT)
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold text-center">
                    One-Click Kitchen Actions
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold text-right">
                    Ticket
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {orders.map((ord) => {
                  const itemsCount = ord.items?.reduce((sum, i) => sum + i.quantity, 0) || 0

                  return (
                    <tr key={ord.id} className="transition hover:bg-slate-50/80 group">
                      {/* Order Number & Payment */}
                      <td className="px-5 py-4 font-mono">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="font-bold text-slate-900 hover:text-[#D70F64] transition text-left cursor-pointer"
                        >
                          {ord.orderNumber}
                        </button>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-700">
                            {ord.paymentMethod}
                          </span>
                          {ord.paymentTrxId && (
                            <span className="rounded bg-[#FDF2F7] border border-[#D70F64]/30 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#D70F64]">
                              TrxID: {ord.paymentTrxId}
                            </span>
                          )}
                          {(ord.paymentMethod === "BKASH" ||
                            ord.paymentMethod === "NAGAD" ||
                            ord.paymentTrxId) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleVerifyPayment(ord.id, Boolean(ord.isPaymentVerified))
                              }}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold transition cursor-pointer ${
                                ord.isPaymentVerified
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-100"
                                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-300 hover:bg-amber-100"
                              }`}
                              title={
                                ord.isPaymentVerified
                                  ? "Payment verified. Click to toggle unverified."
                                  : "Payment pending. Click to verify."
                              }
                            >
                              {ord.isPaymentVerified ? "✓ Verified" : "⏳ Verify Payment"}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Customer Details */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{ord.customerName}</p>
                        <p className="font-mono text-[11px] text-slate-500">{ord.customerPhone}</p>
                        <p className="max-w-[180px] truncate text-[11px] text-slate-500">
                          {ord.customerAddress}
                        </p>
                      </td>

                      {/* Scheduled Day */}
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-800">
                          {ord.scheduledDay}
                        </span>
                        <p className="mt-1 text-[11px] text-slate-500">{ord.deliverySlot}</p>
                      </td>

                      {/* Items */}
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">
                          {itemsCount} {itemsCount === 1 ? "portion" : "portions"}
                        </p>
                        <p className="max-w-[200px] truncate text-[11px] text-slate-500">
                          {ord.items
                            ?.map((i) => `${i.quantity}x ${i.itemNameSnapshot}`)
                            .join(", ") || "Details in ticket"}
                        </p>
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4 font-mono font-bold text-[#D70F64] text-sm">
                        ৳{ord.totalBdt}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ring-1 ${
                            ord.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 ring-amber-300"
                              : ord.status === "CONFIRMED"
                                ? "bg-blue-50 text-blue-700 ring-blue-300"
                                : ord.status === "PREPARING"
                                  ? "bg-purple-50 text-purple-700 ring-purple-300"
                                  : ord.status === "OUT_FOR_DELIVERY"
                                    ? "bg-orange-50 text-orange-700 ring-orange-300"
                                    : ord.status === "DELIVERED"
                                      ? "bg-emerald-50 text-emerald-700 ring-emerald-300"
                                      : "bg-rose-50 text-rose-700 ring-rose-300"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>

                      {/* One-Click Action Buttons */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {ord.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                disabled={updatingId === ord.id}
                                onClick={() => handleUpdateStatus(ord.id, "CONFIRMED")}
                                className="rounded-lg bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-blue-500 cursor-pointer shadow-xs"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                disabled={updatingId === ord.id}
                                onClick={() => handleUpdateStatus(ord.id, "CANCELLED")}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {ord.status === "CONFIRMED" && (
                            <button
                              type="button"
                              disabled={updatingId === ord.id}
                              onClick={() => handleUpdateStatus(ord.id, "PREPARING")}
                              className="rounded-lg bg-[#D70F64] px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-[#B80C55] cursor-pointer shadow-xs"
                            >
                              Start Dum Prep
                            </button>
                          )}

                          {ord.status === "PREPARING" && (
                            <button
                              type="button"
                              disabled={updatingId === ord.id}
                              onClick={() => handleUpdateStatus(ord.id, "OUT_FOR_DELIVERY")}
                              className="rounded-lg bg-orange-600 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-orange-500 cursor-pointer shadow-xs"
                            >
                              Dispatch Delivery
                            </button>
                          )}

                          {ord.status === "OUT_FOR_DELIVERY" && (
                            <button
                              type="button"
                              disabled={updatingId === ord.id}
                              onClick={() => handleUpdateStatus(ord.id, "DELIVERED")}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-emerald-500 cursor-pointer shadow-xs"
                            >
                              Mark Delivered
                            </button>
                          )}

                          {ord.status === "DELIVERED" && (
                            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                              ✓ Completed
                            </span>
                          )}

                          {ord.status === "CANCELLED" && (
                            <span className="text-[11px] text-rose-500 font-semibold">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ticket Modal Trigger */}
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(ord)}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-[#D70F64] hover:text-[#D70F64] transition cursor-pointer"
                        >
                          Kitchen Slip
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* KITCHEN KANBAN BOARD VIEW */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5 items-start">
          {KANBAN_COLUMNS.map((col) => {
            const colOrders = kanbanGroups[col.key] || []

            return (
              <div
                key={col.key}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[420px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-xs">{col.title}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.2 font-mono text-[10px] font-bold ring-1 ${col.badgeColor}`}
                  >
                    {colOrders.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="flex-1 space-y-3 p-3 overflow-y-auto max-h-[600px] bg-slate-50/50">
                  {colOrders.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400">
                      No {col.title.toLowerCase()}
                    </div>
                  ) : (
                    colOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition hover:border-slate-300 hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            className="font-mono text-xs font-bold text-slate-900 hover:text-[#D70F64] transition cursor-pointer"
                          >
                            {ord.orderNumber}
                          </button>
                          <span className="font-mono text-xs font-bold text-[#D70F64]">
                            ৳{ord.totalBdt}
                          </span>
                        </div>

                        <div className="mt-1 text-[11px] text-slate-700">
                          <p className="font-semibold truncate">{ord.customerName}</p>
                          <p className="text-slate-500 font-mono">{ord.customerPhone}</p>
                        </div>

                        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700 border border-slate-200 font-bold">
                            {ord.scheduledDay}
                          </span>
                          <span>{ord.deliverySlot.split(" ")[0]}</span>
                        </div>

                        {/* Payment & TrxID row */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[10px]">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-700 border border-slate-200">
                            {ord.paymentMethod}
                          </span>
                          {ord.paymentTrxId && (
                            <span className="rounded border border-[#D70F64]/30 bg-[#FDF2F7] px-1 py-0.5 font-mono font-bold text-[#D70F64]">
                              {ord.paymentTrxId}
                            </span>
                          )}
                          {(ord.paymentMethod === "BKASH" ||
                            ord.paymentMethod === "NAGAD" ||
                            ord.paymentTrxId) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleVerifyPayment(ord.id, Boolean(ord.isPaymentVerified))
                              }}
                              className={`rounded px-1.5 py-0.5 font-bold transition cursor-pointer ${
                                ord.isPaymentVerified
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-100"
                                  : "bg-amber-50 text-amber-700 ring-1 ring-amber-300 hover:bg-amber-100"
                              }`}
                            >
                              {ord.isPaymentVerified ? "✓ Verified" : "⏳ Verify"}
                            </button>
                          )}
                        </div>

                        {/* Items preview */}
                        <div className="mt-2 text-[11px] text-slate-500">
                          <ul className="space-y-0.5">
                            {ord.items?.slice(0, 2).map((item) => (
                              <li key={item.id} className="truncate">
                                • {item.quantity}x {item.itemNameSnapshot}
                              </li>
                            ))}
                            {(ord.items?.length || 0) > 2 && (
                              <li className="text-[10px] text-slate-400">
                                +{(ord.items?.length || 0) - 2} more items
                              </li>
                            )}
                          </ul>
                        </div>

                        {/* Kanban Action Buttons */}
                        <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2">
                          {col.key === "PENDING" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(ord.id, "CONFIRMED")}
                              className="w-full rounded-lg bg-blue-600 py-1 text-[10px] font-bold text-white hover:bg-blue-500 cursor-pointer shadow-xs"
                            >
                              Confirm
                            </button>
                          )}
                          {col.key === "CONFIRMED" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(ord.id, "PREPARING")}
                              className="w-full rounded-lg bg-[#D70F64] py-1 text-[10px] font-bold text-white hover:bg-[#B80C55] cursor-pointer shadow-xs"
                            >
                              Start Dum
                            </button>
                          )}
                          {col.key === "PREPARING" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(ord.id, "OUT_FOR_DELIVERY")}
                              className="w-full rounded-lg bg-orange-600 py-1 text-[10px] font-bold text-white hover:bg-orange-500 cursor-pointer shadow-xs"
                            >
                              Dispatch
                            </button>
                          )}
                          {col.key === "OUT_FOR_DELIVERY" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(ord.id, "DELIVERED")}
                              className="w-full rounded-lg bg-emerald-600 py-1 text-[10px] font-bold text-white hover:bg-emerald-500 cursor-pointer shadow-xs"
                            >
                              Deliver
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-700 hover:border-[#D70F64] hover:text-[#D70F64] cursor-pointer"
                            title="View Kitchen Ticket"
                          >
                            Slip
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PRINTABLE KITCHEN TICKET & ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs print:hidden"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl print:border-none print:bg-white print:text-black print:max-h-none print:shadow-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white p-5 print:hidden">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#D70F64] px-2 py-0.5 text-xs font-bold text-white">
                  KITCHEN TICKET
                </span>
                <span className="font-mono text-sm font-bold text-slate-900">
                  {selectedOrder.orderNumber}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 cursor-pointer"
                >
                  <svg
                    className="size-3.5 text-[#D70F64]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 6 2 18 2 18 9" />
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                    <rect width="12" height="8" x="6" y="14" />
                  </svg>
                  <span>Print Ticket</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 print:p-4 print:text-black">
              {/* Brand Header for Kitchen Printer */}
              <div className="text-center border-b border-dashed border-slate-200 pb-3 print:border-black">
                <h1 className="font-display text-xl font-bold text-slate-900 print:text-black">
                  Banglar Biriyani
                </h1>
                <p className="text-xs text-[#D70F64] font-semibold print:text-black">
                  Kitchen Dum & Dispatch Order Slip
                </p>
                <div className="mt-2 inline-block rounded-md border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-sm font-bold text-slate-900 print:border-black print:text-black">
                  {selectedOrder.orderNumber}
                </div>
              </div>

              {/* Delivery Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs border-b border-slate-200 pb-3 print:border-black print:text-black">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 print:text-gray-600">
                    Scheduled Day
                  </span>
                  <p className="font-bold text-slate-900 print:text-black">
                    {selectedOrder.scheduledDay}
                  </p>
                  <p className="text-slate-600 print:text-black">{selectedOrder.deliverySlot}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-500 print:text-gray-600">
                    Payment Method
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-[#D70F64] print:text-black">
                      {selectedOrder.paymentMethod}
                    </p>
                    {selectedOrder.paymentTrxId && (
                      <span className="rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-900 print:text-black">
                        TrxID: {selectedOrder.paymentTrxId}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleVerifyPayment(
                          selectedOrder.id,
                          Boolean(selectedOrder.isPaymentVerified),
                        )
                      }
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold transition cursor-pointer print:hidden ${
                        selectedOrder.isPaymentVerified
                          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-100"
                          : "bg-amber-50 text-amber-700 ring-1 ring-amber-300 hover:bg-amber-100"
                      }`}
                    >
                      {selectedOrder.isPaymentVerified ? "✓ Verified" : "⏳ Verify Payment"}
                    </button>
                    <span className="text-[11px] text-slate-500 print:text-black">
                      Status: {selectedOrder.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="text-xs border-b border-slate-200 pb-3 print:border-black print:text-black space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 print:text-gray-600">
                  Deliver To
                </span>
                <p className="font-bold text-sm text-slate-900 print:text-black">
                  {selectedOrder.customerName}
                </p>
                <p className="font-mono text-slate-600 print:text-black">
                  📞 {selectedOrder.customerPhone}
                </p>
                <p className="text-slate-600 print:text-black">
                  📍 {selectedOrder.customerAddress}
                </p>
                {selectedOrder.notes && (
                  <div className="mt-2 rounded-lg bg-amber-50 p-2 text-amber-800 border border-amber-200 print:bg-gray-100 print:text-black print:ring-0">
                    <strong>Kitchen Notes:</strong> {selectedOrder.notes}
                  </div>
                )}
              </div>

              {/* Itemized Kitchen Breakdown */}
              <div className="text-xs space-y-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 print:text-gray-600">
                  Itemized Food Portions
                </span>
                <table className="w-full text-left">
                  <thead className="border-b border-slate-200 text-[10px] text-slate-500 uppercase print:border-black print:text-black">
                    <tr>
                      <th className="py-1">Qty</th>
                      <th className="py-1">Dish</th>
                      <th className="py-1 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800 print:divide-black print:text-black font-medium">
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2 font-mono font-bold text-[#D70F64] print:text-black">
                          {item.quantity}x
                        </td>
                        <td className="py-2">
                          <p className="font-semibold text-slate-900 print:text-black">
                            {item.itemNameSnapshot}
                          </p>
                          {item.portionSize && (
                            <p className="text-[10px] text-slate-500 print:text-gray-600">
                              Portion: {item.portionSize}
                            </p>
                          )}
                        </td>
                        <td className="py-2 font-mono text-right text-slate-700 print:text-black">
                          ৳{item.lineTotalBdt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="border-t border-slate-200 pt-3 text-xs space-y-1 print:border-black print:text-black">
                <div className="flex justify-between text-slate-500 print:text-black">
                  <span>Subtotal</span>
                  <span className="font-mono">৳{selectedOrder.subtotalBdt}</span>
                </div>
                <div className="flex justify-between text-slate-500 print:text-black">
                  <span>Delivery Charge</span>
                  <span className="font-mono">৳{selectedOrder.deliveryFeeBdt}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-sm text-slate-900 print:border-black print:text-black">
                  <span>Total Amount Due</span>
                  <span className="font-mono text-[#D70F64] text-base print:text-black">
                    ৳{selectedOrder.totalBdt}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer (Hidden in Print) */}
            <div className="border-t border-slate-200 bg-slate-50 p-4 flex items-center justify-between print:hidden">
              <span className="text-[11px] text-slate-500">Change Status:</span>
              <div className="flex items-center gap-1.5">
                {(
                  [
                    "PENDING",
                    "CONFIRMED",
                    "PREPARING",
                    "OUT_FOR_DELIVERY",
                    "DELIVERED",
                    "CANCELLED",
                  ] as const
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={selectedOrder.status === st || updatingId === selectedOrder.id}
                    onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                    className={`rounded-lg px-2 py-1 text-[10px] font-bold transition cursor-pointer ${
                      selectedOrder.status === st
                        ? "bg-[#D70F64] text-white opacity-90 cursor-default shadow-xs"
                        : "border border-slate-200 bg-white text-slate-700 hover:border-[#D70F64] hover:text-[#D70F64]"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
