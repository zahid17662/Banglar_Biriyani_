import { test, describe, expect } from "vitest"
import type { CartItem } from "../src/context/CartContext"

// Replicate cart validator logic to test edge cases
function isValidCartItem(item: unknown): item is CartItem {
  if (!item || typeof item !== "object") return false
  const candidate = item as Record<string, unknown>
  return (
    typeof candidate.menuItemId === "number" &&
    !isNaN(candidate.menuItemId) &&
    typeof candidate.name === "string" &&
    candidate.name.trim().length > 0 &&
    typeof candidate.priceBdt === "number" &&
    !isNaN(candidate.priceBdt) &&
    candidate.priceBdt >= 0 &&
    typeof candidate.scheduledDay === "string" &&
    candidate.scheduledDay.trim().length > 0 &&
    typeof candidate.quantity === "number" &&
    !isNaN(candidate.quantity) &&
    candidate.quantity > 0
  )
}

describe("Frontend Cart State & Validation Edge Cases", () => {
  describe("1. Corrupt localStorage Recovery & Schema Validation", () => {
    test("Accepts fully valid cart items", () => {
      const validItem: CartItem = {
        menuItemId: 1,
        name: "Shahi Mutton Kacchi",
        priceBdt: 450,
        scheduledDay: "SATURDAY",
        quantity: 2,
        portionSize: "1 Person",
        isEveryday: false,
      }
      expect(isValidCartItem(validItem)).toBe(true)
    })

    test("Rejects corrupt, null, or malformed items", () => {
      expect(isValidCartItem(null)).toBe(false)
      expect(isValidCartItem(undefined)).toBe(false)
      expect(isValidCartItem("string-instead-of-item")).toBe(false)
      expect(isValidCartItem(12345)).toBe(false)
      expect(isValidCartItem({})).toBe(false)
      expect(isValidCartItem({ menuItemId: "not-a-number" })).toBe(false)
      expect(
        isValidCartItem({
          menuItemId: 1,
          name: "", // empty name
          priceBdt: 450,
          scheduledDay: "SATURDAY",
          quantity: 1,
        }),
      ).toBe(false)
      expect(
        isValidCartItem({
          menuItemId: 1,
          name: "Item",
          priceBdt: -50, // negative price
          scheduledDay: "SATURDAY",
          quantity: 1,
        }),
      ).toBe(false)
      expect(
        isValidCartItem({
          menuItemId: 1,
          name: "Item",
          priceBdt: 450,
          scheduledDay: "SATURDAY",
          quantity: 0, // non-positive quantity
        }),
      ).toBe(false)
      expect(
        isValidCartItem({
          menuItemId: 1,
          name: "Item",
          priceBdt: 450,
          scheduledDay: "SATURDAY",
          quantity: NaN,
        }),
      ).toBe(false)
    })

    test("Filters corrupt items out of a mixed localStorage array cleanly", () => {
      const rawStoredList = [
        null,
        { menuItemId: 1, name: "Kacchi", priceBdt: 450, scheduledDay: "SATURDAY", quantity: 1 },
        { broken: true },
        "corrupt-string",
        { menuItemId: 2, name: "Borhani", priceBdt: 80, scheduledDay: "SATURDAY", quantity: 2 },
      ]

      const cleaned = rawStoredList.filter(isValidCartItem)
      expect(cleaned.length).toBe(2)
      expect(cleaned[0].name).toBe("Kacchi")
      expect(cleaned[1].name).toBe("Borhani")
    })
  })

  describe("2. Cart Pricing & Quantity Decrement Edge Cases", () => {
    test("Calculates ৳0 delivery fee and ৳0 total when cart is empty", () => {
      const items: CartItem[] = []
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
      const subtotalBdt = items.reduce((sum, item) => sum + item.priceBdt * item.quantity, 0)
      const deliveryFeeBdt = totalItems > 0 ? 60 : 0
      const totalBdt = subtotalBdt + deliveryFeeBdt

      expect(totalItems).toBe(0)
      expect(subtotalBdt).toBe(0)
      expect(deliveryFeeBdt).toBe(0)
      expect(totalBdt).toBe(0)
    })

    test("Calculates ৳60 delivery fee when cart contains items", () => {
      const items: CartItem[] = [
        { menuItemId: 1, name: "Kacchi", priceBdt: 450, scheduledDay: "SATURDAY", quantity: 2 },
        { menuItemId: 13, name: "Borhani", priceBdt: 80, scheduledDay: "SATURDAY", quantity: 1 },
      ]
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
      const subtotalBdt = items.reduce((sum, item) => sum + item.priceBdt * item.quantity, 0)
      const deliveryFeeBdt = totalItems > 0 ? 60 : 0
      const totalBdt = subtotalBdt + deliveryFeeBdt

      expect(totalItems).toBe(3)
      expect(subtotalBdt).toBe(980)
      expect(deliveryFeeBdt).toBe(60)
      expect(totalBdt).toBe(1040)
    })

    test("Decrementing an item with quantity = 1 removes it from the cart", () => {
      let items: CartItem[] = [
        { menuItemId: 1, name: "Kacchi", priceBdt: 450, scheduledDay: "SATURDAY", quantity: 1 },
      ]

      // Simulate decrement logic
      const targetId = 1
      const targetDay = "SATURDAY"
      const match = items.find(
        (i) =>
          i.menuItemId === targetId && i.scheduledDay.toUpperCase() === targetDay.toUpperCase(),
      )

      if (match && match.quantity <= 1) {
        items = items.filter(
          (i) =>
            !(
              i.menuItemId === targetId && i.scheduledDay.toUpperCase() === targetDay.toUpperCase()
            ),
        )
      }

      expect(items.length).toBe(0)
    })

    test("Decrementing an item with quantity > 1 decreases quantity cleanly", () => {
      let items: CartItem[] = [
        { menuItemId: 1, name: "Kacchi", priceBdt: 450, scheduledDay: "SATURDAY", quantity: 3 },
      ]

      const targetId = 1
      const targetDay = "SATURDAY"
      items = items.map((i) => {
        if (i.menuItemId === targetId && i.scheduledDay.toUpperCase() === targetDay.toUpperCase()) {
          return { ...i, quantity: i.quantity - 1 }
        }
        return i
      })

      expect(items.length).toBe(1)
      expect(items[0].quantity).toBe(2)
    })
  })

  describe("3. Multi-Day Safety Logic", () => {
    test("Detects incompatible scheduled day additions", () => {
      const cartItems: CartItem[] = [
        {
          menuItemId: 1,
          name: "Saturday Kacchi",
          priceBdt: 450,
          scheduledDay: "SATURDAY",
          quantity: 1,
          isEveryday: false,
        },
      ]

      const newItem = {
        name: "Wednesday Tehari",
        isEveryday: false,
      }
      const targetDay = "WEDNESDAY"

      const existingDifferentDayItem = cartItems.find(
        (i) => !i.isEveryday && i.scheduledDay.toUpperCase() !== targetDay.toUpperCase(),
      )

      expect(existingDifferentDayItem).toBeDefined()
      expect(existingDifferentDayItem?.scheduledDay).toBe("SATURDAY")
    })

    test("Allows everyday items (borhani, kebab) to be added without conflict", () => {
      const cartItems: CartItem[] = [
        {
          menuItemId: 1,
          name: "Saturday Kacchi",
          priceBdt: 450,
          scheduledDay: "SATURDAY",
          quantity: 1,
          isEveryday: false,
        },
      ]

      const newEverydayItem = {
        name: "Traditional Borhani",
        isEveryday: true,
      }
      const targetDay = "SATURDAY"

      const existingDifferentDayItem = cartItems.find(
        (i) =>
          !newEverydayItem.isEveryday &&
          !i.isEveryday &&
          i.scheduledDay.toUpperCase() !== targetDay.toUpperCase(),
      )

      expect(existingDifferentDayItem).toBeUndefined()
    })
  })
})
