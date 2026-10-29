import { useEffect, useMemo, useState } from "react"
import { Header } from "./components/Header"
import { Hero } from "./components/Hero"
import { Footer } from "./components/Footer"
import { DayPillBar, type Day } from "./components/DayPillBar"
import { ProductCard, type Product } from "./components/ProductCard"
import { CartDrawer } from "./components/CartDrawer"
import { CheckoutModal } from "./components/CheckoutModal"
import { AddressModal } from "./components/AddressModal"
import { AuthModal } from "./components/AuthModal"
import { MyOrdersDrawer } from "./components/MyOrdersDrawer"
import { AdminPanelModal } from "./components/AdminPanelModal"
import { AdminPortal } from "./components/admin/AdminPortal"
import { useCurrentPath } from "./utils/navigation"
import { type SearchableDish } from "./components/SearchRecommendationPopup"
import { useCart } from "./context/CartContext"
import { useAddress } from "./context/AddressContext"

const img = (id: string, w = 800, h = 600) =>
  `https://images.unsplash.com/${id}?crop=entropy&cs=tinysrgb&fit=crop&fm=jpg&q=80&w=${w}&h=${h}`

/* Fallback Menu: biryani + regular items */
const INITIAL_MENU: Product[] = [
  {
    id: "1",
    name: "Saturday Special Shahi Mutton Kacchi",
    description:
      "Slow-cooked mutton layered with aromatic basmati, saffron, potato and fried onions, sealed dum-style.",
    price: 450,
    bestseller: true,
    image: img("photo-1589302168068-964664d93dc0"),
  },
  {
    id: "8",
    name: "Special Chicken Tehari",
    description:
      "Fragrant short-grain rice tossed with tender chicken, mustard oil and green chillies.",
    price: 320,
    image: img("photo-1563379091339-03b21ab4a4f8"),
  },
  {
    id: "11",
    name: "Jali Kabab (2 pcs)",
    description:
      "Crispy egg-laced minced beef patties, pan-fried golden and served with onion salad.",
    price: 100,
    image: img("photo-1603360946369-dc9bb6258143"),
  },
  {
    id: "13",
    name: "Traditional Borhani (500ml)",
    description: "Spiced yoghurt drink with mint and black salt. The perfect biryani partner.",
    price: 80,
    image: img("photo-1692620609860-be6717812f71"),
  },
  {
    id: "2",
    name: "Chicken Biryani (Dum Murgh)",
    description:
      "Basmati rice dum-cooked with spiced chicken, boiled egg and a hint of rose water.",
    price: 350,
    image: img("photo-1631515243349-e0cb75fb8d3a"),
  },
  {
    id: "7",
    name: "Sunday Special Old Dhaka Beef Tehari",
    description: "Old Dhaka-style tehari with tender beef chunks and aromatic mustard oil.",
    price: 300,
    image: img("photo-1697155406055-2db32d47ca07"),
  },
  {
    id: "12",
    name: "Chicken Roast",
    description: "Rich, mildly sweet wedding-style roast with ghee, yoghurt and fried onion.",
    price: 180,
    image: img("photo-1532636875304-0c89119d9b4d"),
  },
  {
    id: "14",
    name: "Firni Cup",
    description: "Chilled ground-rice pudding with cardamom, pistachio and almond.",
    price: 70,
    image: img("photo-1705174299330-939dd03cc864"),
  },
]

const grid = "grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 sm:gap-6 lg:grid-cols-4"

function SectionTitle({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="text-display text-3xl sm:text-4xl">{title}</h2>
      {meta && <p className="hidden text-sm text-slate sm:block">{meta}</p>}
    </div>
  )
}

function ProductSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-card bg-white shadow-card animate-pulse">
      <div className="relative aspect-[4/3] bg-slate/10" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="h-5 w-3/4 rounded bg-slate/15" />
        <div className="h-4 w-full rounded bg-slate/10" />
        <div className="h-4 w-2/3 rounded bg-slate/10" />
        <div className="mt-auto h-7 w-20 rounded bg-slate/15 pt-1" />
        <div className="mt-1 h-11 w-full rounded-full bg-slate/15" />
      </div>
    </div>
  )
}

type ApiMenuItem = {
  id: number
  categoryId: number
  categoryName: string
  categorySlug: string
  name: string
  description: string
  basePriceBdt: number
  specialPriceBdt?: number | null
  priceBdt?: number
  imageUrl: string
  portionSize: string
  spiceLevel: string
  rating: string
  isEveryday: boolean
  isAvailable: boolean
  isFeatured?: boolean
  remainingPortions?: number
  dailyQuota?: number
  soldCount?: number
}

type MenuByDay = Record<string, ApiMenuItem[]>

export default function App() {
  const currentPath = useCurrentPath()

  const {
    activeDay,
    setActiveDay,
    totalItems,
    addItem,
    setIsCartOpen,
    isCheckoutOpen,
    setIsCheckoutOpen,
  } = useCart()
  const { isAddressModalOpen, setIsAddressModalOpen } = useAddress()
  const [query, setQuery] = useState("")
  const [showAll, setShowAll] = useState(false)
  const [loading, setLoading] = useState(true)
  const [menuDays, setMenuDays] = useState<MenuByDay>({})
  const [highlightedDishId, setHighlightedDishId] = useState<string | null>(null)

  // Fetch 7-day menu from /api/menu on initial load, on schedule/menu updates, and when returning to storefront
  useEffect(() => {
    let isMounted = true
    async function loadMenu() {
      try {
        setLoading(true)
        const res = await fetch("/api/menu")
        if (!res.ok) throw new Error(`HTTP error ${res.status}`)
        const json = await res.json()
        const days = json.data?.days || json.days
        if (isMounted && days) {
          setMenuDays(days)
        }
      } catch (err) {
        console.warn("Could not load menu from API, using fallback data:", err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (currentPath === "/" || !currentPath.startsWith("/admin")) {
      loadMenu()
    }

    const handleMenuUpdated = () => {
      loadMenu()
    }
    window.addEventListener("banglar-biriyani:schedule-updated", handleMenuUpdated)
    window.addEventListener("banglar-biriyani:menu-updated", handleMenuUpdated)

    return () => {
      isMounted = false
      window.removeEventListener("banglar-biriyani:schedule-updated", handleMenuUpdated)
      window.removeEventListener("banglar-biriyani:menu-updated", handleMenuUpdated)
    }
  }, [currentPath])

  // Top Section: Core Biriyani & regular dishes
  const catalogMenu: Product[] = useMemo(() => {
    const allItems: ApiMenuItem[] = []
    const seen = new Set<number>()

    Object.values(menuDays).forEach((dayList) => {
      dayList.forEach((item) => {
        if (!seen.has(item.id)) {
          seen.add(item.id)
          allItems.push(item)
        }
      })
    })

    if (allItems.length === 0) {
      return INITIAL_MENU
    }

    // Filter for biriyanis, teharis, kebabs, borhani, desserts
    const coreItems = allItems.filter(
      (item) => item.categorySlug !== "home-style-meals" || item.isFeatured,
    )

    const listToUse = coreItems.length >= 4 ? coreItems : allItems
    return listToUse.map((i) => ({
      id: String(i.id),
      name: i.name,
      description: i.description,
      price: i.priceBdt ?? i.basePriceBdt,
      image: i.imageUrl,
      bestseller: i.isFeatured,
      portionSize: i.portionSize,
      remainingPortions: i.remainingPortions,
      dailyQuota: i.dailyQuota,
      day: activeDay,
    }))
  }, [menuDays, activeDay])

  // Bottom Section: Meals for selected activeDay
  const meals: Product[] = useMemo(() => {
    const key = activeDay.toUpperCase()
    const dayItems = menuDays[key]

    if (dayItems && dayItems.length > 0) {
      return dayItems.map((i) => ({
        id: String(i.id),
        name: i.name,
        description: i.description,
        price: i.priceBdt ?? i.basePriceBdt,
        image: i.imageUrl,
        bestseller: i.isFeatured,
        portionSize: i.portionSize,
        remainingPortions: i.remainingPortions,
        dailyQuota: i.dailyQuota,
        day: activeDay,
      }))
    }

    // Fallback if data is not yet loaded
    return INITIAL_MENU.slice(0, 4)
  }, [activeDay, menuDays])

  const q = query.toLowerCase()
  const filteredMenu = useMemo(
    () => catalogMenu.filter((p) => p.name.toLowerCase().includes(q)),
    [catalogMenu, q],
  )
  const visibleMenu = showAll || q ? filteredMenu : filteredMenu.slice(0, 4)

  const filteredMeals = useMemo(
    () => meals.filter((p) => p.name.toLowerCase().includes(q)),
    [meals, q],
  )

  const mealTitle = `${activeDay}'s Special Menu`

  // Comprehensive searchable dishes across everyday catalog + 7-day schedule
  const allSearchableDishes: SearchableDish[] = useMemo(() => {
    const list: SearchableDish[] = []
    const seen = new Set<string>()

    // Core catalog items
    catalogMenu.forEach((p) => {
      const key = `catalog-${p.id}`
      if (!seen.has(key)) {
        seen.add(key)
        list.push({
          id: p.id,
          name: p.name,
          description: p.description,
          price: p.price,
          image: p.image,
          bestseller: p.bestseller,
        })
      }
    })

    // 7-day schedule meals from API
    Object.entries(menuDays).forEach(([day, items]) => {
      const formattedDay = day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()
      items.forEach((item) => {
        const key = `item-${item.id}`
        if (!seen.has(key)) {
          seen.add(key)
          list.push({
            id: String(item.id),
            name: item.name,
            description: item.description,
            price: item.priceBdt ?? item.basePriceBdt,
            image: item.imageUrl,
            day: formattedDay,
            categoryName: item.categoryName,
            bestseller: item.isFeatured,
          })
        }
      })
    })

    return list
  }, [catalogMenu, menuDays])

  // Select a dish directly from recommendation popup or search
  const handleSelectDish = (dish: SearchableDish) => {
    setQuery(dish.name)
    if (dish.day) {
      const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
      const matched = days.find((d) => d.toLowerCase() === dish.day?.toLowerCase())
      if (matched) {
        setActiveDay(matched as Day)
      }
    }
    setShowAll(true)
    setHighlightedDishId(String(dish.id))

    // Smooth scroll directly to the targeted dish card
    setTimeout(() => {
      const el = document.getElementById(`dish-${dish.id}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      } else {
        const section = document.getElementById(dish.day ? "meal" : "menu")
        section?.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }, 150)

    // Remove highlight after 4 seconds
    setTimeout(() => {
      setHighlightedDishId((prev) => (prev === String(dish.id) ? null : prev))
    }, 4000)
  }

  // Execute search via Enter key or search button
  const handleExecuteSearch = (searchQuery: string) => {
    const qStr = searchQuery.trim()
    setQuery(qStr)
    if (!qStr) return

    const lower = qStr.toLowerCase()
    const matchedDish = allSearchableDishes.find(
      (d) =>
        d.name.toLowerCase().includes(lower) ||
        d.description?.toLowerCase().includes(lower) ||
        d.categoryName?.toLowerCase().includes(lower),
    )

    if (matchedDish) {
      handleSelectDish(matchedDish)
    } else {
      setShowAll(true)
      setTimeout(() => {
        const section = document.getElementById("menu")
        section?.scrollIntoView({ behavior: "smooth", block: "start" })
      }, 100)
    }
  }

  // If viewing the protected Admin workspace, render AdminPortal with route guard
  if (currentPath.startsWith("/admin")) {
    return <AdminPortal />
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        cartCount={totalItems}
        query={query}
        onQuery={setQuery}
        onOpenCart={() => setIsCartOpen(true)}
        dishes={allSearchableDishes}
        onSelectDish={handleSelectDish}
        onExecuteSearch={handleExecuteSearch}
      />

      <Hero
        image={img("photo-1631515243349-e0cb75fb8d3a", 2000, 1100)}
        alt="A bowl of fragrant biryani with tender meat"
        badge="This week only"
        title="The Royal Taste"
        highlight="of Bengal"
        subtitle="7-Day Special Menus"
        body="Dum-cooked kacchi, smoky tehari and fresh borhani. A new feast every day, delivered hot."
        primary={{ label: "Order Now", href: "#menu" }}
        secondary={{ label: "View Weekly Menu", href: "#meal" }}
      />

      {/* Our Menu: biryani & regular items */}
      <section
        id="menu"
        className="mx-auto w-full max-w-7xl scroll-mt-[calc(var(--header-h,120px)+16px)] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
      >
        <SectionTitle
          title="Our Menu"
          meta={loading ? "Loading..." : `${filteredMenu.length} items`}
        />
        <div className={grid}>
          {loading
            ? [1, 2, 3, 4].map((n) => <ProductSkeleton key={n} />)
            : visibleMenu.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  isHighlighted={highlightedDishId === String(p.id)}
                  onAdd={(item) => addItem(item, activeDay)}
                />
              ))}
        </div>
        {!loading && filteredMenu.length === 0 && (
          <p className="py-12 text-center text-slate">No menu items match "{query}".</p>
        )}
        {!q && filteredMenu.length > 4 && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              aria-expanded={showAll}
              className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-charcoal px-7 text-sm font-semibold transition hover:bg-charcoal hover:text-white"
            >
              {showAll ? "Show fewer items" : "See more items"}
              <svg
                className={`size-4 transition ${showAll ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        )}
      </section>

      <Hero
        compact
        image={img("photo-1589778655375-3e622a9fc91c", 2000, 1000)}
        alt="A Bengali thali with rice, curries and sides"
        badge="Daily meals"
        title="Home-Style"
        highlight="Meals"
        subtitle="Rice, Chicken, Fish & More"
        body="A fresh rice-and-curry lineup every day of the week. Pick your day and order ahead."
        primary={{ label: "Browse Meals", href: "#meal" }}
      />

      {/* Meal section with sticky day selector */}
      <section id="meal" className="scroll-mt-[var(--header-h,120px)]">
        <div className="sticky top-[var(--header-h,120px)] z-30 border-b border-line bg-alabaster/95 py-3 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <DayPillBar active={activeDay} onChange={setActiveDay} />
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <SectionTitle
            title={mealTitle}
            meta={loading ? "Loading..." : `${filteredMeals.length} meals`}
          />
          <div className={grid}>
            {loading
              ? [1, 2, 3, 4].map((n) => <ProductSkeleton key={n} />)
              : filteredMeals.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isHighlighted={highlightedDishId === String(p.id)}
                    onAdd={(item) => addItem(item, activeDay)}
                  />
                ))}
          </div>
          {!loading && filteredMeals.length === 0 && (
            <p className="py-12 text-center text-slate">No meals match "{query}".</p>
          )}
        </div>
      </section>

      <Footer />

      {/* Cart Drawer, Checkout, Address, Auth & Admin Modals */}
      <CartDrawer onProceedToCheckout={() => setIsCheckoutOpen(true)} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} />
      <AddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} />
      <AuthModal />
      <MyOrdersDrawer />
      <AdminPanelModal />
    </div>
  )
}
