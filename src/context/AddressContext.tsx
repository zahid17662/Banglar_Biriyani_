import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react"

export type AddressLabel = "Home" | "Work" | "Other" | string

export type Address = {
  id: string
  label: AddressLabel
  area: string
  details: string
  contactPhone?: string
  instructions?: string
  isDefault?: boolean
}

type AddressContextType = {
  addresses: Address[]
  selectedAddress: Address | null
  isAddressModalOpen: boolean
  setIsAddressModalOpen: (open: boolean) => void
  selectAddress: (id: string) => void
  addAddress: (address: Omit<Address, "id">) => Address
  setFreeformAddress: (fullAddressText: string, label?: string) => Address
  deleteAddress: (id: string) => void
  updateAddress: (id: string, updated: Partial<Address>) => void
  clearAllAddresses: () => void
}

const AddressContext = createContext<AddressContextType | undefined>(undefined)

const ADDRESSES_STORAGE_KEY = "banglar_biriyani_addresses_v2"
const SELECTED_ADDRESS_ID_KEY = "banglar_biriyani_selected_address_id_v2"

export const POPULAR_DHAKA_AREAS = [
  "Banani",
  "Gulshan 1",
  "Gulshan 2",
  "Dhanmondi",
  "Uttara",
  "Bashundhara R/A",
  "Mirpur",
  "Mohakhali",
  "Mohammadpur",
  "Lalmatia",
  "Badda",
  "Baridhara",
  "Motijheel",
  "Old Dhaka",
] as const

function getStoredAddresses(): Address[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(ADDRESSES_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    console.error("Failed to load addresses from localStorage:", e)
    return []
  }
}

function getStoredSelectedId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return localStorage.getItem(SELECTED_ADDRESS_ID_KEY)
  } catch {
    return null
  }
}

export function AddressProvider({ children }: { children: ReactNode }) {
  const [addresses, setAddresses] = useState<Address[]>(getStoredAddresses)
  const [selectedId, setSelectedId] = useState<string | null>(getStoredSelectedId)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false)

  // Sync addresses to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(addresses))
    } catch (e) {
      console.error("Failed to save addresses to localStorage:", e)
    }
  }, [addresses])

  // Sync selectedId to localStorage
  useEffect(() => {
    if (selectedId) {
      try {
        localStorage.setItem(SELECTED_ADDRESS_ID_KEY, selectedId)
      } catch (e) {
        console.error("Failed to save selected address ID to localStorage:", e)
      }
    } else {
      try {
        localStorage.removeItem(SELECTED_ADDRESS_ID_KEY)
      } catch {}
    }
  }, [selectedId])

  // Derive active selected address (null if user hasn't selected or written one yet)
  const selectedAddress = useMemo(() => {
    if (!addresses.length || !selectedId) return null
    const match = addresses.find((a) => a.id === selectedId)
    if (match) return match
    const defaultAddr = addresses.find((a) => a.isDefault)
    return defaultAddr || addresses[0] || null
  }, [addresses, selectedId])

  const selectAddress = (id: string) => {
    setSelectedId(id)
    setIsAddressModalOpen(false)
  }

  /**
   * Set address directly from free-form text entered by the user
   */
  const setFreeformAddress = (fullAddressText: string, label: string = "Delivery"): Address => {
    const trimmed = fullAddressText.trim()
    if (!trimmed) {
      throw new Error("Please write your address")
    }

    // Auto-detect matching area from text, or default to general area
    const detectedArea =
      POPULAR_DHAKA_AREAS.find((a) => trimmed.toLowerCase().includes(a.toLowerCase())) || "Dhaka"

    const newAddress: Address = {
      id: `addr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      label: label || "Delivery",
      area: detectedArea,
      details: trimmed,
      isDefault: true,
    }

    setAddresses((prev) => [
      newAddress,
      ...prev.filter((a) => a.details.toLowerCase() !== trimmed.toLowerCase()),
    ])
    setSelectedId(newAddress.id)
    setIsAddressModalOpen(false)
    return newAddress
  }

  const addAddress = (data: Omit<Address, "id">): Address => {
    const newAddress: Address = {
      ...data,
      id: `addr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    }

    setAddresses((prev) => {
      if (newAddress.isDefault) {
        return [newAddress, ...prev.map((a) => ({ ...a, isDefault: false }))]
      }
      return [newAddress, ...prev]
    })

    // Auto-select newly added address and close modal
    setSelectedId(newAddress.id)
    setIsAddressModalOpen(false)
    return newAddress
  }

  const updateAddress = (id: string, updated: Partial<Address>) => {
    setAddresses((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          return { ...a, ...updated }
        }
        if (updated.isDefault) {
          return { ...a, isDefault: false }
        }
        return a
      }),
    )
  }

  const deleteAddress = (id: string) => {
    setAddresses((prev) => {
      const remaining = prev.filter((a) => a.id !== id)
      if (selectedId === id) {
        setSelectedId(remaining.length > 0 ? remaining[0].id : null)
      }
      return remaining
    })
  }

  const clearAllAddresses = () => {
    setAddresses([])
    setSelectedId(null)
  }

  const value = {
    addresses,
    selectedAddress,
    isAddressModalOpen,
    setIsAddressModalOpen,
    selectAddress,
    addAddress,
    setFreeformAddress,
    deleteAddress,
    updateAddress,
    clearAllAddresses,
  }

  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>
}

export function useAddress(): AddressContextType {
  const context = useContext(AddressContext)
  if (!context) {
    throw new Error("useAddress must be used within an AddressProvider")
  }
  return context
}
