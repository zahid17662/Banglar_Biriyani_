import { useState } from "react"
import { useCart } from "../context/CartContext"

export type Product = {
  id: string | number
  name: string
  banglaName?: string
  description: string
  price: number
  basePriceBdt?: number
  image?: string
  bestseller?: boolean
  portionSize?: string
  remainingPortions?: number
  dailyQuota?: number
  day?: string
}

export function ProductCard({
  product,
  onAdd,
  isHighlighted = false,
}: {
  product: Product
  onAdd?: (p: Product) => void
  isHighlighted?: boolean
}) {
  const { addItem, activeDay } = useCart()
  const [justAdded, setJustAdded] = useState(false)

  const isSoldOut = product.remainingPortions !== undefined && product.remainingPortions <= 0
  const isLowStock =
    product.remainingPortions !== undefined &&
    product.remainingPortions > 0 &&
    product.remainingPortions <= 15
  const currentDayLabel = product.day || activeDay

  const handleAdd = () => {
    if (isSoldOut) return
    if (onAdd) {
      onAdd(product)
    } else {
      addItem(product, activeDay)
    }
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1200)
  }

  return (
    <article
      id={`dish-${product.id}`}
      className={`group flex flex-col overflow-hidden rounded-card bg-white shadow-card transition-all duration-300 hover:-translate-y-0.5 scroll-mt-[calc(var(--header-h,120px)+32px)] ${
        isHighlighted
          ? "ring-4 ring-[#D70F64] shadow-[0_0_35px_rgba(215,15,100,0.4)] scale-[1.02]"
          : ""
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-saffron/40 via-alabaster to-[#D70F64]/15">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="size-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center text-display text-5xl text-[#D70F64]/20">
            BB
          </div>
        )}
        {product.bestseller && (
          <span className="text-display absolute left-3 top-3 rounded-full bg-saffron px-3 py-1.5 text-xs text-charcoal">
            Bestseller
          </span>
        )}
        {isSoldOut && (
          <span className="absolute right-3 top-3 rounded-full bg-slate-900/85 px-3 py-1 font-mono text-xs font-bold text-white shadow-sm backdrop-blur-xs">
            Sold Out
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-display text-lg">{product.name}</h3>
        <p className="line-clamp-2 text-sm text-slate">{product.description}</p>

        {isLowStock && (
          <div className="flex items-center gap-1.5 font-sans text-xs font-semibold text-[#D70F64]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#D70F64] opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-[#D70F64]"></span>
            </span>
            <span>
              ⚡ Only {product.remainingPortions} portions left for {currentDayLabel}!
            </span>
          </div>
        )}

        <p className="text-display mt-auto pt-1 text-2xl text-[#D70F64]">৳{product.price}</p>
        <button
          type="button"
          disabled={isSoldOut}
          onClick={handleAdd}
          className={`mt-1 h-11 w-full rounded-full text-sm font-semibold transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D70F64]/30 ${
            isSoldOut
              ? "cursor-not-allowed border border-stone-300 bg-stone-200 text-stone-500"
              : justAdded
                ? "border-2 border-[#D70F64] bg-[#FDF2F7] text-[#D70F64]"
                : "bg-[#D70F64] text-white hover:bg-[#B80C55]"
          }`}
        >
          {isSoldOut
            ? `Sold Out for ${
                currentDayLabel
                  ? currentDayLabel.charAt(0).toUpperCase() + currentDayLabel.slice(1).toLowerCase()
                  : "Today"
              }`
            : justAdded
              ? "Added ✓"
              : "+ Add to Cart"}
        </button>
      </div>
    </article>
  )
}
