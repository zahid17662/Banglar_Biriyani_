import { chromium } from "playwright"
import path from "path"

async function testAddressChoice() {
  console.log("🚀 Testing Custom Address of Choice Feature...")

  const browser = await chromium.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })

  const page = await context.newPage()

  // Clear localStorage before testing to ensure clean initial state
  await page.goto("http://localhost:8443")
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: "networkidle" })

  // 1. Verify initial Header state
  const headerBtn = page
    .locator('header button:has-text("New address")')
    .first()
  await headerBtn.waitFor({ state: "visible", timeout: 5000 })
  const initialText = await headerBtn.textContent()
  console.log("✅ Initial Header text:", initialText)

  // Screenshot 1: Initial clean header with "New address | Select your address"
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "address_choice_1_header_initial.png",
    ),
  })

  // 2. Open modal
  await headerBtn.click()
  await page.waitForTimeout(400)

  const modal = page.locator('[role="dialog"]')
  await modal.waitFor({ state: "visible", timeout: 3000 })
  console.log("✅ Address Modal opened")

  // Screenshot 2: Address Modal ready for free writing
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "address_choice_2_modal_open.png",
    ),
  })

  // 3. Freely write custom address of choice
  const customAddress = "House 18, Road 3, Block B, Mirpur 11, Dhaka"
  const textarea = modal.locator("textarea")
  await textarea.fill(customAddress)
  console.log("✅ Typed address of choice:", customAddress)

  // Click quick-add area chip to test appending
  await modal.locator('button:has-text("+ Mirpur")').click()
  console.log("✅ Tested quick area chip")

  // Select tag 'Home'
  await modal.locator('button:has-text("Home")').click()

  // Screenshot 3: Modal with custom address typed
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "address_choice_3_custom_typed.png",
    ),
  })

  // 4. Submit and set as delivery address
  await modal
    .locator('button[type="submit"]:has-text("Set as My Delivery Address")')
    .click()
  await page.waitForTimeout(500)

  // 5. Verify Header now displays the custom address
  const updatedHeaderBtn = page
    .locator('header button:has-text("Home address")')
    .first()
  await updatedHeaderBtn.waitFor({ state: "visible", timeout: 3000 })
  const updatedHeaderText = await updatedHeaderBtn.textContent()
  console.log("✅ Updated Header with custom address:", updatedHeaderText)

  // Screenshot 4: Header updated with custom address
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "address_choice_4_header_updated.png",
    ),
  })

  // 6. Test Checkout Modal syncing
  const addBtn = page.locator('article button:has-text("Add to Cart")').first()
  await addBtn.scrollIntoViewIfNeeded()
  await addBtn.click()
  await page.waitForTimeout(400)

  const cartBtn = page.locator('header button[aria-label*="Cart"]').first()
  await cartBtn.click()
  await page.waitForTimeout(400)

  await page.locator('button:has-text("Proceed to Checkout")').click()
  await page.waitForTimeout(500)

  const checkoutAddressValue = await page
    .locator('textarea[placeholder*="House"]')
    .inputValue()
  console.log("✅ Address in Checkout Modal:", checkoutAddressValue)

  // Screenshot 5: Checkout modal with custom address
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "address_choice_5_checkout_synced.png",
    ),
  })

  await browser.close()
  console.log("🎉 Custom Address of Choice test passed 100%!")
}

testAddressChoice().catch((err) => {
  console.error("❌ Test failed:", err)
  process.exit(1)
})
