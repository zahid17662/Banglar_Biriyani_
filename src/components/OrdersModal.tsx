import { useEffect, useState } from "react"
import { fetchOrders, updateOrderStatus, type Order } from "../lib/api"

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function OrdersModal({ isOpen, onClose }: Props) {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const data = await fetchOrders()
    setOrders(data)
    setLoading(false)
  }

  useEffect(() => {
    if (isOpen) {
      load()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    try {
      await updateOrderStatus(id, newStatus)
      await load()
    } catch (err) {
      alert("Failed to update order status")
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-100 text-emerald-800 border-emerald-300"
      case "Out for Delivery":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "Preparing":
        return "bg-amber-100 text-amber-800 border-amber-300"
      case "Confirmed":
        return "bg-brand-light text-brand border-brand/30"
      default:
        return "bg-purple-100 text-purple-800 border-purple-300"
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-card bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-charcoal px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            </div>
            <div>
              <h2 className="text-display text-xl text-white">Neon PostgreSQL — Orders Table</h2>
              <p className="text-xs text-white/70">
                Live records queried via{" "}
                <code className="font-mono text-emerald-300">Drizzle ORM</code> from Neon Serverless
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="grid size-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              title="Refresh records"
            >
              <svg
                className={`size-4 ${loading ? "animate-spin" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && orders.length === 0 ? (
            <div className="py-20 text-center text-slate">
              <svg
                className="mx-auto size-8 animate-spin text-brand mb-2"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
              </svg>
              <p>Fetching records from Neon PostgreSQL...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-slate">
              <p className="text-base font-semibold">No orders found.</p>
              <p className="text-xs text-slate mt-1">
                Place an order to see it stored in Neon PostgreSQL.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((ord) => {
                const itemsList = Array.isArray(ord.items) ? ord.items : []
                return (
                  <div
                    key={ord.id}
                    className="rounded-xl border border-line bg-alabaster p-4 shadow-sm hover:border-slate/40 transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-charcoal">
                          {ord.orderNumber || ord.id}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(ord.status)}`}
                        >
                          {ord.status}
                        </span>
                        {ord.scheduledDay && (
                          <span className="rounded-full bg-charcoal text-white px-2 py-0.5 text-[10px] font-semibold">
                            {ord.scheduledDay} ({ord.deliverySlot})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate">
                        {ord.createdAt ? new Date(ord.createdAt).toLocaleString() : "Recent"}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="block font-semibold text-slate uppercase text-[10px] tracking-wider">
                          Customer
                        </span>
                        <p className="font-medium text-charcoal text-sm">{ord.customerName}</p>
                        <p className="text-slate font-mono">{ord.customerPhone}</p>
                        <p className="text-slate mt-0.5 line-clamp-2">{ord.customerAddress}</p>
                        {ord.paymentMethod && (
                          <p className="mt-1 text-[11px] font-semibold text-brand">
                            Payment: {ord.paymentMethod}
                          </p>
                        )}
                      </div>

                      <div>
                        <span className="block font-semibold text-slate uppercase text-[10px] tracking-wider">
                          Items Ordered
                        </span>
                        <ul className="mt-1 space-y-1">
                          {itemsList.map((item: any, idx: number) => (
                            <li key={idx} className="flex justify-between text-charcoal">
                              <span>
                                {item.quantity}x {item.name || item.itemNameSnapshot}
                              </span>
                              <span className="font-mono font-medium">
                                ৳{(item.price || item.unitPriceBdt) * item.quantity}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {ord.notes && (
                          <p className="mt-2 text-[11px] text-amber-800 bg-amber-50 rounded px-2 py-1 border border-amber-200">
                            <strong>Note:</strong> {ord.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col justify-between items-end md:border-l md:border-line/60 md:pl-4">
                        <div className="text-right">
                          <span className="block font-semibold text-slate uppercase text-[10px] tracking-wider">
                            Total Amount
                          </span>
                          <span className="text-display text-2xl text-brand">
                            ৳{ord.totalBdt ?? ord.totalAmount}
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-1.5">
                          <label className="text-[11px] font-medium text-slate">Status:</label>
                          <select
                            value={ord.status}
                            disabled={updatingId === ord.id}
                            onChange={(e) =>
                              handleStatusChange(String(ord.id ?? ord.orderNumber), e.target.value)
                            }
                            className="rounded border border-line bg-white px-2 py-1 text-xs font-medium focus:border-brand focus:outline-none"
                          >
                            <option value="Confirmed">Confirmed</option>
                            <option value="Preparing">Preparing</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line bg-alabaster px-6 py-3 text-xs text-slate">
          <span>
            Total orders: <strong>{orders.length}</strong>
          </span>
          <span>
            Database: <strong>Neon Serverless PostgreSQL (Singapore Region)</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
