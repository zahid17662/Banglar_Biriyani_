import { useState, useEffect, useRef, type FormEvent } from "react"
import { useCart } from "../context/CartContext"
import { useAddress } from "../context/AddressContext"
import { useAuth } from "../context/AuthContext"
import { useBodyScrollLock } from "../hooks/useBodyScrollLock"
import { useFocusTrap } from "../hooks/useFocusTrap"
import type { DayOfWeek, OrderDTO, OrderItemDTO } from "../types/menu"

type Props = {
  isOpen?: boolean
  onClose?: () => void
}

type DeliverySlot = "Lunch 12:30 PM - 2:30 PM" | "Dinner 7:30 PM - 9:30 PM" | "Express 45-60 mins"

type PaymentMethod = "COD" | "BKASH" | "NAGAD"

interface PlacedOrderState {
  order: OrderDTO
  items: OrderItemDTO[]
}

export function CheckoutModal({ isOpen: propIsOpen, onClose: propOnClose }: Props) {
  const {
    items,
    activeDay,
    subtotalBdt,
    deliveryFeeBdt,
    totalBdt,
    clearCart,
    isCheckoutOpen,
    setIsCheckoutOpen,
  } = useCart()
  const { selectedAddress, setIsAddressModalOpen, setFreeformAddress } = useAddress()
  const { user, openAuthModal, openMyOrders } = useAuth()

  const isOpen = propIsOpen ?? isCheckoutOpen
  const handleClose = propOnClose ?? (() => setIsCheckoutOpen(false))
  const modalRef = useRef<HTMLDivElement>(null)

  useBodyScrollLock(isOpen)
  useFocusTrap(modalRef, isOpen)

  const [customerName, setCustomerName] = useState(user?.fullName || "")
  const [customerPhone, setCustomerPhone] = useState(
    user?.phone || selectedAddress?.contactPhone || "",
  )
  const [customerAddress, setCustomerAddress] = useState(
    user?.defaultAddress || selectedAddress?.details || "",
  )
  const [saveForFuture, setSaveForFuture] = useState(true)

  // Pre-fill / synchronize customer info with auth user or selected address
  useEffect(() => {
    if (isOpen) {
      if (user) {
        if (user.fullName) setCustomerName(user.fullName)
        if (user.phone) setCustomerPhone(user.phone)
        if (selectedAddress?.details) {
          setCustomerAddress(selectedAddress.details)
        } else if (user.defaultAddress) {
          setCustomerAddress(user.defaultAddress)
        }
      } else if (selectedAddress) {
        if (selectedAddress.details) setCustomerAddress(selectedAddress.details)
        if (selectedAddress.contactPhone) setCustomerPhone(selectedAddress.contactPhone)
      }
    }
  }, [isOpen, user, selectedAddress])

  const [deliverySlot, setDeliverySlot] = useState<DeliverySlot>("Lunch 12:30 PM - 2:30 PM")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD")
  const [paymentTrxId, setPaymentTrxId] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({})
  const [placedOrder, setPlacedOrder] = useState<PlacedOrderState | null>(null)

  const nameInputRef = useRef<HTMLInputElement>(null)
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  // Escape key handler and focus management
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (placedOrder) {
          handleResetAndClose()
        } else {
          handleClose()
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)

    // Set initial focus
    if (placedOrder) {
      closeBtnRef.current?.focus()
    } else {
      nameInputRef.current?.focus()
    }

    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isOpen, placedOrder, handleClose])

  if (!isOpen) return null

  const handleResetAndClose = () => {
    setPlacedOrder(null)
    setGeneralError(null)
    setFieldErrors({})
    setPaymentTrxId("")
    handleClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setGeneralError(null)
    setFieldErrors({})

    if (items.length === 0) {
      setGeneralError("Your cart is empty. Please add items to checkout.")
      return
    }

    // Phone validation for Bangladesh (01XXXXXXXXX)
    const cleanPhone = customerPhone.replace(/[\s-]/g, "")
    const bdPhoneRegex = /^(?:\+?88)?01[3-9]\d{8}$/
    if (!bdPhoneRegex.test(cleanPhone)) {
      setFieldErrors({
        customerPhone: [
          "Please enter a valid 11-digit Bangladesh phone number (e.g., 01712345678).",
        ],
      })
      return
    }

    // Transaction ID validation for bKash and Nagad
    if (
      (paymentMethod === "BKASH" || paymentMethod === "NAGAD") &&
      (!paymentTrxId.trim() || paymentTrxId.trim().length < 4)
    ) {
      setFieldErrors({
        paymentTrxId: ["Please enter the valid Transaction ID (TrxID) received from your payment."],
      })
      return
    }

    const scheduledDayEnum = activeDay.toUpperCase() as DayOfWeek

    setSubmitting(true)

    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        customerAddress: customerAddress.trim(),
        scheduledDay: scheduledDayEnum,
        deliverySlot,
        paymentMethod,
        paymentTrxId:
          paymentMethod === "BKASH" || paymentMethod === "NAGAD"
            ? paymentTrxId.trim().toUpperCase()
            : undefined,
        notes: notes.trim() || undefined,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity,
        })),
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (res.status === 422 && json.error?.details) {
        setFieldErrors(json.error.details)
        setGeneralError(json.error.message || "Please correct the highlighted fields.")
        return
      }

      if (!res.ok) {
        const errorMsg =
          json.error?.message ||
          (typeof json.error === "string" ? json.error : null) ||
          `Failed to place order (HTTP ${res.status})`
        throw new Error(errorMsg)
      }

      // Success: 201 Created
      const orderData: OrderDTO = json.data?.order || json.order
      const orderItemsList: OrderItemDTO[] = json.data?.items || json.items || []

      setPlacedOrder({
        order: orderData,
        items: orderItemsList,
      })
      clearCart()

      // Notify order listeners (e.g. MyOrdersDrawer) immediately without page reload
      window.dispatchEvent(
        new CustomEvent("banglar-biriyani:order-placed", {
          detail: { order: orderData, items: orderItemsList },
        }),
      )

      if (saveForFuture && customerAddress.trim()) {
        try {
          setFreeformAddress(customerAddress.trim(), "Home")
        } catch {}
      }
    } catch (err: any) {
      console.error("Order submission error:", err)
      setGeneralError(
        err.message || "Failed to submit order. Please check your connection and try again.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby={placedOrder ? "order-confirmation-title" : "checkout-modal-title"}
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0"
        onClick={placedOrder ? handleResetAndClose : handleClose}
        aria-hidden="true"
      />

      <div
        ref={modalRef}
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-card bg-white shadow-2xl"
      >
        {/* If order has been placed, show Celebratory Confirmation Receipt view */}
        {placedOrder ? (
          <div className="flex flex-col overflow-y-auto p-6 sm:p-8">
            <div className="text-center">
              <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-[#FDF2F7] text-[#D70F64] shadow-sm">
                <svg
                  className="size-8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <h2
                id="order-confirmation-title"
                className="text-display text-2xl text-charcoal sm:text-3xl"
              >
                Order Placed Successfully!
              </h2>
              <p className="mt-1 text-sm font-medium text-[#D70F64]">অর্ডার সফলভাবে গ্রহণ করা হয়েছে</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#D70F64]/30 bg-[#FDF2F7] px-4 py-1.5">
                <span className="text-xs text-slate">Order Number:</span>
                <span
                  id="confirmation-order-number"
                  className="font-mono text-sm font-bold text-[#D70F64]"
                >
                  {placedOrder.order.orderNumber}
                </span>
              </div>
            </div>

            {/* Receipt Summary Card */}
            <div className="mt-6 space-y-3 rounded-card border border-line bg-alabaster p-4 text-xs">
              <div className="flex items-center justify-between border-b border-line/60 pb-2">
                <span className="font-semibold uppercase tracking-wider text-slate">
                  Scheduled Delivery
                </span>
                <span className="rounded-full bg-[#D70F64] px-2.5 py-0.5 font-bold text-white">
                  {placedOrder.order.scheduledDay} • {placedOrder.order.deliverySlot}
                </span>
              </div>

              <div>
                <span className="font-semibold uppercase tracking-wider text-slate">
                  Deliver To
                </span>
                <p className="mt-0.5 text-sm font-semibold text-charcoal">
                  {placedOrder.order.customerName}
                </p>
                <p className="font-mono text-slate">{placedOrder.order.customerPhone}</p>
                <p className="text-slate">{placedOrder.order.customerAddress}</p>
              </div>

              <div className="border-t border-line/60 pt-2">
                <span className="font-semibold uppercase tracking-wider text-slate">
                  Itemized Summary
                </span>
                <ul className="mt-1.5 space-y-1">
                  {placedOrder.items.map((item) => (
                    <li key={item.id} className="flex justify-between text-charcoal">
                      <span>
                        {item.quantity}x {item.itemNameSnapshot}
                      </span>
                      <span className="font-mono font-medium">৳{item.lineTotalBdt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1 border-t border-line/60 pt-2">
                <div className="flex justify-between text-slate">
                  <span>Subtotal</span>
                  <span className="font-mono">৳{placedOrder.order.subtotalBdt}</span>
                </div>
                <div className="flex justify-between text-slate">
                  <span>Delivery Fee</span>
                  <span className="font-mono">৳{placedOrder.order.deliveryFeeBdt}</span>
                </div>
                <div className="flex justify-between border-t border-line/40 pt-1 text-sm font-bold text-charcoal">
                  <span>Total Due</span>
                  <span className="text-display text-base text-[#D70F64]">
                    ৳{placedOrder.order.totalBdt}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 rounded-lg border border-line/50 bg-white p-2.5 text-[11px] text-slate">
                <div>
                  <span className="font-semibold text-charcoal">Payment Method: </span>
                  {placedOrder.order.paymentMethod === "COD" &&
                    "Cash on Delivery (Pay when food arrives hot)"}
                  {placedOrder.order.paymentMethod === "BKASH" && "bKash Mobile Wallet"}
                  {placedOrder.order.paymentMethod === "NAGAD" && "Nagad Mobile Wallet"}
                </div>
                {placedOrder.order.paymentTrxId && (
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line/40">
                    <span className="font-semibold text-charcoal">TrxID:</span>
                    <span className="font-mono font-bold text-[#D70F64] tracking-wider">
                      {placedOrder.order.paymentTrxId}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        placedOrder.order.isPaymentVerified
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {placedOrder.order.isPaymentVerified ? "Verified ✓" : "Pending Verification"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              {user && (
                <button
                  type="button"
                  onClick={() => {
                    handleResetAndClose()
                    openMyOrders()
                  }}
                  className="flex-1 rounded-full border border-[#D70F64] py-3 text-center text-sm font-semibold text-[#D70F64] transition hover:bg-[#FDF2F7] cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D70F64]/30"
                >
                  View in My Orders
                </button>
              )}
              <button
                ref={closeBtnRef}
                type="button"
                onClick={handleResetAndClose}
                className={`${user ? "flex-1" : "w-full"} rounded-full bg-[#D70F64] py-3 text-center text-sm font-semibold text-white shadow-md transition hover:bg-[#B80C55] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D70F64]/30 cursor-pointer`}
              >
                Done / Continue Browsing
              </button>
            </div>
          </div>
        ) : (
          /* Checkout Form */
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line bg-[#D70F64] px-6 py-4 text-white">
              <div>
                <h2 id="checkout-modal-title" className="text-display text-xl text-white">
                  Complete Your Order
                </h2>
                <p className="text-xs text-white/80">
                  Pre-order feast for <span className="font-bold underline">{activeDay}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="grid size-8 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                aria-label="Close checkout modal"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form
              id="checkout-form"
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-6 space-y-4"
              noValidate
            >
              {generalError && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700"
                >
                  {generalError}
                </div>
              )}

              {/* Account Quick Sign-in Prompt for Guest Users */}
              {!user && (
                <div className="flex items-center justify-between rounded-xl border border-[#D70F64]/20 bg-[#FDF2F7] px-3.5 py-2.5 text-xs transition">
                  <div className="flex items-center gap-2 text-charcoal">
                    <svg
                      className="size-4 shrink-0 text-[#D70F64]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <span>
                      Have an account?{" "}
                      <span className="font-semibold text-[#D70F64]">
                        Sign in for 1-click checkout
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAuthModal("login")}
                    className="shrink-0 rounded-full bg-[#D70F64] px-3 py-1 text-xs font-semibold text-white shadow-xs transition hover:bg-[#B80C55] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D70F64]/40"
                  >
                    Sign In
                  </button>
                </div>
              )}

              {/* Logged-in User Indicator */}
              {user && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    Ordering as{" "}
                    <strong className="font-semibold text-charcoal">{user.fullName}</strong> (
                    {user.phone})
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                    Auto-Filled
                  </span>
                </div>
              )}

              {/* Customer info */}
              <div className="space-y-3">
                <h3 className="text-display text-sm tracking-wider text-charcoal">
                  1. Customer Details
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="checkout-customer-name"
                      className="mb-1 block text-xs font-semibold text-slate"
                    >
                      Customer Name *
                    </label>
                    <input
                      ref={nameInputRef}
                      id="checkout-customer-name"
                      name="customerName"
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => {
                        setCustomerName(e.target.value)
                        if (fieldErrors.customerName) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            customerName: undefined,
                          }))
                        }
                      }}
                      aria-invalid={!!fieldErrors.customerName}
                      aria-describedby={
                        fieldErrors.customerName ? "error-customer-name" : undefined
                      }
                      className={`w-full rounded-lg border bg-alabaster px-3 py-2 text-sm outline-none transition focus:bg-white ${
                        fieldErrors.customerName
                          ? "border-rose-500 focus:border-rose-500"
                          : "border-line focus:border-[#D70F64]"
                      }`}
                      placeholder="e.g. Zahid Hassan"
                    />
                    {fieldErrors.customerName && (
                      <p
                        id="error-customer-name"
                        role="alert"
                        className="mt-1 text-xs font-medium text-rose-600"
                      >
                        {fieldErrors.customerName[0]}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-customer-phone"
                      className="mb-1 block text-xs font-semibold text-slate"
                    >
                      Bangladesh Phone Number (01XXXXXXXXX) *
                    </label>
                    <input
                      id="checkout-customer-phone"
                      name="customerPhone"
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => {
                        setCustomerPhone(e.target.value)
                        if (fieldErrors.customerPhone) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            customerPhone: undefined,
                          }))
                        }
                      }}
                      aria-invalid={!!fieldErrors.customerPhone}
                      aria-describedby={
                        fieldErrors.customerPhone ? "error-customer-phone" : undefined
                      }
                      className={`w-full rounded-lg border bg-alabaster px-3 py-2 text-sm outline-none transition focus:bg-white ${
                        fieldErrors.customerPhone
                          ? "border-rose-500 focus:border-rose-500"
                          : "border-line focus:border-[#D70F64]"
                      }`}
                      placeholder="017XXXXXXXX"
                    />
                    {fieldErrors.customerPhone && (
                      <p
                        id="error-customer-phone"
                        role="alert"
                        className="mt-1 text-xs font-medium text-rose-600"
                      >
                        {fieldErrors.customerPhone[0]}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="checkout-customer-address"
                      className="text-xs font-semibold text-slate"
                    >
                      Full Delivery Address (Dhaka) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddressModalOpen(true)}
                      className="cursor-pointer text-xs font-semibold text-[#D70F64] hover:underline"
                    >
                      {selectedAddress
                        ? `📍 Change Address (${selectedAddress.label})`
                        : "📍 Choose Saved Address"}
                    </button>
                  </div>
                  <textarea
                    id="checkout-customer-address"
                    name="customerAddress"
                    required
                    rows={2}
                    value={customerAddress}
                    onChange={(e) => {
                      setCustomerAddress(e.target.value)
                      if (fieldErrors.customerAddress) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          customerAddress: undefined,
                        }))
                      }
                    }}
                    aria-invalid={!!fieldErrors.customerAddress}
                    aria-describedby={
                      fieldErrors.customerAddress ? "error-customer-address" : undefined
                    }
                    className={`w-full rounded-lg border bg-alabaster px-3 py-2 text-sm outline-none transition focus:bg-white ${
                      fieldErrors.customerAddress
                        ? "border-rose-500 focus:border-rose-500"
                        : "border-line focus:border-[#D70F64]"
                    }`}
                    placeholder="House, road, flat no, area..."
                  />
                  {fieldErrors.customerAddress && (
                    <p
                      id="error-customer-address"
                      role="alert"
                      className="mt-1 text-xs font-medium text-rose-600"
                    >
                      {fieldErrors.customerAddress[0]}
                    </p>
                  )}
                  <label
                    htmlFor="checkout-save-future"
                    className="mt-1.5 flex cursor-pointer items-center gap-1.5"
                  >
                    <input
                      id="checkout-save-future"
                      type="checkbox"
                      checked={saveForFuture}
                      onChange={(e) => setSaveForFuture(e.target.checked)}
                      className="size-3.5 rounded border-line text-[#D70F64] focus:ring-[#D70F64]"
                    />
                    <span className="text-[11px] text-slate">
                      Save this address to my saved locations
                    </span>
                  </label>
                </div>
              </div>

              {/* Delivery Slot */}
              <fieldset className="border-t border-line pt-2 space-y-2">
                <legend className="text-display text-sm tracking-wider text-charcoal">
                  2. Delivery Time Slot
                </legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <label
                    htmlFor="slot-lunch"
                    className={`flex cursor-pointer flex-col rounded-lg border p-2.5 text-xs transition ${
                      deliverySlot === "Lunch 12:30 PM - 2:30 PM"
                        ? "border-[#D70F64] bg-[#FDF2F7] font-bold text-[#D70F64]"
                        : "border-line bg-alabaster text-charcoal hover:border-slate/40"
                    }`}
                  >
                    <input
                      id="slot-lunch"
                      type="radio"
                      name="deliverySlot"
                      value="Lunch 12:30 PM - 2:30 PM"
                      checked={deliverySlot === "Lunch 12:30 PM - 2:30 PM"}
                      onChange={() => setDeliverySlot("Lunch 12:30 PM - 2:30 PM")}
                      className="sr-only"
                    />
                    <span>Lunch</span>
                    <span className="text-[10px] font-normal text-slate">12:30 PM – 2:30 PM</span>
                  </label>

                  <label
                    htmlFor="slot-dinner"
                    className={`flex cursor-pointer flex-col rounded-lg border p-2.5 text-xs transition ${
                      deliverySlot === "Dinner 7:30 PM - 9:30 PM"
                        ? "border-[#D70F64] bg-[#FDF2F7] font-bold text-[#D70F64]"
                        : "border-line bg-alabaster text-charcoal hover:border-slate/40"
                    }`}
                  >
                    <input
                      id="slot-dinner"
                      type="radio"
                      name="deliverySlot"
                      value="Dinner 7:30 PM - 9:30 PM"
                      checked={deliverySlot === "Dinner 7:30 PM - 9:30 PM"}
                      onChange={() => setDeliverySlot("Dinner 7:30 PM - 9:30 PM")}
                      className="sr-only"
                    />
                    <span>Dinner</span>
                    <span className="text-[10px] font-normal text-slate">7:30 PM – 9:30 PM</span>
                  </label>

                  <label
                    htmlFor="slot-express"
                    className={`flex cursor-pointer flex-col rounded-lg border p-2.5 text-xs transition ${
                      deliverySlot === "Express 45-60 mins"
                        ? "border-[#D70F64] bg-[#FDF2F7] font-bold text-[#D70F64]"
                        : "border-line bg-alabaster text-charcoal hover:border-slate/40"
                    }`}
                  >
                    <input
                      id="slot-express"
                      type="radio"
                      name="deliverySlot"
                      value="Express 45-60 mins"
                      checked={deliverySlot === "Express 45-60 mins"}
                      onChange={() => setDeliverySlot("Express 45-60 mins")}
                      className="sr-only"
                    />
                    <span>Express</span>
                    <span className="text-[10px] font-normal text-slate">45-60 mins</span>
                  </label>
                </div>
              </fieldset>

              {/* Payment Method */}
              <fieldset className="border-t border-line pt-2 space-y-2">
                <legend className="text-display text-sm tracking-wider text-charcoal">
                  3. Payment Method
                </legend>
                <div className="grid grid-cols-3 gap-2">
                  <label
                    htmlFor="pay-cod"
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border p-2.5 text-center text-xs transition ${
                      paymentMethod === "COD"
                        ? "border-[#D70F64] bg-[#FDF2F7] font-bold text-[#D70F64]"
                        : "border-line bg-alabaster text-charcoal hover:border-slate/40"
                    }`}
                  >
                    <input
                      id="pay-cod"
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === "COD"}
                      onChange={() => setPaymentMethod("COD")}
                      className="sr-only"
                    />
                    <span>Cash on Delivery</span>
                  </label>

                  <label
                    htmlFor="pay-bkash"
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border p-2.5 text-center text-xs transition ${
                      paymentMethod === "BKASH"
                        ? "border-[#D70F64] bg-[#FDF2F7] font-bold text-[#D70F64]"
                        : "border-line bg-alabaster text-charcoal hover:border-slate/40"
                    }`}
                  >
                    <input
                      id="pay-bkash"
                      type="radio"
                      name="paymentMethod"
                      value="BKASH"
                      checked={paymentMethod === "BKASH"}
                      onChange={() => setPaymentMethod("BKASH")}
                      className="sr-only"
                    />
                    <span className="font-bold text-[#D70F64]">bKash</span>
                  </label>

                  <label
                    htmlFor="pay-nagad"
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border p-2.5 text-center text-xs transition ${
                      paymentMethod === "NAGAD"
                        ? "border-[#F7941D] bg-orange-50 font-bold text-[#F7941D]"
                        : "border-line bg-alabaster text-charcoal hover:border-slate/40"
                    }`}
                  >
                    <input
                      id="pay-nagad"
                      type="radio"
                      name="paymentMethod"
                      value="NAGAD"
                      checked={paymentMethod === "NAGAD"}
                      onChange={() => setPaymentMethod("NAGAD")}
                      className="sr-only"
                    />
                    <span className="font-bold text-[#F7941D]">Nagad</span>
                  </label>
                </div>

                {/* bKash / Nagad Send Money Instructions & Required TrxID Field */}
                {(paymentMethod === "BKASH" || paymentMethod === "NAGAD") && (
                  <div className="mt-3 rounded-xl border border-[#D70F64]/20 bg-[#FDF2F7] p-3.5 space-y-3 transition animate-in fade-in">
                    <div className="flex items-start gap-2.5">
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[#D70F64] text-xs font-bold text-white shadow-xs">
                        ৳
                      </div>
                      <div className="text-xs">
                        <p className="font-bold text-charcoal">
                          Send Money to Banglar Biriyani{" "}
                          {paymentMethod === "BKASH" ? "bKash" : "Nagad"} Account:
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded-md border border-[#D70F64]/30 bg-white px-2.5 py-0.5 font-mono text-sm font-bold text-[#D70F64] select-all">
                            01711-000001
                          </span>
                          <span className="text-[11px] text-slate">(Personal / Send Money)</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate leading-relaxed">
                          Please send the exact total of{" "}
                          <strong className="font-bold text-charcoal">৳{totalBdt}</strong> to the
                          number above and enter your Transaction ID (TrxID) below.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="checkout-payment-trxid"
                        className="mb-1 block text-xs font-bold text-charcoal"
                      >
                        {paymentMethod === "BKASH" ? "bKash" : "Nagad"} Transaction ID (TrxID) *
                      </label>
                      <input
                        id="checkout-payment-trxid"
                        name="paymentTrxId"
                        type="text"
                        required
                        value={paymentTrxId}
                        onChange={(e) => {
                          setPaymentTrxId(e.target.value.toUpperCase())
                          if (fieldErrors.paymentTrxId) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              paymentTrxId: undefined,
                            }))
                          }
                        }}
                        aria-invalid={!!fieldErrors.paymentTrxId}
                        aria-describedby={
                          fieldErrors.paymentTrxId ? "error-payment-trxid" : undefined
                        }
                        placeholder={
                          paymentMethod === "BKASH" ? "e.g. 9J4K2L8M1N" : "e.g. 7B9X2Y4Z"
                        }
                        className={`w-full rounded-lg border bg-white px-3 py-2 font-mono text-sm uppercase tracking-wider outline-none transition ${
                          fieldErrors.paymentTrxId
                            ? "border-rose-500 focus:border-rose-500"
                            : "border-line focus:border-[#D70F64]"
                        }`}
                      />
                      {fieldErrors.paymentTrxId && (
                        <p
                          id="error-payment-trxid"
                          role="alert"
                          className="mt-1 text-xs font-medium text-rose-600"
                        >
                          {fieldErrors.paymentTrxId[0]}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </fieldset>

              {/* Order Notes */}
              <div className="border-t border-line pt-2">
                <label
                  htmlFor="checkout-notes"
                  className="mb-1 block text-xs font-semibold text-slate"
                >
                  Special Notes (Optional)
                </label>
                <input
                  id="checkout-notes"
                  name="notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-line bg-alabaster px-3 py-2 text-sm outline-none transition focus:border-[#D70F64] focus:bg-white"
                  placeholder="e.g. Less spicy, extra cucumber salad, pack spoons"
                />
              </div>

              {/* Breakdown */}
              <div className="space-y-1.5 rounded-lg border border-line bg-alabaster p-3 text-xs">
                <div className="flex justify-between text-slate">
                  <span>Subtotal ({items.length} items)</span>
                  <span className="font-mono">৳{subtotalBdt}</span>
                </div>
                <div className="flex justify-between text-slate">
                  <span>Delivery Fee</span>
                  <span className="font-mono">৳{deliveryFeeBdt}</span>
                </div>
                <div className="flex justify-between border-t border-line/60 pt-1 text-sm font-bold text-charcoal">
                  <span>Total Due</span>
                  <span className="text-display text-[#D70F64]">৳{totalBdt}</span>
                </div>
              </div>
            </form>

            {/* Actions */}
            <div className="flex gap-3 border-t border-line bg-white p-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-full border border-line py-2.5 text-sm font-semibold text-charcoal transition hover:bg-alabaster cursor-pointer"
              >
                Back to Cart
              </button>
              <button
                type="submit"
                form="checkout-form"
                disabled={submitting}
                className="flex-[2] flex items-center justify-center gap-2 rounded-full bg-[#D70F64] py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[#B80C55] disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D70F64]/30"
              >
                {submitting ? (
                  <>
                    <svg
                      className="size-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                    </svg>
                    <span>Placing Order in Neon...</span>
                  </>
                ) : (
                  <span>Confirm Order (৳{totalBdt})</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
