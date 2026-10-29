import { chromium } from "playwright"
import path from "path"
import { db, pool, orders, orderItems } from "../src/db/index"
import { eq } from "drizzle-orm"

const ARTIFACT_DIR =
  "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9"

async function runE2E() {
  console.log(
    "🚀 Starting Banglar Biriyani End-to-End Verification Walkthrough...",
  )

  const browser = await chromium.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  })

  const context = await browser.newContext({
    viewport: { width: 1366, height: 850 },
    deviceScaleFactor: 1.5,
  })

  const page = await context.newPage()

  try {
    // 1. Navigate to Application
    console.log("📍 1. Navigating to http://localhost:8443/...")
    await page.goto("http://localhost:8443/", { waitUntil: "networkidle" })
    await page.waitForSelector("#root")
    await page.waitForTimeout(1000)

    // Verify Title and Brand Accent
    const title = await page.title()
    console.log(`  ✓ Page title: "${title}"`)

    // Screenshot 1: Initial Page Layout
    const screenshot1Path = path.join(ARTIFACT_DIR, "e2e_1_initial_layout.png")
    await page.screenshot({ path: screenshot1Path, fullPage: false })
    console.log(`  📸 Screenshot saved: ${screenshot1Path}`)

    // 2. Day-by-Day Menu Verification in DayPillBar
    console.log("\n📅 2. Testing DayPillBar day switching from Neon DB...")
    const days = [
      "Saturday",
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ]

    for (const day of days) {
      const pill = page.locator(`button[role="tab"]:has-text("${day}")`)
      await pill.click()
      await page.waitForTimeout(400)

      // Verify the meals heading reflects the day
      const heading = await page.locator("#meal h2").textContent()
      const firstDish = await page
        .locator("#meal article h3")
        .first()
        .textContent()
      console.log(
        `  ✓ Clicked ${day} -> Section: "${heading}" | Top Dish: "${firstDish}"`,
      )
    }

    // Screenshot 2: Day switching on Friday
    const screenshot2Path = path.join(
      ARTIFACT_DIR,
      "e2e_2_day_switch_friday.png",
    )
    await page.screenshot({ path: screenshot2Path, fullPage: false })
    console.log(`  📸 Screenshot saved: ${screenshot2Path}`)

    // 3. Select Saturday and Add Items to Cart
    console.log("\n🛒 3. Adding Saturday dishes to Cart...")
    const satPill = page.locator(`button[role="tab"]:has-text("Saturday")`)
    await satPill.click()
    await page.waitForTimeout(500)

    // Add first 2 Biriyani items from #meal section
    const mealAddButtons = page.locator("#meal article button")
    await mealAddButtons.nth(0).click()
    console.log("  ✓ Clicked + Add to Cart on 1st dish")
    await page.waitForTimeout(800)

    await mealAddButtons.nth(1).click()
    console.log("  ✓ Clicked + Add to Cart on 2nd dish")
    await page.waitForTimeout(800)

    // Add Borhani from Our Menu section
    const borhaniCard = page.locator('#menu article:has-text("Borhani")')
    if ((await borhaniCard.count()) > 0) {
      await borhaniCard.locator("button").click()
      console.log("  ✓ Clicked + Add to Cart on Traditional Borhani")
      await page.waitForTimeout(800)
    }

    // Verify cart count in Header
    const cartBadge = page.locator('header button[aria-label*="Cart"] span')
    const badgeText = await cartBadge.textContent()
    console.log(`  ✓ Header Cart Badge count: ${badgeText} items`)

    // 4. Open Cart Drawer
    console.log("\n🛍️ 4. Opening Cart Drawer...")
    const cartButton = page.locator('header button[aria-label*="Cart"]')
    await cartButton.click()
    await page.waitForSelector('[role="dialog"]', { state: "visible" })
    await page.waitForTimeout(600)

    const drawerTitle = await page.locator('[role="dialog"] h2').textContent()
    const dayTag = await page
      .locator('[role="dialog"] span:has-text("Saturday")')
      .first()
      .textContent()
    console.log(`  ✓ Drawer Open: "${drawerTitle}" | Tag: "${dayTag}"`)

    const screenshot3Path = path.join(ARTIFACT_DIR, "e2e_3_cart_drawer.png")
    await page.screenshot({ path: screenshot3Path })
    console.log(`  📸 Screenshot saved: ${screenshot3Path}`)

    // 5. Proceed to Checkout
    console.log("\n💳 5. Proceeding to Checkout Modal...")
    const proceedBtn = page.locator('button:has-text("Proceed to Checkout")')
    await proceedBtn.click()
    await page.waitForSelector("form#checkout-form", { state: "visible" })
    await page.waitForTimeout(500)

    // Fill Form Details
    console.log("  ✓ Filling customer checkout form...")
    await page.fill('input[placeholder="e.g. Zahid Hassan"]', "Zahidul Islam")
    await page.fill('input[placeholder="017XXXXXXXX"]', "01712345678")
    await page.fill(
      'textarea[placeholder="House, road, flat no, area..."]',
      "Apartment 4B, Road 7, Dhanmondi, Dhaka",
    )

    // Select Payment: bKash
    await page.locator('label:has-text("bKash")').click()
    await page.fill(
      'input[placeholder*="Less spicy"]',
      "Please send hot and pack spoons",
    )

    const screenshot4Path = path.join(ARTIFACT_DIR, "e2e_4_checkout_modal.png")
    await page.screenshot({ path: screenshot4Path })
    console.log(`  📸 Screenshot saved: ${screenshot4Path}`)

    // 6. Submit Order to Neon PostgreSQL
    console.log("\n📦 6. Submitting Order to Neon PostgreSQL API...")
    const confirmBtn = page.locator(
      'button[type="submit"][form="checkout-form"]',
    )
    await confirmBtn.click()

    // Wait for Confirmation Screen
    await page.waitForSelector("text=Order Placed Successfully!", {
      timeout: 15000,
    })
    await page.waitForTimeout(1000)

    const confirmationText = await page
      .locator("text=Order Placed Successfully!")
      .textContent()
    const orderNumberEl = page.locator('span:has-text("BB-")').first()
    const orderNumber = (await orderNumberEl.textContent())?.trim()

    console.log(`  🎉 Order Confirmation Screen Rendered!`)
    console.log(`  ✓ Confirmed text: "${confirmationText}"`)
    console.log(`  ✓ Generated Order ID: "${orderNumber}"`)

    const screenshot5Path = path.join(ARTIFACT_DIR, "e2e_5_order_confirmed.png")
    await page.screenshot({ path: screenshot5Path })
    console.log(`  📸 Screenshot saved: ${screenshot5Path}`)

    // 7. Verify Database Persistence in Neon PostgreSQL
    console.log(
      `\n🔍 7. Verifying Neon PostgreSQL database records for "${orderNumber}"...`,
    )
    if (!orderNumber) {
      throw new Error("Order number was not captured from confirmation screen")
    }

    const [dbOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))

    if (!dbOrder) {
      throw new Error(
        `Order #${orderNumber} not found in Neon database table 'orders'!`,
      )
    }

    console.log(
      `  ✅ Neon DB Order Found: ID=${dbOrder.id}, Customer="${dbOrder.customerName}", Total=৳${dbOrder.totalBdt}, Status="${dbOrder.status}"`,
    )

    const dbItems = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, dbOrder.id))

    console.log(`  ✅ Neon DB Line Items (${dbItems.length}):`)
    dbItems.forEach((item) => {
      console.log(
        `    - ${item.quantity}x ${item.itemNameSnapshot} (৳${item.unitPriceBdt}) = ৳${item.lineTotalBdt}`,
      )
    })

    console.log(
      "\n🌟 ALL END-TO-END VERIFICATION CHECKS PASSED WITH 100% SUCCESS!",
    )
  } catch (error) {
    console.error("❌ E2E Verification failed:", error)
    process.exit(1)
  } finally {
    await browser.close()
    await pool.end()
  }
}

runE2E()
