import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "../context/AuthContext"
import { useBodyScrollLock } from "../hooks/useBodyScrollLock"
import { useFocusTrap } from "../hooks/useFocusTrap"

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

interface OrderRecord {
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
}

interface OrderGroup {
  order: OrderRecord
  items: OrderItem[]
}

const ORDER_STEPS = [
  { key: "PENDING", label: "Pending" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PREPARING", label: "Preparing" },
  { key: "OUT_FOR_DELIVERY", label: "On the Way" },
  { key: "DELIVERED", label: "Delivered" },
] as const

function getStepIndex(status: string): number {
  switch (status) {
    case "PENDING":
      return 0
    case "CONFIRMED":
      return 1
    case "PREPARING":
      return 2
    case "OUT_FOR_DELIVERY":
      return 3
    case "DELIVERED":
      return 4
    default:
      return -1
  }
}

export function MyOrdersDrawer() {
  const { isMyOrdersOpen, closeMyOrders, user } = useAuth()
  const drawerRef = useRef<HTMLDivElement>(null)

  useBodyScrollLock(isMyOrdersOpen)
  useFocusTrap(drawerRef, isMyOrdersOpen)

  const [orders, setOrders] = useState<OrderGroup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/orders/my-orders", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      if (res.ok) {
        const body = await res.json()
        setOrders(body.data || [])
      } else {
        const body = await res.json().catch(() => null)
        setError(body?.error?.message || "Failed to load order history")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error fetching orders")
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (isMyOrdersOpen) {
      fetchOrders()
    }
  }, [isMyOrdersOpen, fetchOrders])

  // Listen for new orders placed during this session so they appear immediately
  useEffect(() => {
    const handleOrderPlaced = (e: Event) => {
      const customEvent = e as CustomEvent<OrderGroup>
      if (customEvent.detail?.order) {
        setOrders((prev) => [
          customEvent.detail,
          ...prev.filter((g) => g.order.id !== customEvent.detail.order.id),
        ])
      }
      fetchOrders()
    }
    window.addEventListener("banglar-biriyani:order-placed", handleOrderPlaced)
    return () => window.removeEventListener("banglar-biriyani:order-placed", handleOrderPlaced)
  }, [fetchOrders])

  // Escape key handler
  useEffect(() => {
    if (!isMyOrdersOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMyOrders()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isMyOrdersOpen, closeMyOrders])

  if (!isMyOrdersOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-orders-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity"
        onClick={closeMyOrders}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div ref={drawerRef} className="w-screen max-w-lg bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line px-6 py-4.5 bg-gradient-to-r from-white via-[#FDF2F7]/40 to-white">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-[#D70F64]/10 text-[#D70F64]">
                <svg
                  className="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                  <path d="M3 6h18" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </span>
              <div>
                <h2 id="my-orders-drawer-title" className="text-lg font-bold text-charcoal">
                  My Orders
                </h2>
                <p className="text-xs text-slate">
                  {user ? `Logged in as ${user.fullName}` : "Order Tracking"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchOrders}
                disabled={isLoading}
                className="grid size-9 place-items-center rounded-full text-slate transition hover:bg-alabaster hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D70F64]"
                aria-label="Refresh orders"
              >
                <svg
                  className={`size-4 ${isLoading ? "animate-spin text-[#D70F64]" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
              </button>

              <button
                type="button"
                onClick={closeMyOrders}
                className="grid size-9 place-items-center rounded-full text-slate transition hover:bg-alabaster hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D70F64]"
                aria-label="Close my orders drawer"
              >
                <svg
                  className="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading && orders.length === 0 ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div
                    key={n}
                    className="animate-pulse rounded-2xl border border-line p-4 space-y-3"
                  >
                    <div className="h-4 w-1/3 bg-slate/20 rounded" />
                    <div className="h-10 w-full bg-slate/10 rounded-xl" />
                    <div className="h-20 w-full bg-slate/10 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center">
                <p className="text-xs font-semibold text-rose-700">{error}</p>
                <button
                  type="button"
                  onClick={fetchOrders}
                  className="mt-3 inline-flex items-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                >
                  Try Again
                </button>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="flex size-16 items-center justify-center rounded-full bg-[#FDF2F7] text-[#D70F64]">
                  <svg
                    className="size-8"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                    <path d="M3 6h18" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                </span>
                <h3 className="mt-4 text-base font-bold text-charcoal">No orders yet</h3>
                <p className="mt-1 max-w-xs text-xs text-slate">
                  You haven't placed any orders with this account yet. Choose from our signature
                  Shahi Biriyanis or daily home-style meals!
                </p>
                <button
                  type="button"
                  onClick={() => {
                    closeMyOrders()
                    const menuEl = document.getElementById("menu")
                    menuEl?.scrollIntoView({ behavior: "smooth" })
                  }}
                  className="mt-5 rounded-full bg-[#D70F64] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#B80C55]"
                >
                  Browse Menu & Order
                </button>
              </div>
            ) : (
              orders.map(({ order, items }) => {
                const currentStepIndex = getStepIndex(order.status)
                const isCancelled = order.status === "CANCELLED"

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-line bg-white shadow-xs transition hover:border-[#D70F64]/40 hover:shadow-md"
                  >
                    {/* Order Top Summary */}
                    <div className="border-b border-line bg-alabaster/40 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-charcoal">
                              #{order.orderNumber}
                            </span>
                            <span className="rounded-full bg-[#D70F64]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#D70F64]">
                              {order.scheduledDay}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-slate">
                            {new Date(order.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            order.status === "DELIVERED"
                              ? "bg-emerald-100 text-emerald-800"
                              : order.status === "CANCELLED"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {order.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      {/* Delivery Slot info */}
                      <div className="mt-2.5 flex items-center gap-1.5 text-xs text-charcoal/80">
                        <svg
                          className="size-3.5 text-[#D70F64]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>
                          Slot: <strong>{order.deliverySlot}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Status Stepper (if not cancelled) */}
                    {!isCancelled ? (
                      <div className="border-b border-line bg-white px-4 py-3">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate">
                          {ORDER_STEPS.map((step, idx) => {
                            const isPassed = idx <= currentStepIndex
                            const isCurrent = idx === currentStepIndex

                            return (
                              <div
                                key={step.key}
                                className="flex flex-col items-center flex-1 text-center"
                              >
                                <div
                                  className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold transition ${
                                    isPassed
                                      ? "bg-[#D70F64] text-white shadow-xs"
                                      : "bg-alabaster text-slate border border-line"
                                  } ${isCurrent ? "ring-4 ring-[#D70F64]/20 animate-pulse" : ""}`}
                                >
                                  {isPassed ? "✓" : idx + 1}
                                </div>
                                <span
                                  className={`mt-1 text-[10px] leading-tight ${
                                    isPassed ? "text-charcoal font-bold" : "text-slate"
                                  }`}
                                >
                                  {step.label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="border-b border-rose-100 bg-rose-50/50 px-4 py-2 text-xs font-semibold text-rose-700">
                        This order was cancelled.
                      </div>
                    )}

                    {/* Itemized Receipt */}
                    <div className="p-4 space-y-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate">
                        Items Ordered ({items.length})
                      </p>
                      <div className="divide-y divide-line/60">
                        {items.map((it) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between py-2 text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              {it.imageUrl && (
                                <img
                                  src={it.imageUrl}
                                  alt={it.itemNameSnapshot}
                                  className="size-9 rounded-lg object-cover"
                                />
                              )}
                              <div>
                                <p className="font-semibold text-charcoal">{it.itemNameSnapshot}</p>
                                <p className="text-[11px] text-slate">
                                  ৳{it.unitPriceBdt} × {it.quantity}
                                </p>
                              </div>
                            </div>
                            <span className="font-bold text-charcoal">৳{it.lineTotalBdt}</span>
                          </div>
                        ))}
                      </div>

                      {/* Payment & Price Summary */}
                      <div className="border-t border-line pt-3 text-xs space-y-1 text-slate">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>৳{order.subtotalBdt}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Delivery Fee (Dhaka)</span>
                          <span>৳{order.deliveryFeeBdt}</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-1 text-sm font-bold text-charcoal">
                          <span>Total Amount</span>
                          <span className="text-[#D70F64] text-base">৳{order.totalBdt}</span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-between gap-1 pt-2 border-t border-line/60 text-[11px]">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span>
                              Payment: <strong>{order.paymentMethod}</strong>
                            </span>
                            {order.paymentTrxId && (
                              <span className="font-mono text-[10px] font-bold text-[#D70F64] bg-[#FDF2F7] px-1.5 py-0.5 rounded border border-[#D70F64]/20">
                                TrxID: {order.paymentTrxId}
                              </span>
                            )}
                            {(order.paymentMethod === "BKASH" ||
                              order.paymentMethod === "NAGAD" ||
                              order.paymentTrxId) && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                  order.isPaymentVerified
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {order.isPaymentVerified
                                  ? "Payment Verified ✓"
                                  : "Pending Verification"}
                              </span>
                            )}
                          </div>
                          <span className="max-w-[180px] truncate text-slate">
                            {order.customerAddress}
                          </span>
                        </div>

                        {order.notes && (
                          <p className="mt-1 text-[11px] italic text-slate/90">
                            Notes: "{order.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
