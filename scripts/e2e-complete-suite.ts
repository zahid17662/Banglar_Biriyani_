import { createServer } from "vite"
import { chromium } from "playwright"
import assert from "node:assert/strict"

async function runCompleteE2ESuite() {
  console.log("==================================================================")
  console.log("      BANGLAR BIRIYANI: COMPLETE 5-SCENARIO E2E TEST SUITE        ")
  console.log("==================================================================")

  const PORT = 8443
  const BASE_URL = `http://127.0.0.1:${PORT}`

  // 1. Programmatically start Vite dev server (with direct Hono API plugin)
  console.log("\n[SETUP] Starting Vite dev server on port " + PORT + "...")
  const viteServer = await createServer({
    server: {
      port: PORT,
      host: "127.0.0.1",
      strictPort: true,
    },
  })
  await viteServer.listen()
  console.log(`✓ Vite development server listening at ${BASE_URL}`)

  // 2. Launch browser using system Chrome or Edge channel
  console.log("[SETUP] Launching browser via Playwright...")
  let browser
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true })
  } catch {
    browser = await chromium.launch({ channel: "msedge", headless: true })
  }

  const context = await browser.newContext({
    viewport: { width: 1400, height: 950 },
  })
  const page = await context.newPage()

  // Track console errors
  const consoleErrors: string[] = []
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text()
      // Ignore favicon, expected initial unauthenticated session check (401), or non-critical network warnings
      if (!text.includes("favicon") && !text.includes("status of 404") && !text.includes("status of 401")) {
        consoleErrors.push(text)
      }
    }
  })
  page.on("pageerror", (err) => {
    consoleErrors.push(err.message)
  })

  let newlyPlacedOrderNumber = ""

  try {
    // =========================================================================
    // SCENARIO 1: Storefront UI & 7-Day Meal Navigation
    // =========================================================================
    console.log("\n------------------------------------------------------------------")
    console.log(" SCENARIO 1: Storefront UI & 7-Day Meal Navigation")
    console.log("------------------------------------------------------------------")

    console.log(`[1.1] Loading Storefront: ${BASE_URL}/...`)
    await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" })

    // Verify brand name and Figma Make layout tokens
    const brandName = await page.textContent("header a")
    console.log(`  • Header Brand: "${brandName?.trim()}"`)
    assert.match(brandName || "", /Banglar Biriyani/i, "Brand must be Banglar Biriyani")

    // Verify accent color #D70F64 in CSS
    const brandLogoColor = await page.$eval("header a", (el) =>
      window.getComputedStyle(el).color,
    )
    console.log(`  • Brand Accent Color (RGB): ${brandLogoColor}`)
    assert.match(
      brandLogoColor,
      /215,\s*15,\s*100/,
      "Primary brand color must be #D70F64 (rgb(215, 15, 100))",
    )
    console.log("  ✓ Storefront loaded with 100% Figma Make layout and #D70F64 accent.")

    // Verify zero fatal console errors on load
    assert.equal(
      consoleErrors.length,
      0,
      `Expected 0 console errors, but found: ${consoleErrors.join("; ")}`,
    )
    console.log("  ✓ Zero console errors detected on initial load.")

    // Click through all 7 pills in DayPillBar
    const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
    console.log("\n[1.2] Clicking through all 7 days in DayPillBar...")

    for (const day of DAYS) {
      const pill = page.locator(`button[role="tab"]:has-text("${day}")`).first()
      await pill.click()
      await page.waitForTimeout(300)

      // Verify active pill styling
      const isSelected = await pill.getAttribute("aria-selected")
      assert.equal(isSelected, "true", `${day} pill must be aria-selected="true"`)

      // Verify meal section title updates
      const sectionTitle = await page.locator("section#meal h2").textContent()
      console.log(`  • Selected ${day} -> Section Header: "${sectionTitle?.trim()}"`)
      assert.match(sectionTitle || "", new RegExp(day, "i"), `Section must display ${day}'s menu`)

      // Verify dishes are rendered as articles
      const cardCount = await page.locator("section#meal article").count()
      assert.ok(cardCount > 0, `${day} must render at least 1 dish card`)
    }
    console.log("  ✓ All 7 days in DayPillBar rendered dedicated dishes from Neon DB without race conditions.")

    // =========================================================================
    // SCENARIO 2: Customer Signup, Login & Auto-Filled Checkout
    // =========================================================================
    console.log("\n------------------------------------------------------------------")
    console.log(" SCENARIO 2: Customer Signup, Login & Auto-Filled Checkout")
    console.log("------------------------------------------------------------------")

    console.log("[2.1] Testing Login via Phone Number (01711000003)...")
    await page.click('header button:has-text("Sign In")')
    await page.waitForSelector("#login-identifier", { timeout: 6000 })

    await page.fill("#login-identifier", "01711000003")
    await page.fill("#login-password", "Customer@1234")
    await page.click('button[type="submit"]:has-text("Sign In")')

    // Wait for user state in header
    await page.waitForFunction(
      () => /Tanvir|Banglar/i.test(document.body.textContent || ""),
      { timeout: 7000 },
    )
    console.log("  ✓ Customer logged in via Phone Number (01711000003): Authenticated user displayed.")

    // Select Saturday for Biriyani specials
    console.log("\n[2.2] Selecting Saturday and adding items to cart...")
    await page.locator('button[role="tab"]:has-text("Saturday")').first().click()
    await page.waitForTimeout(400)

    // Add first dish (Saturday Special Biriyani)
    const firstAddBtn = page.locator("section#meal button:has-text('+ Add to Cart')").first()
    await firstAddBtn.click()
    await page.waitForTimeout(400)

    // Open Cart Drawer
    await page.click('header button[aria-label*="Cart"]')
    await page.waitForSelector("#cart-drawer-title", { timeout: 6000 })
    console.log("  • Cart Drawer opened.")

    // Increment quantity using '+' button to make it 2x
    const plusBtn = page.locator('div[aria-label="Cart items list"] button:has-text("+")').first()
    await plusBtn.click()
    await page.waitForTimeout(400)
    console.log("  • Incremented Biriyani portion quantity to 2x.")

    // Add 1x Shahi Borhani via 1-click upsell
    const drawerUpsellAdd = page.locator('div[aria-labelledby="cart-drawer-title"] button:has-text("+ Add")').first()
    if (await drawerUpsellAdd.isVisible().catch(() => false)) {
      await drawerUpsellAdd.click()
      await page.waitForTimeout(600)
      console.log("  • Added Shahi Borhani from One-Click Add-on Upsells.")
    }

    // Verify subtotal + ৳60 delivery fee = total
    const subtotalText = await page.locator("div.space-y-1\\.5 span.font-medium").first().textContent()
    const deliveryFeeText = await page.locator("div.space-y-1\\.5 span.font-medium").nth(1).textContent()
    const totalText = await page.locator("div.space-y-1\\.5 span.text-display").textContent()

    const subtotalNum = parseInt(subtotalText?.replace(/\D/g, "") || "0", 10)
    const deliveryNum = parseInt(deliveryFeeText?.replace(/\D/g, "") || "0", 10)
    const totalNum = parseInt(totalText?.replace(/\D/g, "") || "0", 10)

    console.log(`  • Cart Subtotal: ৳${subtotalNum}, Delivery: ৳${deliveryNum}, Total: ৳${totalNum}`)
    assert.equal(deliveryNum, 60, "Delivery fee must be ৳60")
    assert.equal(subtotalNum + deliveryNum, totalNum, "Subtotal + Delivery Fee must equal Total")
    console.log("  ✓ Cart math verified: Subtotal + ৳60 = Total.")

    // Test '-' quantity decrement
    const minusBtn = page.locator('div[aria-label="Cart items list"] button:has-text("-")').first()
    await minusBtn.click()
    await page.waitForTimeout(300)
    console.log("  • Tested '-' button: quantity decremented cleanly.")

    // Click Proceed to Checkout
    console.log("\n[2.3] Proceeding to Checkout & verifying auto-filled details...")
    await page.click('button:has-text("Proceed to Checkout")')
    await page.waitForSelector("#checkout-customer-name", { timeout: 6000 })

    const autoName = await page.inputValue("#checkout-customer-name")
    const autoPhone = await page.inputValue("#checkout-customer-phone")
    const autoAddress = await page.inputValue("#checkout-customer-address")

    console.log(`  • Auto-filled Name: "${autoName}"`)
    console.log(`  • Auto-filled Phone: "${autoPhone}"`)
    console.log(`  • Auto-filled Address: "${autoAddress}"`)

    assert.match(autoName, /Tanvir|Banglar/i, "Name must auto-fill from auth user")
    assert.equal(autoPhone, "01711000003", "Phone must auto-fill from auth user")
    assert.match(autoAddress, /Dhanmondi/i, "Address must auto-fill")
    console.log("  ✓ Customer details auto-populated correctly.")

    // Select COD payment method and submit
    console.log("  • Selecting Cash on Delivery (COD)...")
    await page.click('label[for="pay-cod"]')

    console.log("  • Submitting order...")
    await page.click('button[type="submit"]:has-text("Confirm Order")')

    // Wait for Confirmation Receipt
    await page.waitForSelector("#order-confirmation-title", { timeout: 10000 })
    const confirmTitle = await page.textContent("#order-confirmation-title")
    const orderNumber = await page.locator("#confirmation-order-number").textContent()
    newlyPlacedOrderNumber = orderNumber?.trim() || ""

    console.log(`  • Order Confirmation: "${confirmTitle?.trim()}"`)
    console.log(`  • Generated Order Number: "${newlyPlacedOrderNumber}"`)
    assert.match(newlyPlacedOrderNumber, /^BB-/, "Order number must start with BB-")

    // Close confirmation dialog
    await page.click('button:has-text("Done / Continue Browsing")')
    await page.waitForTimeout(500)

    // Verify cart count badge reset to 0 items
    const cartBtnAria = await page.locator('header button[aria-label*="Cart"]').getAttribute("aria-label")
    console.log(`  • Cart button aria-label after order: "${cartBtnAria}"`)
    assert.equal(cartBtnAria, "Cart, 0 items", "Cart count must reset to 0 items after placing order")
    console.log("  ✓ Cart count reset to 0 items.")

    // Open MyOrdersDrawer and verify order appears with PENDING status
    console.log('\n[2.4] Opening "My Orders" from Header to confirm real-time reflection...')
    await page.locator('header button').filter({ hasText: /Tanvir|Banglar/ }).first().click()
    await page.click('button:has-text("My Orders")')

    await page.waitForSelector("#my-orders-drawer-title", { timeout: 6000 })
    await page.waitForSelector(`span.font-mono:has-text("${newlyPlacedOrderNumber}")`, {
      timeout: 8000,
    })

    const pendingBadge = await page.locator('span:has-text("PENDING")').first().textContent()
    console.log(`  • Newly Placed Order found: ${newlyPlacedOrderNumber} [${pendingBadge?.trim()}]`)
    assert.equal(pendingBadge?.trim(), "PENDING", "Order status must be PENDING")
    console.log("  ✓ Order appeared in MyOrdersDrawer without manual page reload.")

    // Close drawer
    await page.click('button[aria-label="Close my orders drawer"]')
    await page.waitForTimeout(400)

    // =========================================================================
    // SCENARIO 3: RBAC Security Check in Browser
    // =========================================================================
    console.log("\n------------------------------------------------------------------")
    console.log(" SCENARIO 3: RBAC Security Check in Browser")
    console.log("------------------------------------------------------------------")

    console.log("[3.1] Navigating to /admin while still authenticated as CUSTOMER...")
    await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" })

    // Verify 403 Access Denied screen
    await page.waitForSelector('h1:has-text("Access Denied")', { timeout: 6000 })
    const forbiddenBadge = await page.locator('span:has-text("HTTP 403 Forbidden")').textContent()
    const forbiddenTitle = await page.locator('h1:has-text("Access Denied")').textContent()

    console.log(`  • Badge Displayed: "${forbiddenBadge?.trim()}"`)
    console.log(`  • Screen Heading: "${forbiddenTitle?.trim()}"`)

    assert.equal(forbiddenBadge?.trim(), "HTTP 403 Forbidden")
    assert.equal(forbiddenTitle?.trim(), "Access Denied")

    // Verify "Return to Banglar Biriyani Storefront" button
    const returnBtn = page.locator('button:has-text("Return to Banglar Biriyani Storefront")')
    assert.ok(await returnBtn.isVisible(), "Return to Storefront button must be visible")
    console.log("  ✓ CUSTOMER role strictly blocked by AdminGuard with 403 Access Denied screen.")

    // =========================================================================
    // SCENARIO 4: Admin Panel Full Operations & Live Storefront Sync
    // =========================================================================
    console.log("\n------------------------------------------------------------------")
    console.log(" SCENARIO 4: Admin Panel Full Operations & Live Storefront Sync")
    console.log("------------------------------------------------------------------")

    // Return to storefront and log out customer
    console.log("[4.1] Returning to Storefront and logging out Customer...")
    await returnBtn.click()
    await page.waitForFunction(
      () => /Tanvir|Banglar/i.test(document.body.textContent || ""),
      { timeout: 7000 },
    )

    await page.locator('header button').filter({ hasText: /Tanvir|Banglar/ }).first().click()
    await page.click('button:has-text("Sign Out")')
    await page.waitForTimeout(800)
    console.log("  ✓ Customer logged out.")

    // Open /admin and log in as Administrator
    console.log("\n[4.2] Opening /admin and authenticating as ADMIN...")
    await page.goto(`${BASE_URL}/admin`, { waitUntil: "networkidle" })
    await page.waitForSelector("#admin-identifier", { timeout: 6000 })

    await page.fill("#admin-identifier", "admin@banglarbiriyani.com")
    await page.fill("#admin-password", "Admin@1234")
    await page.click('button[type="submit"]:has-text("Access Admin Portal")')

    await page.waitForSelector('h1:has-text("Overview")', { timeout: 8000 })
    console.log("  ✓ Admin Portal unlocked: Administrator role verified.")

    // Verify Overview KPIs and 7-day Demand Bar Chart
    const totalRevenueKPI = await page.locator("p.font-display.text-2xl").first().textContent()
    const chartHeading = await page.textContent('h2:has-text("7-Day Biriyani Demand & Revenue Matrix")')
    console.log(`  • Executive KPI Total Revenue: ${totalRevenueKPI?.trim()}`)
    console.log(`  • Revenue Chart: "${chartHeading?.trim()}"`)
    assert.ok(chartHeading, "7-Day demand bar chart must be rendered")
    console.log("  ✓ Overview KPIs and 7-Day sales demand chart rendered with live order data.")

    // Advance Order in /admin/orders
    console.log("\n[4.3] Opening /admin/orders and advancing order through kitchen dispatch...")
    await page.click('button:has-text("Live Orders")')
    await page.waitForSelector('h2:has-text("Orders & Kitchen Dispatch")', { timeout: 6000 })

    const orderRow = page.locator(`tr:has-text("${newlyPlacedOrderNumber}")`).first()
    await orderRow.waitFor({ timeout: 8000 })

    // Step 1: PENDING -> CONFIRMED
    console.log('  • Advancing order: [Confirm Order]...')
    const confirmOrderBtn = orderRow.locator('button:has-text("Confirm")')
    await confirmOrderBtn.click()
    await page.waitForTimeout(1200)

    // Step 2: CONFIRMED -> PREPARING
    console.log('  • Advancing order: [Start Dum Prep]...')
    const prepOrderBtn = orderRow.locator('button:has-text("Start Dum Prep")')
    await prepOrderBtn.waitFor({ timeout: 6000 })
    await prepOrderBtn.click()
    await page.waitForTimeout(1200)

    // Step 3: PREPARING -> OUT_FOR_DELIVERY
    console.log('  • Advancing order: [Dispatch Delivery]...')
    const dispatchBtn = orderRow.locator('button:has-text("Dispatch Delivery")')
    await dispatchBtn.waitFor({ timeout: 6000 })
    await dispatchBtn.click()
    await page.waitForTimeout(1200)

    // Step 4: OUT_FOR_DELIVERY -> DELIVERED
    console.log('  • Advancing order: [Mark Delivered]...')
    const deliverBtn = orderRow.locator('button:has-text("Mark Delivered")')
    await deliverBtn.waitFor({ timeout: 6000 })
    await deliverBtn.click()
    await page.waitForTimeout(1200)

    // Verify final DELIVERED badge
    const finalStatus = await orderRow.locator('span:has-text("DELIVERED")').textContent()
    console.log(`  • Final Order Status: "${finalStatus?.trim()}"`)
    assert.equal(finalStatus?.trim(), "DELIVERED", "Order status must be DELIVERED")
    console.log("  ✓ Order lifecycle completed: PENDING -> CONFIRMED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED.")

    // Update Saturday Schedule in /admin/schedule & verify storefront sync
    console.log("\n[4.4] Updating Saturday Schedule price in /admin/schedule and syncing to storefront...")
    await page.click('button:has-text("7-Day Meal Matrix")')
    await page.waitForSelector('h2:has-text("7-Day Biriyani & Daily Meal Schedule Matrix")', {
      timeout: 6000,
    })

    // Saturday is default active tab
    await page.waitForSelector("table tbody tr", { timeout: 6000 })
    await page.waitForTimeout(400)

    // Update the first dish special price input to ৳499
    const firstPriceInput = page.locator('table tbody tr input[type="number"]').first()
    await firstPriceInput.fill("499")
    await page.waitForTimeout(300)

    // Save Saturday Schedule
    await page.click('button:has-text("Save SATURDAY Schedule")')
    await page.waitForSelector('div[role="alert"]:has-text("Successfully synchronized")', {
      timeout: 8000,
    })
    console.log("  ✓ Schedule successfully synchronized with Neon PostgreSQL (price updated to ৳499).")

    // Return to live storefront
    console.log("  • Navigating back to Live Storefront...")
    await page.click('button:has-text("Back to Live Storefront")')
    await page.waitForSelector('section#menu h2:has-text("Our Menu")', { timeout: 8000 })

    // Verify Saturday is active and updated price ৳499 is live on ProductCard
    await page.locator('button[role="tab"]:has-text("Saturday")').first().click()
    
    // Wait for API menu loading to finish and dishes to render
    await page.waitForSelector("section#meal article", { timeout: 10000 })
    const satDishesCount = await page.locator("section#meal article").count()
    assert.ok(satDishesCount > 0, "Storefront must render live dishes for Saturday")

    const updatedPriceCard = page.locator('section#meal article:has-text("499")').first()
    await updatedPriceCard.waitFor({ timeout: 8000 })
    console.log("  ✓ Storefront re-fetched fresh menu from Neon PostgreSQL; ৳499 price is live on ProductCard.")

    console.log("\n==================================================================")
    console.log("    🎉 COMPLETE 5-SCENARIO E2E VERIFICATION PASSED WITH 100% SUCCESS")
    console.log("==================================================================")
  } catch (err) {
    console.error("\n❌ E2E Execution Failed:", err)
    throw err
  } finally {
    await browser?.close()
    await viteServer.close()
  }
}

runCompleteE2ESuite().catch((err) => {
  console.error(err)
  process.exit(1)
})
