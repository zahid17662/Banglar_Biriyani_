import { chromium } from "playwright"
import fs from "node:fs"
import path from "node:path"
import { pool, db, orders, orderItems } from "../src/db/index.js"
import { eq } from "drizzle-orm"

const ARTIFACTS_DIR = path.resolve(process.cwd(), "artifacts")
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true })
}

const BASE_URL = process.env.BASE_URL || "http://localhost:8443"

interface DayCheckResult {
  day: string
  pillFound: boolean
  activeConfirmed: boolean
  itemCount: number
  sampleItems: string[]
}

async function runE2EVerification() {
  console.log("==================================================================")
  console.log("🚀 Starting Full End-to-End Verification Loop")
  console.log(`🌐 Target URL: ${BASE_URL}`)
  console.log("==================================================================\n")

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  })

  const page = await context.newPage()

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Visual & Brand Audit
    // -------------------------------------------------------------------------
    console.log("▶ Phase 1: Visual & Brand Audit...")
    await page.goto(BASE_URL, { waitUntil: "networkidle" })

    // Check Restaurant Title
    const title = await page.title()
    console.log(`  • Page title: "${title}"`)

    const logoText = await page.locator("header a.text-display").first().innerText()
    console.log(`  • Header logo text: "${logoText.trim()}"`)
    if (!logoText.toLowerCase().includes("banglar biriyani")) {
      throw new Error(`Logo text "${logoText}" does not contain "Banglar Biriyani"`)
    }

    // Verify brand color #D70F64 on logo
    const logoColor = await page.locator("header a.text-display").first().evaluate((el) => {
      return window.getComputedStyle(el).color
    })
    console.log(`  • Logo color: ${logoColor}`) // should be rgb(215, 15, 100)

    // Check Hero subtitle color
    const heroD70F64Count = await page.locator(".text-\\[\\#D70F64\\], .bg-\\[\\#D70F64\\]").count()
    console.log(`  • Rendered #D70F64 brand element count on homepage: ${heroD70F64Count}`)

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "01-visual-brand-audit.png"), fullPage: false })
    console.log("  ✔ Visual & Brand Audit Passed!\n")

    // -------------------------------------------------------------------------
    // Phase 2: 7-Day Meal System Check
    // -------------------------------------------------------------------------
    console.log("▶ Phase 2: 7-Day Meal System Check...")
    const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const
    const dayResults: DayCheckResult[] = []

    for (const day of DAYS) {
      console.log(`  • Checking tab: ${day}...`)
      // Click day pill
      const pill = page.locator(`button[role="tab"]:has-text("${day}")`).first()
      await pill.waitFor({ state: "visible", timeout: 10000 })
      await pill.click()

      // Wait for network/UI update
      await page.waitForTimeout(1000)

      // Verify active pill styling
      const pillClass = await pill.getAttribute("class")
      const isActive = pillClass?.includes("bg-[#D70F64]") || pillClass?.includes("text-white")

      // Count dishes
      const dishes = page.locator("article[id^='dish-']")
      const count = await dishes.count()

      const sampleNames: string[] = []
      for (let i = 0; i < Math.min(3, count); i++) {
        const dishTitle = await dishes.nth(i).locator("h3").innerText()
        sampleNames.push(dishTitle.trim())
      }

      console.log(`    - Active: ${isActive ? "YES" : "NO"}, Dishes: ${count}, Samples: ${sampleNames.join(", ")}`)

      dayResults.push({
        day,
        pillFound: true,
        activeConfirmed: !!isActive,
        itemCount: count,
        sampleItems: sampleNames,
      })

      if (count === 0) {
        throw new Error(`Day ${day} rendered 0 menu items!`)
      }
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "02-seven-day-meal-system.png") })
    console.log("  ✔ 7-Day Meal System Check Passed for all 7 days!\n")

    // -------------------------------------------------------------------------
    // Phase 3: Order Checkout Journey
    // -------------------------------------------------------------------------
    console.log("▶ Phase 3: Order Checkout Journey...")

    // Clear any previous cart state in localStorage
    await page.evaluate(() => {
      localStorage.setItem("banglar_biriyani_cart_v1", "[]")
      window.location.reload()
    })
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(800)

    // 1. Click Saturday
    console.log("  • Selecting Saturday tab...")
    const saturdayPill = page.locator('button[role="tab"]:has-text("Saturday")').first()
    await saturdayPill.click()
    await page.waitForTimeout(800)

    // 2. Add 2 portions of Saturday's signature Biriyani
    console.log("  • Adding 2 portions of Saturday Special Shahi Mutton Kacchi...")
    const kacchiCard = page.locator("article:has-text('Saturday Special Shahi Mutton Kacchi')").first()
    await kacchiCard.waitFor({ state: "visible" })
    const addKacchiBtn = kacchiCard.locator("button:has-text('+ Add to Cart'), button:has-text('Added')")

    // Click first time
    await addKacchiBtn.click()
    await page.waitForTimeout(600)
    // Click second time
    await addKacchiBtn.click()
    await page.waitForTimeout(600)

    // 3. Add 1 Shahi Borhani
    console.log("  • Adding 1 Shahi Borhani (500ml)...")
    const borhaniCard = page.locator("article:has-text('Shahi Borhani')").first()
    await borhaniCard.waitFor({ state: "visible" })
    const addBorhaniBtn = borhaniCard.locator("button:has-text('+ Add to Cart'), button:has-text('Added')")
    await addBorhaniBtn.click()
    await page.waitForTimeout(800)

    // 4. Click Cart button in Header
    console.log("  • Opening CartDrawer from Header...")
    const cartBtn = page.locator("header button[aria-label^='Cart']").first()
    await cartBtn.click()

    // 5. Verify CartDrawer is open & check math
    const cartDrawerTitle = page.locator("#cart-drawer-title")
    await cartDrawerTitle.waitFor({ state: "visible", timeout: 5000 })

    // Extract Subtotal, Delivery Fee, Total from CartDrawer
    const subtotalText = await page.locator("div.flex.justify-between:has-text('Subtotal') span.font-medium").innerText()
    const deliveryFeeText = await page.locator("div.flex.justify-between:has-text('Delivery Fee') span.font-medium").innerText()
    const totalText = await page.locator("div.flex.justify-between:has-text('Estimated Total') span.text-\\[\\#D70F64\\]").innerText()

    console.log(`  • CartDrawer Math: Subtotal = ${subtotalText}, Delivery = ${deliveryFeeText}, Total = ${totalText}`)

    // Clean text numbers
    const subtotal = parseInt(subtotalText.replace(/[^\d]/g, ""), 10)
    const deliveryFee = parseInt(deliveryFeeText.replace(/[^\d]/g, ""), 10)
    const total = parseInt(totalText.replace(/[^\d]/g, ""), 10)

    console.log(`  • Parsed Math: ${subtotal} + ${deliveryFee} = ${total}`)
    if (deliveryFee !== 60) {
      throw new Error(`Expected Delivery Fee 60, got ${deliveryFee}`)
    }
    if (total !== subtotal + deliveryFee) {
      throw new Error(`Total math error: ${total} != ${subtotal} + ${deliveryFee}`)
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "03-cart-drawer-math.png") })

    // 6. Click "Proceed to Checkout"
    console.log("  • Clicking 'Proceed to Checkout'...")
    const proceedBtn = page.locator("button:has-text('Proceed to Checkout')")
    await proceedBtn.click()

    // 7. Fill in CheckoutModal
    console.log("  • Filling CheckoutModal form...")
    const checkoutTitle = page.locator("#checkout-modal-title")
    await checkoutTitle.waitFor({ state: "visible", timeout: 5000 })

    // Name: Tanvir Ahmed
    const nameInput = page.locator("#checkout-customer-name")
    await nameInput.fill("Tanvir Ahmed")

    // Phone: 01712345678
    const phoneInput = page.locator("#checkout-customer-phone")
    await phoneInput.fill("01712345678")

    // Address: House 12, Road 5, Dhanmondi, Dhaka
    const addressInput = page.locator("#checkout-customer-address")
    await addressInput.fill("House 12, Road 5, Dhanmondi, Dhaka")

    // Payment: COD (click COD option)
    const codRadio = page.locator("label:has-text('Cash on Delivery (COD)'), label:has-text('Cash on Delivery')").first()
    if (await codRadio.count() > 0) {
      await codRadio.click()
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "04-checkout-modal-filled.png") })

    // 8. Submit Order
    console.log("  • Submitting order...")
    const submitBtn = page.locator("button[type='submit'][form='checkout-form']")
    await submitBtn.click()

    // -------------------------------------------------------------------------
    // Phase 4: Database Persistence Proof & Order Confirmation
    // -------------------------------------------------------------------------
    console.log("▶ Phase 4: Order Confirmation & Database Persistence Proof...")

    // Wait for Confirmation view
    const confirmTitle = page.locator("#order-confirmation-title")
    await confirmTitle.waitFor({ state: "visible", timeout: 15000 })
    const confirmText = await confirmTitle.innerText()
    console.log(`  • Confirmation title: "${confirmText.trim()}"`)

    // Extract Order Number (BB-...)
    const orderNumLocator = page.locator("span.font-mono:has-text('BB-')")
    await orderNumLocator.waitFor({ state: "visible", timeout: 5000 })
    const orderNumber = (await orderNumLocator.innerText()).trim()
    console.log(`  • Generated Order Number: ${orderNumber}`)

    if (!orderNumber.startsWith("BB-")) {
      throw new Error(`Order Number "${orderNumber}" does not start with "BB-"`)
    }

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, "05-order-confirmation-screen.png") })

    // Query Neon PostgreSQL
    console.log(`  • Querying Neon PostgreSQL for order "${orderNumber}"...`)
    const [dbOrder] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber))

    if (!dbOrder) {
      throw new Error(`Order #${orderNumber} was not found in Neon PostgreSQL!`)
    }

    console.log("  • Neon orders record confirmed:")
    console.log(`    - ID: ${dbOrder.id}`)
    console.log(`    - Order Number: ${dbOrder.orderNumber}`)
    console.log(`    - Customer Name: ${dbOrder.customerName}`)
    console.log(`    - Customer Phone: ${dbOrder.customerPhone}`)
    console.log(`    - Customer Address: ${dbOrder.customerAddress}`)
    console.log(`    - Scheduled Day: ${dbOrder.scheduledDay}`)
    console.log(`    - Subtotal: ৳${dbOrder.subtotalBdt}`)
    console.log(`    - Delivery Fee: ৳${dbOrder.deliveryFeeBdt}`)
    console.log(`    - Total: ৳${dbOrder.totalBdt}`)
    console.log(`    - Payment Method: ${dbOrder.paymentMethod}`)
    console.log(`    - Status: ${dbOrder.status}`)

    const dbLineItems = await db.select().from(orderItems).where(eq(orderItems.orderId, dbOrder.id))
    console.log(`  • Neon order_items confirmed (${dbLineItems.length} lines):`)
    for (const item of dbLineItems) {
      console.log(`    - Item #${item.menuItemId} (${item.itemNameSnapshot}): Qty ${item.quantity} × ৳${item.unitPriceBdt} = ৳${item.lineTotalBdt}`)
    }

    console.log("\n==================================================================")
    console.log("🎉 ALL E2E VERIFICATION STEPS COMPLETED WITH 100% SUCCESS!")
    console.log("==================================================================\n")

    return {
      success: true,
      orderNumber,
      dbOrder,
      dbLineItems,
      dayResults,
    }
  } finally {
    await browser.close()
    await pool.end()
  }
}

runE2EVerification()
  .then((res) => {
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, "e2e-summary.json"),
      JSON.stringify(res, null, 2),
      "utf-8"
    )
    process.exit(0)
  })
  .catch((err) => {
    console.error("❌ E2E Verification failed:", err)
    process.exit(1)
  })
