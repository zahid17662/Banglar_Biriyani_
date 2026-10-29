import { useState, useEffect, useCallback, useMemo } from "react"
import { useAuth } from "../../context/AuthContext"

interface AdminUserRecord {
  id: number
  fullName: string
  email: string
  phone: string
  role: "CUSTOMER" | "STAFF" | "ADMIN"
  defaultAddress: string | null
  isActive: boolean
  createdAt: string
  orderCount: number
  totalSpendBdt: number
}

const ROLES = ["CUSTOMER", "STAFF", "ADMIN"] as const

export function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [usersList, setUsersList] = useState<AdminUserRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("ALL")
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [toastMessage, setToastMessage] = useState<{
    text: string
    isError?: boolean
  } | null>(null)

  const showToast = (text: string, isError = false) => {
    setToastMessage({ text, isError })
    setTimeout(() => setToastMessage(null), 3500)
  }

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/admin/users", { credentials: "include" })
      if (!res.ok) throw new Error("Failed to load user directory")
      const json = await res.json()
      setUsersList(json.data || [])
    } catch (err) {
      console.error("Fetch users error:", err)
      showToast(err instanceof Error ? err.message : "Error loading users", true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Handle role change with guardrail & optimistic update
  const handleRoleChange = async (
    targetUser: AdminUserRecord,
    nextRole: "CUSTOMER" | "STAFF" | "ADMIN",
  ) => {
    if (targetUser.id === currentUser?.id && nextRole !== "ADMIN") {
      alert("Safety Guardrail: You cannot demote your own active Admin account.")
      return
    }

    const previousRole = targetUser.role

    // Optimistic UI update
    setUsersList((prev) => prev.map((u) => (u.id === targetUser.id ? { ...u, role: nextRole } : u)))

    try {
      setUpdatingId(targetUser.id)
      const res = await fetch(`/api/admin/users/${targetUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: nextRole }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || "Failed to update user role")
      }

      showToast(`User ${targetUser.fullName} updated to ${nextRole}`)
    } catch (err) {
      // Rollback
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: previousRole } : u)),
      )
      showToast(err instanceof Error ? err.message : "Failed to update role", true)
    } finally {
      setUpdatingId(null)
    }
  }

  // Handle account active toggle
  const handleToggleActive = async (targetUser: AdminUserRecord) => {
    if (targetUser.id === currentUser?.id) {
      alert("Safety Guardrail: You cannot suspend your own admin account.")
      return
    }

    const nextActive = !targetUser.isActive

    // Optimistic UI update
    setUsersList((prev) =>
      prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: nextActive } : u)),
    )

    try {
      setUpdatingId(targetUser.id)
      const res = await fetch(`/api/admin/users/${targetUser.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: nextActive }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error?.message || "Failed to toggle status")
      }

      showToast(`${targetUser.fullName}'s account is now ${nextActive ? "Active" : "Suspended"}`)
    } catch (err) {
      // Rollback
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: targetUser.isActive } : u)),
      )
      showToast("Error updating account status", true)
    } finally {
      setUpdatingId(null)
    }
  }

  // Format joined date nicely
  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString)
      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    } catch {
      return dateString
    }
  }

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim()
    return usersList.filter((u) => {
      const matchSearch =
        !q ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q)
      const matchRole = roleFilter === "ALL" || u.role === roleFilter
      return matchSearch && matchRole
    })
  }, [usersList, search, roleFilter])

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

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 font-mono text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
              ADMINISTRATOR ONLY
            </span>
            <span className="text-xs text-slate-500">{usersList.length} Accounts in Neon DB</span>
          </div>
          <h2 className="mt-1 font-display text-xl font-bold text-slate-900 sm:text-2xl">
            Customer Directory & Staff RBAC
          </h2>
        </div>

        <button
          type="button"
          onClick={fetchUsers}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
        >
          <svg
            className={`size-3.5 ${isLoading ? "animate-spin text-[#D70F64]" : ""}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
            <path d="M16 16h5v5" />
          </svg>
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by full name, email address, or mobile 01XXXXXXXXX..."
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-[#D70F64] focus:ring-1 focus:ring-[#D70F64]/20 focus:outline-none"
          />

          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200">
            {["ALL", "ADMIN", "STAFF", "CUSTOMER"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  roleFilter === r
                    ? "bg-[#D70F64] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex min-h-[350px] flex-col items-center justify-center space-y-3">
            <div className="size-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#D70F64]" />
            <p className="text-xs text-slate-500">Loading user records from Neon DB...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
            <p className="text-sm font-semibold text-slate-800">No users found</p>
            <p className="mt-1 text-xs text-slate-500">
              No registered user matches the search criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 uppercase tracking-wider text-slate-600">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Customer / Staff Member
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Contact & Address
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Role Badge
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Total Orders
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Total Spend (BDT)
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold">
                    Joined Date
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold text-center">
                    Account Status
                  </th>
                  <th scope="col" className="px-5 py-3.5 font-semibold text-right">
                    RBAC Role
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id

                  return (
                    <tr key={u.id} className="transition hover:bg-slate-50/80 group">
                      {/* Name & Email */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700 uppercase text-xs border border-slate-200 shrink-0">
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900">{u.fullName}</span>
                              {isSelf && (
                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                                  You (Active Admin)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contact & Address */}
                      <td className="px-5 py-4">
                        <p className="font-mono text-slate-800">📞 {u.phone}</p>
                        <p className="max-w-[180px] truncate text-[11px] text-slate-500">
                          {u.defaultAddress || "No default address saved"}
                        </p>
                      </td>

                      {/* Role Badge */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            u.role === "ADMIN"
                              ? "bg-[#D70F64]/10 text-[#D70F64] ring-1 ring-[#D70F64]/20"
                              : u.role === "STAFF"
                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      {/* Total Orders */}
                      <td className="px-5 py-4 font-mono font-semibold text-slate-800">
                        {u.orderCount} {u.orderCount === 1 ? "order" : "orders"}
                      </td>

                      {/* Total Spend */}
                      <td className="px-5 py-4 font-mono font-bold text-[#D70F64] text-sm">
                        ৳{u.totalSpendBdt.toLocaleString()}
                      </td>

                      {/* Joined Date */}
                      <td className="px-5 py-4 text-[11px] text-slate-500 font-mono">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Account Active / Suspended toggle */}
                      <td className="px-5 py-4 text-center">
                        <button
                          type="button"
                          disabled={isSelf || updatingId === u.id}
                          onClick={() => handleToggleActive(u)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold transition ${
                            u.isActive
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                          } ${
                            isSelf
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer hover:opacity-80"
                          }`}
                        >
                          {u.isActive ? "● Active" : "○ Suspended"}
                        </button>
                      </td>

                      {/* RBAC Role Selector Dropdown */}
                      <td className="px-5 py-4 text-right">
                        <select
                          disabled={isSelf || updatingId === u.id}
                          value={u.role}
                          onChange={(e) =>
                            handleRoleChange(u, e.target.value as "CUSTOMER" | "STAFF" | "ADMIN")
                          }
                          className={`rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs transition focus:border-[#D70F64] focus:outline-none ${
                            isSelf ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                          }`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
