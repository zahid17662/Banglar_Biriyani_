import { app } from "../server/index.js"
import { pool } from "../src/db/index.js"

interface TestResult {
  name: string
  passed: boolean
  error?: string
  details?: any
}

const results: TestResult[] = []

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    results.push({ name, passed: true })
    console.log(`✅ PASS: ${name}`)
  } catch (err: any) {
    results.push({ name, passed: false, error: err?.message || String(err) })
    console.error(`❌ FAIL: ${name}\n   Error: ${err?.message || err}`)
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

async function runAllTests() {
  console.log("\n========================================")
  console.log("🧪 Running Banglar Biriyani API Tests")
  console.log("========================================\n")

  // 1. Health check
  await runTest(
    "GET /api/health returns 200 with { data } envelope",
    async () => {
      const res = await app.request("/api/health")
      assert(res.status === 200, `Expected status 200, got ${res.status}`)
      const json = await res.json()
      assert(
        json.data && json.data.status === "ok",
        'Expected data.status to be "ok"',
      )
    },
  )

  // 2. Menu grouped
  await runTest("GET /api/menu returns 200 with 7 days schedule", async () => {
    const res = await app.request("/api/menu")
    assert(res.status === 200, `Expected status 200, got ${res.status}`)
    const json = await res.json()
    assert(json.data && json.data.days, "Expected data.days to exist")
    assert(
      Array.isArray(json.data.days.SATURDAY),
      "Expected SATURDAY to be an array",
    )
    assert(
      json.data.days.SATURDAY.length > 0,
      "Expected SATURDAY items to be populated",
    )
  })

  // 3. Menu for single day
  let saturdayItemId = 1
  await runTest(
    "GET /api/menu/SATURDAY returns 200 with Saturday items and everyday staples",
    async () => {
      const res = await app.request("/api/menu/SATURDAY")
      assert(res.status === 200, `Expected status 200, got ${res.status}`)
      const json = await res.json()
      assert(
        json.data && json.data.day === "SATURDAY",
        "Expected day to be SATURDAY",
      )
      assert(Array.isArray(json.data.items), "Expected items to be an array")
      assert(json.data.items.length > 0, "Expected items length > 0")
      saturdayItemId = json.data.items[0].id
    },
  )

  // 4. Menu invalid day
  await runTest(
    "GET /api/menu/SOMEDAY returns 400 with { error } envelope",
    async () => {
      const res = await app.request("/api/menu/SOMEDAY")
      assert(res.status === 400, `Expected status 400, got ${res.status}`)
      const json = await res.json()
      assert(
        json.error && json.error.code === "INVALID_DAY",
        `Expected INVALID_DAY, got ${json.error?.code}`,
      )
    },
  )

  // 5. Validation failure for order (invalid phone format)
  await runTest(
    "POST /api/orders with invalid phone returns 422 with { error } envelope",
    async () => {
      const res = await app.request("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: "Zahid",
          customerPhone: "12345", // Invalid BD phone
          customerAddress: "Dhanmondi, Dhaka",
          scheduledDay: "SATURDAY",
          items: [{ menuItemId: saturdayItemId, quantity: 1 }],
        }),
      })
      assert(res.status === 422, `Expected status 422, got ${res.status}`)
      const json = await res.json()
      assert(
        json.error && json.error.code === "VALIDATION_ERROR",
        `Expected VALIDATION_ERROR code`,
      )
      assert(
        json.error.details && json.error.details.customerPhone,
        "Expected customerPhone error details",
      )
    },
  )

  // 6. Successful order creation with authoritative pricing
  let createdOrderNumber = ""
  await runTest(
    "POST /api/orders creates order with authoritative pricing & returns 201 Created",
    async () => {
      const res = await app.request("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: "Zahidul Islam",
          customerPhone: "01712345678", // Valid BD phone
          customerAddress: "House 22, Road 9A, Dhanmondi, Dhaka",
          scheduledDay: "SATURDAY",
          deliverySlot: "Lunch (1:00 PM - 2:00 PM)",
          paymentMethod: "BKASH",
          notes: "Less spicy please",
          // Note: Notice client does NOT pass unitPrice or totalBdt; server must calculate authoritatively!
          items: [{ menuItemId: saturdayItemId, quantity: 2 }],
        }),
      })

      assert(res.status === 201, `Expected status 201, got ${res.status}`)
      const location = res.headers.get("Location")
      assert(
        !!location && location.startsWith("/api/orders/"),
        `Expected Location header, got ${location}`,
      )

      const json = await res.json()
      assert(json.data && json.data.order, "Expected data.order in response")
      assert(
        json.data.order.orderNumber.startsWith("BB-"),
        "Expected orderNumber format BB-YYYYMMDD-XXXX",
      )
      assert(
        json.data.order.deliveryFeeBdt === 60,
        "Expected 60 BDT delivery fee",
      )
      assert(
        json.data.order.totalBdt === json.data.order.subtotalBdt + 60,
        "Expected total = subtotal + 60",
      )
      assert(
        Array.isArray(json.data.items) && json.data.items.length === 1,
        "Expected 1 line item",
      )

      createdOrderNumber = json.data.order.orderNumber
    },
  )

  // 7. Get created order
  await runTest(
    `GET /api/orders/:orderNumber returns 200 with order and line items`,
    async () => {
      assert(
        !!createdOrderNumber,
        "No orderNumber available from previous test",
      )
      const res = await app.request(`/api/orders/${createdOrderNumber}`)
      assert(res.status === 200, `Expected status 200, got ${res.status}`)
      const json = await res.json()
      assert(json.data && json.data.order, "Expected data.order")
      assert(
        json.data.order.orderNumber === createdOrderNumber,
        "Order numbers must match",
      )
      assert(
        Array.isArray(json.data.items) && json.data.items.length > 0,
        "Expected items array",
      )
    },
  )

  // 8. Non-existent order
  await runTest(
    "GET /api/orders/BB-NONEXISTENT returns 404 with { error } envelope",
    async () => {
      const res = await app.request("/api/orders/BB-NONEXISTENT")
      assert(res.status === 404, `Expected status 404, got ${res.status}`)
      const json = await res.json()
      assert(
        json.error && json.error.code === "ORDER_NOT_FOUND",
        `Expected ORDER_NOT_FOUND code`,
      )
    },
  )

  console.log("\n========================================")
  const total = results.length
  const passed = results.filter((r) => r.passed).length
  const failed = total - passed
  console.log(`Results: ${passed}/${total} passed (${failed} failed)`)
  console.log("========================================\n")

  await pool.end()

  if (failed > 0) {
    process.exit(1)
  } else {
    process.exit(0)
  }
}

runAllTests().catch((err) => {
  console.error("Fatal test error:", err)
  process.exit(1)
})
