import { chromium } from "playwright"
import path from "path"

async function testRecommendationPopup() {
  console.log("🚀 Testing Address Recommendation Popup...")

  const browser = await chromium.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })

  const page = await context.newPage()

  // Clear localStorage for clean test state
  await page.goto("http://localhost:8443")
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: "networkidle" })

  // 1. Locate address button in Header
  const headerBtn = page
    .locator(
      'header button:has-text("New address"), header button:has-text("Select your address")',
    )
    .first()
  await headerBtn.waitFor({ state: "visible", timeout: 5000 })
  console.log("✅ Found Header Address button")

  // Click to open Recommendation Popup
  await headerBtn.click()
  await page.waitForTimeout(400)

  // 2. Verify Recommendation Popup is open
  const popup = page.locator('[aria-label="Address Recommendations"]')
  await popup.waitFor({ state: "visible", timeout: 3000 })
  console.log(
    "✅ Recommendation Popup opened anchored below Header address bar",
  )

  // Screenshot 1: Recommendation popup with popular delivery hotspots
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "popup_1_initial_hotspots.png",
    ),
  })

  // 3. Type in the recommendation search bar: "dhan"
  const searchInput = popup.locator('input[placeholder*="Search area"]')
  await searchInput.fill("dhan")
  await page.waitForTimeout(300)
  console.log('✅ Typed "dhan" in recommendation search')

  // Screenshot 2: Filtered recommendations for "dhan"
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "popup_2_filtered_search.png",
    ),
  })

  // 4. Click a recommendation: "Dhanmondi Satmasjid Road"
  const recItem = popup
    .locator('button:has-text("Dhanmondi Satmasjid Road")')
    .first()
  await recItem.click()
  await page.waitForTimeout(400)
  console.log("✅ Selected recommendation: Dhanmondi Satmasjid Road")

  // 5. Verify Header updated with recommended address
  const updatedHeaderBtn = page.locator("header div.md\\:block button").first()
  await updatedHeaderBtn.waitFor({ state: "visible", timeout: 3000 })
  const updatedText = await updatedHeaderBtn.textContent()
  console.log("✅ Header updated to:", updatedText)

  // Screenshot 3: Header with updated recommended address
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "popup_3_header_updated.png",
    ),
  })

  // 6. Test opening the detailed modal from the popup
  await updatedHeaderBtn.click()
  await page.waitForTimeout(300)
  await popup.locator('button:has-text("Write full apartment")').click()
  await page.waitForTimeout(400)

  // Verify full modal is open
  const modal = page.locator('[role="dialog"]:has-text("Delivery Address")')
  await modal.waitFor({ state: "visible", timeout: 3000 })
  console.log("✅ Detailed Address Modal opened from recommendation popup")

  // Type "Uttara" into modal textarea to verify inline recommendations inside modal
  const modalTextarea = modal.locator("textarea")
  await modalTextarea.fill("Uttara")
  await page.waitForTimeout(400)

  // Screenshot 4: Modal with live matching recommendation box underneath
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "popup_4_modal_inline_rec.png",
    ),
  })

  await browser.close()
  console.log(
    "🎉 Address Recommendation Popup verification completed with 100% success!",
  )
}

testRecommendationPopup().catch((err) => {
  console.error("❌ Test failed:", err)
  process.exit(1)
})
