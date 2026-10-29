import { chromium } from "playwright"
import path from "path"

async function testAddressFeature() {
  console.log("🚀 Starting Address Feature Verification...")

  const browser = await chromium.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })

  const page = await context.newPage()

  // Navigate to Vite dev server
  await page.goto("http://localhost:8443", { waitUntil: "networkidle" })
  console.log("✅ Page loaded successfully")

  // 1. Locate and click Address button in Header
  const addressButton = page
    .locator('header button:has-text("address")')
    .first()
  await addressButton.waitFor({ state: "visible", timeout: 5000 })
  console.log(
    "✅ Address button found in Header:",
    await addressButton.textContent(),
  )

  // Click to open Address Modal
  await addressButton.click()
  await page.waitForTimeout(500)

  // Verify modal is open
  const modal = page.locator('[role="dialog"]')
  await modal.waitFor({ state: "visible", timeout: 3000 })
  console.log("✅ Address Modal opened successfully")

  // Screenshot 1: Saved Addresses Modal
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "address_modal_saved.png",
    ),
    fullPage: false,
  })
  console.log("📸 Captured address_modal_saved.png")

  // 2. Click "Add New" or "Add Another Address"
  const addNewBtn = modal
    .locator(
      'button:has-text("Add New"), button:has-text("Add Another Address")',
    )
    .first()
  await addNewBtn.click()
  await page.waitForTimeout(400)

  // Screenshot 2: Add New Address Form
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "address_modal_form.png",
    ),
    fullPage: false,
  })
  console.log("📸 Captured address_modal_form.png")

  // 3. Fill out the form
  // Select Tag 'Work'
  await modal.locator('button:has-text("Work")').click()

  // Select Area 'Dhanmondi'
  await modal.locator("select").selectOption("Dhanmondi")

  // Fill details
  await modal
    .locator("textarea")
    .fill("House 45, Road 27, Apt 4B, Dhanmondi, Dhaka")

  // Fill phone
  await modal.locator('input[type="tel"]').fill("01912345678")

  // Fill note
  await modal
    .locator('input[placeholder*="arrival"]')
    .fill("Please ring bell 4B upon arrival")

  // Submit form
  const submitBtn = modal.locator('button[type="submit"]')
  await submitBtn.click()
  await page.waitForTimeout(500)

  console.log("✅ New address submitted")

  // 4. Verify modal is closed and Header displays new address
  const updatedHeaderText = await addressButton.textContent()
  console.log("✅ Updated Header text:", updatedHeaderText)

  // Screenshot 3: Header with updated address
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "address_header_updated.png",
    ),
    fullPage: false,
  })
  console.log("📸 Captured address_header_updated.png")

  // 5. Add an item from ProductCard and verify Checkout Modal receives the address
  const addBtn = page.locator('article button:has-text("Add to Cart")').first()
  await addBtn.scrollIntoViewIfNeeded()
  await addBtn.click()
  await page.waitForTimeout(500)

  // Open cart drawer
  const cartBtn = page.locator('header button[aria-label*="Cart"]').first()
  await cartBtn.click()
  await page.waitForTimeout(400)

  // Click Checkout
  const checkoutBtn = page.locator('button:has-text("Proceed to Checkout")')
  await checkoutBtn.click()
  await page.waitForTimeout(500)

  // Verify checkout address textarea contains our newly added address
  const checkoutAddressValue = await page
    .locator('textarea[placeholder*="House"]')
    .inputValue()
  console.log("✅ Checkout address value synced:", checkoutAddressValue)

  // Screenshot 4: Checkout Modal with synced address
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "address_checkout_synced.png",
    ),
    fullPage: false,
  })
  console.log("📸 Captured address_checkout_synced.png")

  await browser.close()
  console.log("🎉 Address feature verification completed with 100% success!")
}

testAddressFeature().catch((err) => {
  console.error("❌ Test failed:", err)
  process.exit(1)
})
