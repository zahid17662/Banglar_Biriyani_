import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react"
import type { Day } from "../components/DayPillBar"
import type { DayOfWeek, CartItem } from "../types/menu"
import { MultiDayWarningModal } from "../components/MultiDayWarningModal"

export type { CartItem }

export type AddItemInput = {
  id?: number | string
  menuItemId?: number
  name: string
  priceBdt?: number
  price?: number
  imageUrl?: string
  image?: string
  portionSize?: string
  isEveryday?: boolean
}

export type CartContextType = {
  items: CartItem[]
  activeDay: Day | DayOfWeek
  setActiveDay: (day: Day | DayOfWeek) => void
  isCartOpen: boolean
  setIsCartOpen: (open: boolean) => void
  isCheckoutOpen: boolean
  setIsCheckoutOpen: (open: boolean) => void
  addItem: (item: AddItemInput, day?: Day | DayOfWeek | string) => void
  decrementItem: (menuItemId: number, scheduledDay?: string) => void
  updateQuantity: (menuItemId: number, scheduledDay: string, quantity: number) => void
  removeItem: (menuItemId: number, scheduledDay?: string) => void
  clearCart: () => void
  totalItems: number
  subtotalBdt: number
  deliveryFeeBdt: number
  totalBdt: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const STORAGE_KEY = "banglar_biriyani_cart_v1"

function getInitialDay(): Day {
  const days: Day[] = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const dayName = days[new Date().getDay()]
  return dayName || "Saturday"
}

function isValidCartItem(item: unknown): item is CartItem {
  if (!item || typeof item !== "object") return false
  const candidate = item as Record<string, unknown>
  return (
    typeof candidate.menuItemId === "number" &&
    !isNaN(candidate.menuItemId) &&
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.priceBdt === "number" &&
    !isNaN(candidate.priceBdt) &&
    candidate.priceBdt >= 0 &&
    typeof candidate.scheduledDay === "string" &&
    candidate.scheduledDay.trim().length > 0 &&
    typeof candidate.quantity === "number" &&
    !isNaN(candidate.quantity) &&
    candidate.quantity > 0
  )
}

function parseStoredItems(): CartItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      localStorage.removeItem(STORAGE_KEY)
      return []
    }
    const validated = parsed.filter(isValidCartItem)
    if (validated.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validated))
    }
    return validated
  } catch (e) {
    console.error("Failed to parse cart items from localStorage, resetting cart:", e)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    return []
  }
}

interface PendingDaySwitch {
  currentDay: string
  newDay: string
  item: AddItemInput
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(parseStoredItems)
  const [activeDay, setActiveDay] = useState<Day | DayOfWeek>(getInitialDay)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [pendingDaySwitch, setPendingDaySwitch] = useState<PendingDaySwitch | null>(null)

  // Sync to localStorage under key 'banglar_biriyani_cart_v1'
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (e) {
      console.error("Failed to save cart to localStorage:", e)
    }
  }, [items])

  const doAddItem = useCallback((item: AddItemInput, targetDay: string) => {
    const rawId = item.menuItemId ?? item.id
    const numId =
      typeof rawId === "number" ? rawId : parseInt(String(rawId).replace(/\D/g, ""), 10) || 1
    const price = item.priceBdt ?? item.price ?? 0
    const image = item.imageUrl ?? item.image

    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.menuItemId === numId)

      if (existingIndex > -1) {
        const next = [...prev]
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        }
        return next
      }

      return [
        ...prev,
        {
          menuItemId: numId,
          name: item.name,
          priceBdt: price,
          imageUrl: image,
          scheduledDay: targetDay,
          quantity: 1,
          portionSize: item.portionSize,
          isEveryday: item.isEveryday,
        },
      ]
    })
  }, [])

  const addItem = useCallback(
    (item: AddItemInput, day?: Day | DayOfWeek | string) => {
      const targetDay = String(day || activeDay)
      doAddItem(item, targetDay)
    },
    [activeDay, doAddItem],
  )

  const handleConfirmClearAndAdd = useCallback(() => {
    if (pendingDaySwitch) {
      const { newDay, item } = pendingDaySwitch
      setItems([])
      setActiveDay(newDay as Day)
      doAddItem(item, newDay)
      setPendingDaySwitch(null)
    }
  }, [pendingDaySwitch, doAddItem])

  const updateQuantity = useCallback(
    (menuItemId: number, scheduledDay: string, quantity: number) => {
      setItems((prev) => {
        if (quantity <= 0) {
          return prev.filter(
            (i) =>
              !(
                i.menuItemId === menuItemId &&
                i.scheduledDay.toUpperCase() === scheduledDay.toUpperCase()
              ),
          )
        }
        return prev.map((i) => {
          if (
            i.menuItemId === menuItemId &&
            i.scheduledDay.toUpperCase() === scheduledDay.toUpperCase()
          ) {
            return { ...i, quantity }
          }
          return i
        })
      })
    },
    [],
  )

  const decrementItem = useCallback((menuItemId: number, scheduledDay?: string) => {
    setItems((prev) => {
      const match = prev.find(
        (i) =>
          i.menuItemId === menuItemId &&
          (!scheduledDay || i.scheduledDay.toUpperCase() === scheduledDay.toUpperCase()),
      )
      if (!match) return prev
      const targetDay = match.scheduledDay
      if (match.quantity <= 1) {
        return prev.filter(
          (i) =>
            !(
              i.menuItemId === menuItemId &&
              i.scheduledDay.toUpperCase() === targetDay.toUpperCase()
            ),
        )
      }
      return prev.map((i) => {
        if (
          i.menuItemId === menuItemId &&
          i.scheduledDay.toUpperCase() === targetDay.toUpperCase()
        ) {
          return { ...i, quantity: i.quantity - 1 }
        }
        return i
      })
    })
  }, [])

  const removeItem = useCallback((menuItemId: number, scheduledDay?: string) => {
    setItems((prev) =>
      prev.filter(
        (i) =>
          !(
            i.menuItemId === menuItemId &&
            (!scheduledDay || i.scheduledDay.toUpperCase() === scheduledDay.toUpperCase())
          ),
      ),
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items])

  const subtotalBdt = useMemo(
    () => items.reduce((sum, item) => sum + item.priceBdt * item.quantity, 0),
    [items],
  )

  const deliveryFeeBdt = totalItems > 0 ? 60 : 0
  const totalBdt = subtotalBdt + deliveryFeeBdt

  const value = {
    items,
    activeDay,
    setActiveDay,
    isCartOpen,
    setIsCartOpen,
    isCheckoutOpen,
    setIsCheckoutOpen,
    addItem,
    decrementItem,
    updateQuantity,
    removeItem,
    clearCart,
    totalItems,
    subtotalBdt,
    deliveryFeeBdt,
    totalBdt,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
      <MultiDayWarningModal
        isOpen={!!pendingDaySwitch}
        currentDay={(pendingDaySwitch?.currentDay || "") as Day}
        newDay={(pendingDaySwitch?.newDay || "") as Day}
        newProduct={
          pendingDaySwitch?.item
            ? {
                id: pendingDaySwitch.item.id ?? pendingDaySwitch.item.menuItemId ?? 0,
                name: pendingDaySwitch.item.name,
                price: pendingDaySwitch.item.priceBdt ?? pendingDaySwitch.item.price ?? 0,
                description: "",
              }
            : null
        }
        onConfirmClearAndAdd={handleConfirmClearAndAdd}
        onCancel={() => setPendingDaySwitch(null)}
      />
    </CartContext.Provider>
  )
}

export function useCart(): CartContextType {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
