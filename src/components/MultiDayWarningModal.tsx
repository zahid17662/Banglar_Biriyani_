import { useEffect } from "react"
import { type Day } from "./DayPillBar"
import { type Product } from "./ProductCard"
import { useBodyScrollLock } from "../hooks/useBodyScrollLock"

type Props = {
  isOpen: boolean
  currentDay: Day
  newDay: Day
  newProduct: Product | null
  onConfirmClearAndAdd: () => void
  onCancel: () => void
}

export function MultiDayWarningModal({
  isOpen,
  currentDay,
  newDay,
  newProduct,
  onConfirmClearAndAdd,
  onCancel,
}: Props) {
  useBodyScrollLock(isOpen)

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="multiday-modal-title"
    >
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="grid size-10 place-items-center rounded-full bg-amber-100 text-amber-700">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <h3 id="multiday-modal-title" className="text-display text-lg text-charcoal">
              Different Delivery Day
            </h3>
            <p className="text-xs text-slate">Orders are fulfilled per scheduled day</p>
          </div>
        </div>

        <p className="text-sm text-slate leading-relaxed">
          Your cart currently contains delicious items scheduled for{" "}
          <strong className="text-charcoal">{currentDay}</strong>. You are attempting to add{" "}
          <strong className="text-[#D70F64]">"{newProduct?.name}"</strong> which is scheduled for{" "}
          <strong className="text-charcoal">{newDay}</strong>.
        </p>

        <p className="text-xs text-slate/80 mt-2 bg-alabaster p-2.5 rounded-lg border border-line">
          To ensure fresh dum preparation and on-time hot delivery, orders cannot mix dishes
          scheduled across different days.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-full border border-line py-2.5 text-xs font-semibold text-charcoal hover:bg-alabaster transition cursor-pointer"
          >
            Keep {currentDay} Cart
          </button>
          <button
            type="button"
            onClick={onConfirmClearAndAdd}
            className="flex-1 rounded-full bg-[#D70F64] py-2.5 text-xs font-semibold text-white hover:bg-[#B80C55] transition shadow-sm cursor-pointer"
          >
            Start New {newDay} Cart
          </button>
        </div>
      </div>
    </div>
  )
}
