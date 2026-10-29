import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react"
import { useAuth } from "../../context/AuthContext"

const DAYS_OF_WEEK = [
  "SATURDAY",
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
] as const

type DayOfWeek = (typeof DAYS_OF_WEEK)[number]

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
  assignedDays?: string[]
}

interface Category {
  id: number
  name: string
  slug: string
}

const SPICE_LEVELS = ["Mild", "Medium", "Spicy", "Naga Hot"] as const
const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&fit=crop"

export function AdminMenuCrud() {
  const { user } = useAuth()
  const isAdmin = user?.role === "ADMIN"

  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [scheduleByDay, setScheduleByDay] = useState<Record<string, number[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid")

  // Search & category filter
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("ALL")

  // Modal State (Create or Edit)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    categoryName: "Signature Biriyani",
    description: "",
    basePriceBdt: 350,
    portionSize: "1:1 Regular",
    spiceLevel: "Medium",
    imageUrl: DEFAULT_IMAGE,
    isEveryday: false,
    isAvailable: true,
    assignedDays: [] as DayOfWeek[],
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<{
    text: string
    isError?: boolean
  } | null>(null)

  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError })
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Load menu catalog & 7-day schedules
  const fetchMenuData = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/admin/schedule", { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load menu catalog")
      const json = await res.json()
      const data = json.data

      const catList: Category[] = data?.categories || []
      const rawItems: MenuItem[] = data?.menuCatalog || []
      const rawDays: Record<string, { menuItemId: number }[]> = data?.days || {}

      // Build map of day assignments per item
      const itemDaysMap = new Map<number, Set<string>>()
      Object.entries(rawDays).forEach(([day, assignments]) => {
        assignments.forEach((a) => {
          if (!itemDaysMap.has(a.menuItemId)) {
            itemDaysMap.set(a.menuItemId, new Set())
          }
          itemDaysMap.get(a.menuItemId)!.add(day)
        })
      })

      const enrichedItems = rawItems.map((item) => ({
        ...item,
        assignedDays: Array.from(itemDaysMap.get(item.id) || []),
      }))

      setItems(enrichedItems)
      setCategories(catList)

      // Store day assignments
      const dayMap: Record<string, number[]> = {}
      Object.entries(rawDays).forEach(([day, list]) => {
        dayMap[day] = list.map((a) => a.menuItemId)
      })
      setScheduleByDay(dayMap)
    } catch (err) {
      console.error(err)
      showToast(err instanceof Error ? err.message : "Error loading catalog", true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMenuData()
  }, [fetchMenuData])

  // Open Create Modal
  const openCreateModal = () => {
    setEditingItem(null)
    setFormData({
      name: "",
      categoryName: categories[0]?.name || "Signature Biriyani",
      description: "",
      basePriceBdt: 350,
      portionSize: "1:1 Regular",
      spiceLevel: "Medium",
      imageUrl: DEFAULT_IMAGE,
      isEveryday: false,
      isAvailable: true,
      assignedDays: ["SATURDAY"],
    })
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      categoryName: item.categoryName,
      description: item.description,
      basePriceBdt: item.basePriceBdt,
      portionSize: item.portionSize || "1:1 Regular",
      spiceLevel: item.spiceLevel || "Medium",
      imageUrl: item.imageUrl || DEFAULT_IMAGE,
      isEveryday: item.isEveryday,
      isAvailable: item.isAvailable,
      assignedDays: (item.assignedDays || []) as DayOfWeek[],
    })
    setIsModalOpen(true)
  }

  // Toggle Day Selection in form
  const toggleDayAssignment = (day: DayOfWeek) => {
    setFormData((prev) => {
      const exists = prev.assignedDays.includes(day)
      const nextDays = exists
        ? prev.assignedDays.filter((d) => d !== day)
        : [...prev.assignedDays, day]
      return { ...prev, assignedDays: nextDays }
    })
  }

  // Quick In-Stock / Available switch
  const handleToggleAvailable = async (item: MenuItem) => {
    const nextVal = !item.isAvailable
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: nextVal } : i)))

    try {
      const res = await fetch(`/api/admin/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isAvailable: nextVal }),
      })

      if (!res.ok) throw new Error("Failed to update availability")
      window.dispatchEvent(new CustomEvent("banglar-biriyani:menu-updated"))
      window.dispatchEvent(new CustomEvent("banglar-biriyani:schedule-updated"))
      showToast(`"${item.name}" marked ${nextVal ? "In Stock" : "Sold Out"}`)
    } catch (err) {
      console.error(err)
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i)),
      )
      showToast("Failed to update status", true)
    }
  }

  // Delete Dish (Admin only)
  const handleDeleteItem = async (itemId: number, name: string) => {
    if (!isAdmin) return
    if (!confirm(`Are you sure you want to delete "${name}" from the catalog?`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/menu/${itemId}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || "Failed to delete dish")
      }

      setItems((prev) => prev.filter((i) => i.id !== itemId))
      window.dispatchEvent(new CustomEvent("banglar-biriyani:menu-updated"))
      window.dispatchEvent(new CustomEvent("banglar-biriyani:schedule-updated"))
      showToast(`Dish "${name}" removed from catalog`)
    } catch (err) {
      console.error(err)
      showToast(err instanceof Error ? err.message : "Error deleting dish", true)
    }
  }

  // Handle Form Submit (POST for create, PATCH for edit)
  const handleSubmitDish = async (e: FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (editingItem) {
        // Edit existing dish
        const patchPayload = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          basePriceBdt: Number(formData.basePriceBdt),
          portionSize: formData.portionSize.trim(),
          spiceLevel: formData.spiceLevel,
          imageUrl: formData.imageUrl.trim(),
          isEveryday: formData.isEveryday,
          isAvailable: formData.isAvailable,
        }

        const res = await fetch(`/api/admin/menu/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(patchPayload),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error?.message || "Failed to update dish")
        }

        showToast(`"${formData.name}" updated successfully!`)
      } else {
        // Create new dish
        const createPayload = {
          name: formData.name.trim(),
          categoryName: formData.categoryName.trim(),
          description: formData.description.trim(),
          basePriceBdt: Number(formData.basePriceBdt),
          portionSize: formData.portionSize.trim(),
          spiceLevel: formData.spiceLevel,
          imageUrl: formData.imageUrl.trim(),
          isEveryday: formData.isEveryday,
          isAvailable: formData.isAvailable,
          initialDays: formData.assignedDays,
        }

        const res = await fetch("/api/admin/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(createPayload),
        })

        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error?.message || "Failed to create dish")
        }

        showToast(`"${formData.name}" created and assigned!`)
      }

      setIsModalOpen(false)
      window.dispatchEvent(new CustomEvent("banglar-biriyani:menu-updated"))
      window.dispatchEvent(new CustomEvent("banglar-biriyani:schedule-updated"))
      fetchMenuData()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : "Submission error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered Items
  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim()
    return items.filter((item) => {
      const matchSearch =
        !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      const matchCat = selectedCategory === "ALL" || item.categoryName === selectedCategory
      return matchSearch && matchCat
    })
  }, [items, search, selectedCategory])

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-2xl transition animate-in fade-in slide-in-from-bottom-3 ${
            toastMessage.isError
              ? "border border-rose-200 bg-rose-50 text-rose-800"
              : "border border-emerald-200 bg-emerald-50 text-emerald-800 shadow-lg"
          }`}
        >
          <span className="size-2 rounded-full bg-current animate-ping" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header and Add Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#D70F64]/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#D70F64] ring-1 ring-[#D70F64]/20">
              MENU CATALOG & RECIPES
            </span>
            <span className="text-xs text-slate-500">{items.length} Dishes Registered</span>
          </div>
          <h2 className="mt-1 font-display text-xl font-bold text-slate-900 sm:text-2xl">
            Dishes, Recipes & Schedule Assignments
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "grid"
                  ? "bg-[#D70F64] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Grid View"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg transition ${
                viewMode === "table"
                  ? "bg-[#D70F64] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Table View"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="3" x2="21" y1="6" y2="6" />
                <line x1="3" x2="21" y1="12" y2="12" />
                <line x1="3" x2="21" y1="18" y2="18" />
              </svg>
            </button>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[#D70F64] px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#D70F64]/25 transition hover:bg-[#B80C55] active:scale-[0.98] cursor-pointer"
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
      </div>

      {/* Filter and Category Pills */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dish by name, description, or ingredients..."
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setSelectedCategory("ALL")}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              selectedCategory === "ALL"
                ? "bg-[#D70F64] text-white shadow-xs"
                : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            All Categories ({items.length})
          </button>
          {categories.map((cat) => {
            const count = items.filter((i) => i.categoryName === cat.name).length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  selectedCategory === cat.name
                    ? "bg-[#D70F64] text-white shadow-xs"
                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {cat.name} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Content: Grid or Table */}
      {isLoading ? (
        <div className="flex min-h-[350px] flex-col items-center justify-center space-y-3 rounded-2xl border border-slate-200 bg-white">
          <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#D70F64]" />
          <p className="text-xs text-slate-500">Loading catalog from Neon DB...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-800">No dishes match criteria</p>
          <p className="mt-1 text-xs text-slate-500">
            Try adjusting your search terms or category filter.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((dish) => (
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

                {/* Day assignment badges */}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {dish.isEveryday ? (
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                      Active Everyday (7 Days)
                    </span>
                  ) : dish.assignedDays && dish.assignedDays.length > 0 ? (
                    dish.assignedDays.map((d) => (
                      <span
                        key={d}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200"
                      >
                        {d.slice(0, 3)}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400">Catalog only (not scheduled)</span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Portion: {dish.portionSize}</span>
                  <span>Spice: {dish.spiceLevel}</span>
                </div>

                {/* Actions */}
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

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(dish)}
                      className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:border-[#D70F64] hover:text-[#D70F64] shadow-2xs transition cursor-pointer"
                      title="Edit dish recipe & details"
                    >
                      <svg
                        className="size-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </button>

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(dish.id, dish.name)}
                        className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 shadow-2xs transition cursor-pointer"
                        title="Delete dish from catalog"
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
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 uppercase tracking-wider text-slate-600">
                <tr>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Dish Name
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Category
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Base Price
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Portion
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Spice
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold">
                    Availability
                  </th>
                  <th scope="col" className="px-5 py-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredItems.map((dish) => (
                  <tr key={dish.id} className="transition hover:bg-slate-50/80">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={dish.imageUrl}
                          alt=""
                          className="size-9 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-slate-900">{dish.name}</p>
                          <p className="max-w-[200px] truncate text-[11px] text-slate-500">
                            {dish.description}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {dish.categoryName}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 font-mono font-bold text-[#D70F64]">
                      ৳{dish.basePriceBdt}
                    </td>

                    <td className="px-5 py-3.5 text-slate-600">{dish.portionSize}</td>

                    <td className="px-5 py-3.5 text-slate-600">{dish.spiceLevel}</td>

                    <td className="px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailable(dish)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold cursor-pointer transition ${
                          dish.isAvailable
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                        }`}
                      >
                        {dish.isAvailable ? "In Stock" : "Sold Out"}
                      </button>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(dish)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:border-[#D70F64] hover:text-[#D70F64] shadow-2xs"
                        >
                          Edit
                        </button>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(dish.id, dish.name)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-rose-600 hover:border-rose-300 hover:bg-rose-50 shadow-2xs"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT DISH MODAL */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <h3 className="font-display text-lg font-bold text-slate-900">
                {editingItem ? `Edit Dish: ${editingItem.name}` : "Add New Dish to Catalog"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitDish} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Image Preview & URL */}
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative aspect-video w-36 overflow-hidden rounded-xl bg-slate-100 shrink-0 border border-slate-200">
                  <img
                    src={formData.imageUrl || DEFAULT_IMAGE}
                    alt="Preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLImageElement).src = DEFAULT_IMAGE
                    }}
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] text-white">
                    Preview
                  </span>
                </div>
                <div className="flex-1 w-full">
                  <label className="block text-xs font-semibold text-slate-700">Image URL</label>
                  <input
                    type="url"
                    required
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Dish Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Shahi Mutton Kacchi"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Category *</label>
                  <input
                    type="text"
                    required
                    value={formData.categoryName}
                    onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                    placeholder="Signature Biriyani"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Slow-cooked meat layered with basmati, saffron, fried onions..."
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                />
              </div>

              {/* Price, Portion, Spice Level */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Base Price (৳) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.basePriceBdt}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        basePriceBdt: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Portion Size</label>
                  <input
                    type="text"
                    value={formData.portionSize}
                    onChange={(e) => setFormData({ ...formData, portionSize: e.target.value })}
                    placeholder="1:1 Regular"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Spice Level</label>
                  <select
                    value={formData.spiceLevel}
                    onChange={(e) => setFormData({ ...formData, spiceLevel: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
                  >
                    {SPICE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Toggles: Everyday & In Stock */}
              <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isEveryday}
                    onChange={(e) => setFormData({ ...formData, isEveryday: e.target.checked })}
                    className="size-4 rounded border-slate-300 text-[#D70F64] focus:ring-[#D70F64]"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">
                      Everyday Staple Dish
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Auto-shows on all 7 days of the week
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isAvailable}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isAvailable: e.target.checked,
                      })
                    }
                    className="size-4 rounded border-slate-300 text-[#D70F64] focus:ring-[#D70F64]"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-800">
                      In Stock & Available
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Customers can add this item to cart
                    </p>
                  </div>
                </label>
              </div>

              {/* Day Assignments Checkboxes */}
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Assign directly to weekly meal schedule days:
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isAssigned = formData.assignedDays.includes(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDayAssignment(day)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                          isAssigned
                            ? "bg-[#D70F64] text-white shadow-xs"
                            : "border border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Submit Actions */}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-[#D70F64] px-5 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-[#B80C55] disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Saving Dish..." : editingItem ? "Save Changes" : "Create Dish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
