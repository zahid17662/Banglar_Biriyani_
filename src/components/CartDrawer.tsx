import { useEffect, useRef, useState, useMemo } from "react"
import { useCart, type CartItem } from "../context/CartContext"
import { useBodyScrollLock } from "../hooks/useBodyScrollLock"
import { useFocusTrap } from "../hooks/useFocusTrap"

interface UpsellItem {
  id: number
  name: string
  priceBdt: number
  imageUrl: string
  portionSize?: string
  isEveryday: boolean
}

const FALLBACK_UPSELLS: UpsellItem[] = [
  {
    id: 13,
    name: "Shahi Borhani (500ml)",
    priceBdt: 80,
    imageUrl:
      "https://images.unsplash.com/photo-1692620609860-be6717812f71?auto=format&fit=crop&w=300&q=80",
    portionSize: "500 ml Bottle",
    isEveryday: true,
  },
  {
    id: 9,
    name: "Jali Kebab (2 pcs)",
    priceBdt: 100,
    imageUrl:
      "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=300&q=80",
    portionSize: "2 Pieces",
    isEveryday: true,
  },
  {
    id: 14,
    name: "Shahi Firni Cup",
    priceBdt: 70,
    imageUrl:
      "https://images.unsplash.com/photo-1705174299330-939dd03cc864?auto=format&fit=crop&w=300&q=80",
    portionSize: "1 Cup (150g)",
    isEveryday: true,
  },
  {
    id: 10,
    name: "Biye Bari Chicken Roast",
    priceBdt: 180,
    imageUrl:
      "https://images.unsplash.com/photo-1532636875304-0c89119d9b4d?auto=format&fit=crop&w=300&q=80",
    portionSize: "1 Leg Quarter",
    isEveryday: true,
  },
]

type Props = {
  isOpen?: boolean
  onClose?: () => void
  onProceedToCheckout?: () => void
}

export function CartDrawer({
  isOpen: propIsOpen,
  onClose: propOnClose,
  onProceedToCheckout,
}: Props) {
  const {
    items,
    activeDay,
    addItem,
    isCartOpen,
    setIsCartOpen,
    setIsCheckoutOpen,
    updateQuantity,
    removeItem,
    totalItems,
    subtotalBdt,
    deliveryFeeBdt,
    totalBdt,
  } = useCart()

  const isOpen = propIsOpen ?? isCartOpen
  const handleClose = propOnClose ?? (() => setIsCartOpen(false))
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  useBodyScrollLock(isOpen)
  useFocusTrap(drawerRef, isOpen)

  const [upsellCandidates, setUpsellCandidates] = useState<UpsellItem[]>([])
  const [addingId, setAddingId] = useState<number | null>(null)

  useEffect(() => {
    if (!isOpen) return
    let isMounted = true
    async function loadUpsellItems() {
      try {
        const res = await fetch(`/api/menu?day=${activeDay || "SATURDAY"}`)
        if (!res.ok) return
        const json = await res.json()
        const menuList = json.data?.items || []
        const everydayOnly = menuList.filter((item: any) => item.isEveryday)
        if (isMounted && everydayOnly.length > 0) {
          setUpsellCandidates(everydayOnly)
        }
      } catch (err) {
        console.warn("Could not load upsell items:", err)
      }
    }
    loadUpsellItems()
    return () => {
      isMounted = false
    }
  }, [isOpen, activeDay])

  const availableUpsells = useMemo(() => {
    const pool = upsellCandidates.length > 0 ? upsellCandidates : FALLBACK_UPSELLS
    return pool.filter((item) => !items.some((cartItem) => cartItem.menuItemId === item.id))
  }, [upsellCandidates, items])

  const handleAddUpsell = (item: UpsellItem) => {
    setAddingId(item.id)
    addItem(
      {
        id: item.id,
        menuItemId: item.id,
        name: item.name,
        priceBdt: item.priceBdt,
        price: item.priceBdt,
        imageUrl: item.imageUrl,
        portionSize: item.portionSize,
        isEveryday: true,
      },
      activeDay,
    )
    setTimeout(() => setAddingId(null), 600)
  }

  // Close on Escape key and focus close button on open
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    closeButtonRef.current?.focus()
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isOpen, handleClose])

  if (!isOpen) return null

  const formattedScheduledDay = activeDay
    ? `${activeDay.charAt(0).toUpperCase()}${activeDay.slice(1).toLowerCase()} Menu Order`
    : "Saturday Menu Order"

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      {/* Backdrop overlay */}
      <div className="fixed inset-0" onClick={handleClose} aria-hidden="true" />

      {/* Drawer content */}
      <div
        ref={drawerRef}
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-2.5">
            <h2 id="cart-drawer-title" className="text-display text-2xl text-charcoal">
              Your Cart
            </h2>
            <span className="rounded-full bg-[#FDF2F7] px-2.5 py-0.5 text-xs font-bold text-[#D70F64]">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </span>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="rounded-full p-2 text-slate transition hover:bg-alabaster hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D70F64] cursor-pointer"
            aria-label="Close cart drawer"
          >
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scheduled Day Banner */}
        <div className="flex items-center justify-between border-b border-[#D70F64]/15 bg-[#FDF2F7] px-6 py-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#D70F64]">
            <svg
              className="size-4 text-[#D70F64]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Scheduled Menu:</span>
          </div>
          <span className="text-display rounded-full bg-[#D70F64] px-3 py-1 text-xs font-semibold text-white shadow-xs">
            {formattedScheduledDay}
          </span>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-6" tabIndex={0} aria-label="Cart items list">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 grid size-16 place-items-center rounded-full bg-[#FDF2F7] text-[#D70F64]">
                <svg
                  className="size-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path d="M6 7h12l-1.2 11.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Zm3 0V6a3 3 0 0 1 6 0v1" />
                </svg>
              </div>
              <h3 className="text-display text-lg text-charcoal">Your cart is empty</h3>
              <p className="mt-1 max-w-xs text-sm text-slate">
                Select your favorite kacchi, tehari, or daily meal specials to start an order.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item: CartItem) => (
                <div
                  key={`${item.menuItemId}-${item.scheduledDay}`}
                  className="flex items-center gap-3 rounded-card border border-line bg-white p-3 shadow-xs transition hover:border-slate/30"
                >
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="size-16 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      className="grid size-16 shrink-0 place-items-center rounded-lg bg-[#FDF2F7] text-display text-xl text-[#D70F64]"
                      aria-label={item.name}
                    >
                      BB
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-semibold text-charcoal">{item.name}</h4>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs font-bold text-[#D70F64]">৳{item.priceBdt}</span>
                      <span className="text-[10px] text-slate">• {item.scheduledDay}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.menuItemId, item.scheduledDay, item.quantity - 1)
                      }
                      className="grid size-7 place-items-center rounded-full border border-line bg-alabaster text-sm font-semibold text-charcoal transition hover:border-[#D70F64] hover:bg-[#D70F64] hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D70F64]"
                      aria-label={`Decrease quantity of ${item.name}`}
                    >
                      -
                    </button>
                    <span
                      className="w-5 text-center text-sm font-semibold text-charcoal"
                      aria-label={`Quantity: ${item.quantity}`}
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(item.menuItemId, item.scheduledDay, item.quantity + 1)
                      }
                      className="grid size-7 place-items-center rounded-full border border-line bg-alabaster text-sm font-semibold text-charcoal transition hover:border-[#D70F64] hover:bg-[#D70F64] hover:text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D70F64]"
                      aria-label={`Increase quantity of ${item.name}`}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.menuItemId, item.scheduledDay)}
                      className="ml-1 p-1 text-slate transition hover:text-[#D70F64] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D70F64]"
                      title="Remove item"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer & Proceed to Checkout */}
        {items.length > 0 && (
          <div className="space-y-3 border-t border-line bg-white p-6">
            {/* One-Click "Complete Your Biriyani" Upsell Row */}
            {availableUpsells.length > 0 && (
              <div className="rounded-xl border border-[#D70F64]/15 bg-[#FDF2F7] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-charcoal">Complete Your Biriyani</span>
                    <span className="rounded-full bg-[#D70F64] px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-white">
                      Add-ons
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-slate">Pairs best</span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {availableUpsells.slice(0, 3).map((upsell) => (
                    <div
                      key={upsell.id}
                      className="flex min-w-[190px] flex-1 items-center gap-2 rounded-lg border border-line/60 bg-white p-2 shadow-2xs"
                    >
                      <img
                        src={upsell.imageUrl}
                        alt={upsell.name}
                        className="size-10 shrink-0 rounded-md bg-alabaster object-cover"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-xs font-semibold text-charcoal"
                          title={upsell.name}
                        >
                          {upsell.name}
                        </p>
                        <p className="font-mono text-xs font-bold text-[#D70F64]">
                          ৳{upsell.priceBdt}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddUpsell(upsell)}
                        disabled={addingId === upsell.id}
                        className="shrink-0 rounded-full bg-[#D70F64] px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs transition hover:bg-[#B80C55] active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D70F64]"
                      >
                        {addingId === upsell.id ? "✓" : "+ Add"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate">
                <span>Subtotal</span>
                <span className="font-medium text-charcoal">৳{subtotalBdt}</span>
              </div>
              <div className="flex justify-between text-slate">
                <span>Delivery Fee (Dhaka)</span>
                <span className="font-medium text-charcoal">৳{deliveryFeeBdt}</span>
              </div>
              <div className="flex justify-between border-t border-line/60 pt-2 text-base font-bold text-charcoal">
                <span>Estimated Total</span>
                <span className="text-display text-xl text-[#D70F64]">৳{totalBdt}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                handleClose()
                setIsCheckoutOpen(true)
                if (onProceedToCheckout) onProceedToCheckout()
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#D70F64] py-3 text-center text-sm font-semibold text-white shadow-md transition hover:bg-[#B80C55] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D70F64]/30 cursor-pointer"
            >
              <span>Proceed to Checkout</span>
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
