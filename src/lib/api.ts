import { type Product } from "../components/ProductCard"

export type DayOfWeek =
  | "SATURDAY"
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"

export interface DbHealth {
  ok: boolean
  serverTime?: string
  database?: string
  version?: string
  latencyMs?: number
  endpoint?: string
  error?: string
}

export interface Category {
  id: number
  name: string
  slug: string
  sortOrder: number
}

export interface MenuResponse {
  day: DayOfWeek
  items: Product[]
  categories?: Category[]
}

export interface OrderItemPayload {
  menuItemId: number | string
  quantity: number
}

export interface CreateOrderPayload {
  customerName: string
  customerPhone: string
  customerAddress: string
  scheduledDay: string
  deliverySlot: string
  paymentMethod: "COD" | "BKASH" | "NAGAD" | string
  notes?: string
  items: OrderItemPayload[]
}

export interface OrderResponse {
  success: boolean
  orderNumber: string
  customerName: string
  customerPhone: string
  customerAddress: string
  scheduledDay: string
  deliverySlot: string
  paymentMethod: string
  subtotalBdt: number
  deliveryFeeBdt: number
  totalBdt: number
  status: string
  createdAt: string
  items: any[]
}

export type Order = OrderResponse & {
  id?: number | string
  notes?: string | null
  totalAmount?: number
}

export async function fetchDbHealth(): Promise<DbHealth> {
  try {
    const res = await fetch("/api/health")
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.data ?? json
  } catch (err: any) {
    return { ok: false, error: err.message || "Failed to reach database API" }
  }
}

export async function fetchMenu(day?: string): Promise<MenuResponse> {
  const url = day ? `/api/menu?day=${encodeURIComponent(day)}` : "/api/menu"
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch menu: ${res.status}`)
  const json = await res.json()
  return json.data ?? json
}

export async function fetchDailyMenu(day: string): Promise<{ day: string; items: Product[] }> {
  const res = await fetch(`/api/menu/${encodeURIComponent(day.toLowerCase())}`)
  if (!res.ok) throw new Error(`Failed to fetch daily menu: ${res.status}`)
  const json = await res.json()
  return json.data ?? json
}

export async function fetchOrderByNumber(orderNumber: string): Promise<any> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`)
  if (!res.ok) throw new Error(`Order #${orderNumber} not found.`)
  const json = await res.json()
  return json.data ?? json
}

export async function fetchOrders(): Promise<any[]> {
  try {
    const res = await fetch("/api/orders")
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return json.data?.orders ?? json.data ?? (Array.isArray(json) ? json : [])
  } catch (err) {
    console.warn("Could not fetch orders from API:", err)
    return []
  }
}

export async function placeOrder(order: CreateOrderPayload): Promise<OrderResponse> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(
      errorData.error?.message ||
        errorData.error ||
        `Failed to create order (status: ${res.status})`,
    )
  }
  const json = await res.json()
  return json.data?.order ?? json.data ?? json
}

export async function updateOrderStatus(orderId: string | number, status: string): Promise<any> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error(`Failed to update order status`)
  return await res.json()
}
