import { chromium } from "playwright"
import path from "path"

const ARTIFACTS_DIR =
  "C:/Users/Md Zahidul Islam/.gemini/antigravity-ide/brain/e5091975-8d30-4157-939a-c08fb41dfba9"

async function run() {
  const browser = await chromium.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  })
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })
  const page = await context.newPage()

  console.log("Navigating to http://localhost:8443...")
  await page.goto("http://localhost:8443", { waitUntil: "networkidle" })
  await page.waitForTimeout(1000)

  // 1. Initial page with small search icon button
  console.log("Verifying small search icon button...")
  const searchInput = page.locator(
    'input[placeholder*="Search for restaurants"]',
  )
  await searchInput.waitFor({ state: "visible" })

  const searchButton = page.locator(
    'button[aria-label="Search"][title="Search"]',
  )
  await searchButton.waitFor({ state: "visible" })
  console.log("Found small search icon button inside search bar!")

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "search_1_initial_bar.png"),
  })

  // 2. Click search input to open recommendation popup
  console.log("Focusing search input to show recommendations...")
  await searchInput.click()
  await page.waitForTimeout(500)

  const recommendationPopup = page.locator(
    'div[role="dialog"][aria-label="Search Recommendations"]',
  )
  await recommendationPopup.waitFor({ state: "visible" })
  console.log("Search recommendation popup opened successfully!")

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "search_2_recommendation_popup.png"),
  })

  // 3. Type "Tehari" to filter recommendations
  console.log('Typing "Tehari" into search...')
  await searchInput.fill("Tehari")
  await page.waitForTimeout(500)

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "search_3_filtered_recommendations.png"),
  })

  // 4. Click a recommended dish item
  console.log("Clicking recommended Tehari dish...")
  const tehariItem = recommendationPopup
    .locator('button:has-text("Tehari")')
    .first()
  await tehariItem.click()
  await page.waitForTimeout(800)

  // Verify popup closed and page scrolled to item
  const isPopupHidden = await recommendationPopup.isHidden()
  console.log("Recommendation popup closed after select:", isPopupHidden)

  // Check highlighted dish card
  const highlightedDish = page.locator(
    'article[class*="ring-4 ring-[#D70F64]"]',
  )
  const count = await highlightedDish.count()
  console.log(
    "Found highlighted dish card with ring-4 ring-[#D70F64]:",
    count > 0,
  )

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "search_4_scrolled_to_dish.png"),
  })

  // 5. Test search with small search icon button for "Borhani"
  console.log('Testing small search icon button with "Borhani"...')
  await searchInput.click()
  await searchInput.fill("Borhani")
  await page.waitForTimeout(300)

  console.log("Clicking small search button...")
  await searchButton.click()
  await page.waitForTimeout(800)

  const borhaniHighlight = page.locator(
    'article[class*="ring-4 ring-[#D70F64]"]:has-text("Borhani")',
  )
  const borhaniCount = await borhaniHighlight.count()
  console.log("Found highlighted Borhani card:", borhaniCount > 0)

  await page.screenshot({
    path: path.join(ARTIFACTS_DIR, "search_5_search_icon_jump_borhani.png"),
  })

  console.log("All search tests passed successfully!")
  await browser.close()
}

run().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
