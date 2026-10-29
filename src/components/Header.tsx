import { useState, useEffect, useRef } from "react"
import { useCart } from "../context/CartContext"
import { useAddress } from "../context/AddressContext"
import { useAuth } from "../context/AuthContext"
import { navigateTo } from "../utils/navigation"
import { AddressRecommendationPopup } from "./AddressRecommendationPopup"
import { SearchRecommendationPopup, type SearchableDish } from "./SearchRecommendationPopup"

type Props = {
  cartCount?: number
  query: string
  onQuery: (q: string) => void
  onOpenCart?: () => void
  dishes?: SearchableDish[]
  onSelectDish?: (dish: SearchableDish) => void
  onExecuteSearch?: (q: string) => void
}

const Icon = ({ d, className = "size-5" }: { d: string; className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d={d} />
  </svg>
)
const ICONS = {
  pin: "M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
  globe:
    "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.7 3.5 5.7 3.5 9s-1 6.3-3.5 9c-2.5-2.7-3.5-5.7-3.5-9s1-6.3 3.5-9Z",
  heart:
    "M12 20s-7.5-4.6-9-9.2C2 7.6 4.2 5 7 5c2 0 3.2 1.1 5 3 1.8-1.9 3-3 5-3 2.8 0 5 2.6 4 5.8-1.5 4.6-9 9.2-9 9.2Z",
  bag: "M6 7h12l-1.2 11.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Zm3 0V6a3 3 0 0 1 6 0v1",
  chevron: "m6 9 6 6 6-6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 2-3.5-3.5",
}

const NAV = [
  { label: "Our Menu", href: "#menu" },
  { label: "Meal", href: "#meal" },
  { label: "Offers", href: "#offers" },
]

const iconBtn =
  "grid size-10 shrink-0 place-items-center rounded-full text-charcoal transition hover:bg-alabaster hover:text-[#D70F64] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D70F64]/25"

export function Header({
  cartCount: propCartCount,
  query,
  onQuery,
  onOpenCart,
  dishes = [],
  onSelectDish,
  onExecuteSearch,
}: Props) {
  const ref = useRef<HTMLElement>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const { totalItems, setIsCartOpen } = useCart()
  const { selectedAddress, setIsAddressModalOpen } = useAddress()
  const { user, openAuthModal, openMyOrders, openAdminModal, logout } = useAuth()
  const [isRecommendationOpen, setIsRecommendationOpen] = useState(false)
  const [isSearchRecOpen, setIsSearchRecOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const cartCount = propCartCount ?? totalItems

  // Close user dropdown when clicking outside
  useEffect(() => {
    if (!isUserMenuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isUserMenuOpen])

  const handleOpenCart = () => {
    setIsCartOpen(true)
    if (onOpenCart) onOpenCart()
  }

  // Publish header height so other sticky bars can sit right below it.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() =>
      document.documentElement.style.setProperty("--header-h", `${el.offsetHeight}px`),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <header ref={ref} className="sticky top-0 z-40 border-b border-line bg-white">
      {/* Row 1: logo, address, account */}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <a href="#" className="text-display shrink-0 text-xl text-[#D70F64] sm:text-2xl">
          Banglar Biriyani
        </a>

        {/* Mobile Address Button */}
        <button
          type="button"
          onClick={() => setIsRecommendationOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-alabaster/80 px-2.5 py-1 text-xs text-charcoal transition hover:bg-alabaster md:hidden"
          title="Change delivery address"
        >
          <Icon d={ICONS.pin} className="size-3.5 text-[#D70F64]" />
          <span className="max-w-[100px] truncate font-medium">
            {selectedAddress ? selectedAddress.area : "Address"}
          </span>
          <Icon d={ICONS.chevron} className="size-3 text-slate" />
        </button>

        {/* Desktop Address Button Container with Floating Recommendation Popup */}
        <div className="relative mx-auto hidden md:block">
          <button
            type="button"
            onClick={() => setIsRecommendationOpen((prev) => !prev)}
            aria-expanded={isRecommendationOpen}
            className="flex items-center gap-2 rounded-full px-3 py-2 text-sm transition hover:bg-alabaster focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D70F64]/30 cursor-pointer"
            title="Change delivery address"
          >
            <Icon d={ICONS.pin} className="size-4 text-[#D70F64]" />
            <span className="font-semibold text-charcoal">
              {selectedAddress?.label ? `${selectedAddress.label} address` : "New address"}
            </span>
            <span className="text-slate max-w-[200px] truncate">
              {selectedAddress ? selectedAddress.details : "Select your address"}
            </span>
            <Icon
              d={ICONS.chevron}
              className={`size-3.5 text-slate/70 transition-transform duration-200 ${
                isRecommendationOpen ? "rotate-180 text-[#D70F64]" : ""
              }`}
            />
          </button>

          {/* Floating Recommendation Dropdown Popup */}
          <AddressRecommendationPopup
            isOpen={isRecommendationOpen}
            onClose={() => setIsRecommendationOpen(false)}
            onOpenDetailedModal={() => {
              setIsRecommendationOpen(false)
              setIsAddressModalOpen(true)
            }}
          />
        </div>

        <div ref={userMenuRef} className="relative ml-auto flex items-center gap-1 md:ml-0">
          {user ? (
            <>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-alabaster lg:flex"
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
              >
                <Icon d={ICONS.user} className="size-4 text-[#D70F64]" />
                {user.fullName.split(" ")[0]}
                <Icon
                  d={ICONS.chevron}
                  className={`size-4 text-[#D70F64] transition-transform ${
                    isUserMenuOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                aria-label={`Account menu for ${user.fullName}`}
                className={`${iconBtn} text-[#D70F64] lg:hidden`}
              >
                <Icon d={ICONS.user} />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-xl ring-1 ring-black/5 z-50 animate-in fade-in-0 zoom-in-95 duration-100"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <div className="border-b border-line px-3 py-2.5">
                    <p className="text-xs font-bold text-charcoal truncate">{user.fullName}</p>
                    <div className="mt-0.5 flex items-center justify-between text-[11px] text-slate">
                      <span className="truncate">{user.phone}</span>
                      <span className="rounded-full bg-[#D70F64]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#D70F64]">
                        {user.role}
                      </span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        openMyOrders()
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-charcoal transition hover:bg-alabaster hover:text-[#D70F64]"
                      role="menuitem"
                    >
                      <svg
                        className="size-4 text-slate"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                        <path d="M3 6h18" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                      </svg>
                      My Orders
                    </button>

                    {(user.role === "ADMIN" || user.role === "STAFF") && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false)
                          navigateTo("/admin")
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#D70F64] transition hover:bg-[#FDF2F7]"
                        role="menuitem"
                      >
                        <svg
                          className="size-4 text-[#D70F64]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect width="18" height="18" x="3" y="3" rx="2" />
                          <path d="M9 3v18" />
                          <path d="m14 9 3 3-3 3" />
                        </svg>
                        Admin Panel
                      </button>
                    )}
                  </div>

                  <div className="border-t border-line pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false)
                        logout()
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                      role="menuitem"
                    >
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-alabaster lg:flex"
              >
                <Icon d={ICONS.user} className="size-4" />
                Sign In
                <Icon d={ICONS.chevron} className="size-4 text-[#D70F64]" />
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                aria-label="Sign In"
                className={`${iconBtn} lg:hidden`}
              >
                <Icon d={ICONS.user} />
              </button>
            </>
          )}
          <button
            type="button"
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition hover:bg-alabaster sm:flex"
          >
            <Icon d={ICONS.globe} className="size-4" />
            EN
            <Icon d={ICONS.chevron} className="size-4 text-[#D70F64]" />
          </button>
          <button type="button" aria-label="Favourites" className={iconBtn}>
            <Icon d={ICONS.heart} />
          </button>
          <button
            type="button"
            onClick={handleOpenCart}
            aria-label={`Cart, ${cartCount} items`}
            className={`relative ${iconBtn}`}
          >
            <Icon d={ICONS.bag} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#D70F64] px-1 text-[11px] font-bold text-white shadow-xs ring-2 ring-white">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Row 2: section nav + search */}
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 pb-3 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <nav aria-label="Sections" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto">
          {NAV.map((n, i) => (
            <a
              key={n.label}
              href={n.href}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                i === 0
                  ? "bg-charcoal text-white"
                  : "text-charcoal hover:bg-alabaster hover:text-[#D70F64]"
              }`}
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div ref={searchContainerRef} className="relative block w-full md:max-w-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (onExecuteSearch) {
                onExecuteSearch(query)
              }
              setIsSearchRecOpen(false)
            }}
            className="relative block w-full"
          >
            <span className="sr-only">Search</span>
            {/* Left decorative search icon */}
            <Icon
              d={ICONS.search}
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate"
            />
            {/* Search Input field */}
            <input
              type="search"
              value={query}
              onChange={(e) => {
                onQuery(e.target.value)
                setIsSearchRecOpen(true)
              }}
              onFocus={() => setIsSearchRecOpen(true)}
              onClick={() => setIsSearchRecOpen(true)}
              placeholder="Search for restaurants, cuisines, and dishes"
              className="h-10 w-full rounded-full border border-line bg-alabaster pl-10 pr-10 text-sm outline-none transition placeholder:text-slate focus:border-[#D70F64] focus:bg-white focus:ring-4 focus:ring-[#D70F64]/10"
            />
            {/* Small Search Icon Button on the right */}
            <button
              type="submit"
              aria-label="Search"
              title="Search"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 grid size-7 place-items-center rounded-full bg-[#D70F64] text-white transition hover:bg-[#B80C55] active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D70F64]/40"
            >
              <Icon d={ICONS.search} className="size-3.5" />
            </button>
          </form>

          {/* Search Recommendation Popup */}
          <SearchRecommendationPopup
            isOpen={isSearchRecOpen}
            onClose={() => setIsSearchRecOpen(false)}
            query={query}
            dishes={dishes}
            containerRef={searchContainerRef}
            onSelectDish={(dish) => {
              if (onSelectDish) onSelectDish(dish)
              setIsSearchRecOpen(false)
            }}
            onExecuteSearch={(q) => {
              if (onExecuteSearch) onExecuteSearch(q)
              setIsSearchRecOpen(false)
            }}
          />
        </div>
      </div>
    </header>
  )
}
