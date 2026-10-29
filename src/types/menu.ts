/**
 * Strongly typed DTOs and Data Contracts for Banglar Biriyani
 */

export const DAYS_OF_WEEK = [
  "SATURDAY",
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
] as const

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

export interface MenuItemDTO {
  id: number
  categoryId: number
  categoryName: string
  categorySlug: string
  name: string
  description: string
  basePriceBdt: number
  specialPriceBdt: number | null
  priceBdt: number
  imageUrl: string
  portionSize: string
  spiceLevel: string
  rating: string
  isEveryday: boolean
  isAvailable: boolean
  isFeatured?: boolean
  dailyQuota?: number
  soldCount?: number
  remainingPortions?: number
  categorySortOrder?: number
}

export interface DayMenuScheduleDTO {
  day: DayOfWeek
  count: number
  items: MenuItemDTO[]
}

export interface MenuResponseDTO {
  days: Record<DayOfWeek, MenuItemDTO[]>
}

export interface CartItem {
  menuItemId: number
  name: string
  priceBdt: number
  imageUrl?: string
  scheduledDay: DayOfWeek | string
  quantity: number
  portionSize?: string
  isEveryday?: boolean
}

export interface CreateOrderItemPayload {
  menuItemId: number
  quantity: number
}

export interface CreateOrderPayload {
  customerName: string
  customerPhone: string
  customerAddress: string
  scheduledDay: DayOfWeek
  deliverySlot?: string
  paymentMethod?: "COD" | "BKASH" | "NAGAD"
  paymentTrxId?: string | null
  notes?: string | null
  items: CreateOrderItemPayload[]
}

export interface OrderDTO {
  id: number
  orderNumber: string
  customerName: string
  customerPhone: string
  customerAddress: string
  scheduledDay: DayOfWeek
  deliverySlot: string
  paymentMethod: "COD" | "BKASH" | "NAGAD"
  paymentTrxId?: string | null
  isPaymentVerified?: boolean
  subtotalBdt: number
  deliveryFeeBdt: number
  totalBdt: number
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED"
  notes?: string | null
  createdAt: string
}

export interface OrderItemDTO {
  id: number
  orderId: number
  menuItemId: number
  scheduledDay: DayOfWeek
  itemNameSnapshot: string
  quantity: number
  unitPriceBdt: number
  lineTotalBdt: number
  imageUrl?: string
  portionSize?: string
}

export interface OrderConfirmationDTO {
  order: OrderDTO
  items: OrderItemDTO[]
}
