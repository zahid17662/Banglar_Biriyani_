import { useState, useEffect, useCallback, type FormEvent } from "react"
import { useAuth } from "../../context/AuthContext"

interface MenuItem {
  id: number
  categoryId: number
  categoryName: string
  name: string
  description: string
  basePriceBdt: number
  imageUrl: string
  portionSize: string
  spiceLevel: string
  rating: string
  isEveryday: boolean
  isAvailable: boolean
}

interface Category {
  id: number
  name: string
  slug: string
}

export function AdminMenu() {
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"

  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCat, setSelectedCat] = useState("ALL")
  const [notification, setNotification] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // Create dish modal state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createName, setCreateName] = useState("")
  const [createCategory, setCreateCategory] = useState("Biryani & Tehari")
  const [createDescription, setCreateDescription] = useState("")
  const [createPrice, setCreatePrice] = useState("350")
  const [createPortion, setCreatePortion] = useState("1:1 Full Plate")
  const [createSpice, setCreateSpice] = useState("Medium")
  const [createImage, setCreateImage] = useState(
    "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&fit=crop",
  )
  const [createIsEveryday, setCreateIsEveryday] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchCatalog = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/admin/schedule", { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load catalog")
      const json = await res.json()
      setItems(json.data?.menuCatalog || [])
      setCategories(json.data?.categories || [])
    } catch (err) {
      console.error("Fetch catalog error:", err)
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Error loading menu",
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCatalog()
  }, [fetchCatalog])

  const handleToggleAvailable = async (item: MenuItem) => {
    try {
      const nextAvailable = !item.isAvailable
      const res = await fetch(`/api/admin/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isAvailable: nextAvailable }),
      })

      if (!res.ok) throw new Error("Failed to update availability")
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: nextAvailable } : i)),
      )
      window.dispatchEvent(new CustomEvent("banglar-biriyani:menu-updated"))
      window.dispatchEvent(new CustomEvent("banglar-biriyani:schedule-updated"))
      setNotification({
        type: "success",
        message: `Updated "${item.name}" availability to ${
          nextAvailable ? "Available" : "Sold Out"
        }`,
      })
      setTimeout(() => setNotification(null), 3000)
    } catch (err) {
      console.error(err)
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Update failed",
      })
    }
  }

  const handleDeleteItem = async (itemId: number, name: string) => {
    if (!isAdmin) return
    if (!confirm(`Are you sure you want to delete "${name}" from the menu catalog?`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/menu/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || "Failed to delete item")
      }

      setItems((prev) => prev.filter((i) => i.id !== itemId))
      window.dispatchEvent(new CustomEvent("banglar-biriyani:menu-updated"))
      window.dispatchEvent(new CustomEvent("banglar-biriyani:schedule-updated"))
      setNotification({
        type: "success",
        message: `Deleted "${name}" successfully`,
      })
      setTimeout(() => setNotification(null), 3000)
    } catch (err) {
      console.error(err)
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Delete failed",
      })
    }
  }

  const handleCreateDish = async (e: FormEvent) => {
    e.preventDefault()
    if (!isAdmin) return

    try {
      setIsSubmitting(true)
      const payload = {
        name: createName.trim(),
        categoryName: createCategory.trim(),
        description: createDescription.trim(),
        basePriceBdt: Number(createPrice),
        portionSize: createPortion.trim(),
        spiceLevel: createSpice,
        imageUrl: createImage.trim(),
        isEveryday: createIsEveryday,
      }

      const res = await fetch("/api/admin/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || "Failed to create dish")
      }

      setIsCreateOpen(false)
      setCreateName("")
      setCreateDescription("")
      window.dispatchEvent(new CustomEvent("banglar-biriyani:menu-updated"))
      window.dispatchEvent(new CustomEvent("banglar-biriyani:schedule-updated"))
      setNotification({
        type: "success",
        message: `Dish "${payload.name}" created successfully!`,
      })
      setTimeout(() => setNotification(null), 3000)
      fetchCatalog()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Failed to create dish")
    } finally {
      setIsSubmitting(false)
    }
  }

  const filtered = items.filter((item) => {
    const q = search.toLowerCase().trim()
    const matchSearch =
      !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    const matchCat = selectedCat === "ALL" || item.categoryName === selectedCat
    return matchSearch && matchCat
  })

  return (
    <div className="space-y-6">
      {notification && (
        <div
          role="alert"
          className={`flex items-center justify-between rounded-xl p-4 text-xs font-semibold shadow-sm ${
            notification.type === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">Menu Catalog & Dishes</h2>
          <p className="text-xs text-slate-500">
            Manage recipes, descriptions, base pricing, and daily kitchen availability
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#D70F64] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#D70F64]/25 transition hover:bg-[#B80C55] cursor-pointer"
          >
            <svg
              className="size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add New Dish</span>
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by dish name or ingredient..."
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
        />

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-800 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none shadow-2xs"
        >
          <option value="ALL">All Categories ({items.length})</option>
          {categories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Menu Grid */}
      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center space-y-3">
          <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#D70F64]" />
          <p className="text-xs text-slate-500">Loading dishes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-500 shadow-sm">
          No dishes match your search.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((dish) => (
            <div
              key={dish.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:border-slate-300"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-slate-100">
                <img
                  src={dish.imageUrl}
                  alt={dish.name}
                  className="h-full w-full object-cover transition duration-300 hover:scale-105"
                  loading="lazy"
                />
                <span className="absolute left-2.5 top-2.5 rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur">
                  {dish.categoryName}
                </span>
                {dish.isEveryday && (
                  <span className="absolute right-2.5 top-2.5 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    Everyday
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 text-sm">{dish.name}</h3>
                  <span className="font-mono font-bold text-[#D70F64] text-sm shrink-0">
                    ৳{dish.basePriceBdt}
                  </span>
                </div>

                <p className="mt-1 line-clamp-2 text-xs text-slate-600">{dish.description}</p>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Portion: {dish.portionSize}</span>
                  <span>Spice: {dish.spiceLevel}</span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => handleToggleAvailable(dish)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                      dish.isAvailable
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                        : "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                    }`}
                  >
                    {dish.isAvailable ? "● In Stock" : "○ Sold Out"}
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(dish.id, dish.name)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      title="Delete dish"
                    >
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Dish Modal */}
      {isCreateOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsCreateOpen(false)}
          />

          <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-display text-lg font-bold text-slate-900">
                Add New Dish to Catalog
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDish} className="mt-4 space-y-3 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Dish Name *</label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Sultan's Dine Style Kacchi"
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    placeholder="Biryani & Tehari"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Base Price (BDT) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={createPrice}
                    onChange={(e) => setCreatePrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Aromatic spices, tender meat, and basmati rice..."
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Portion Size</label>
                  <input
                    type="text"
                    value={createPortion}
                    onChange={(e) => setCreatePortion(e.target.value)}
                    placeholder="1:1 Full Plate"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Spice Level</label>
                  <select
                    value={createSpice}
                    onChange={(e) => setCreateSpice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                  >
                    <option value="Mild">Mild</option>
                    <option value="Medium">Medium</option>
                    <option value="Spicy">Spicy</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Image URL</label>
                <input
                  type="url"
                  value={createImage}
                  onChange={(e) => setCreateImage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={createIsEveryday}
                  onChange={(e) => setCreateIsEveryday(e.target.checked)}
                  className="size-3.5 rounded border-slate-300 text-[#D70F64] focus:ring-[#D70F64]"
                />
                <span className="text-xs text-slate-700">
                  Everyday staple dish (available all 7 days)
                </span>
              </label>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#D70F64] px-5 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-[#B80C55] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Saving Dish..." : "Save Dish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
