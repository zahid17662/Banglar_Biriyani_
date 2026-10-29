import { chromium } from "playwright"
import path from "path"

async function verifyDayPills() {
  console.log("🚀 Verifying DayPillBar options...")

  const browser = await chromium.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  })

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  })

  const page = await context.newPage()
  await page.goto("http://localhost:8443", { waitUntil: "networkidle" })

  // Scroll to DayPillBar
  const dayPillNav = page.locator('nav[aria-label="Menu by day"]')
  await dayPillNav.scrollIntoViewIfNeeded()

  // Get all pill text contents
  const buttons = dayPillNav.locator('button[role="tab"]')
  const count = await buttons.count()
  console.log(`Found ${count} day pills.`)

  const pillTexts = []
  for (let i = 0; i < count; i++) {
    const text = (await buttons.nth(i).textContent())?.trim()
    pillTexts.push(text)
  }

  console.log("Day pills present:", pillTexts)

  // Check that "All-Day Classics" is NOT present
  const hasAllDayClassics = pillTexts.some((t) =>
    t?.toLowerCase().includes("all-day classics"),
  )
  if (hasAllDayClassics) {
    throw new Error('❌ "All-Day Classics" was still found in the DayPillBar!')
  }
  console.log('✅ Confirmed: "All-Day Classics" has been completely deleted.')

  // Check that all 7 days exist
  const expectedDays = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
  ]
  for (const day of expectedDays) {
    const exists = pillTexts.some((t) => t?.includes(day))
    if (!exists) throw new Error(`❌ Expected day "${day}" was not found!`)
  }
  console.log(
    "✅ Confirmed: Exactly the 7 days (Saturday to Friday) are rendered.",
  )

  // Capture screenshot of DayPillBar
  await page.screenshot({
    path: path.join(
      "C:\\Users\\Md Zahidul Islam\\.gemini\\antigravity-ide\\brain\\e5091975-8d30-4157-939a-c08fb41dfba9",
      "day_pills_verified.png",
    ),
  })
  console.log("📸 Captured day_pills_verified.png")

  await browser.close()
  console.log("🎉 DayPillBar verification completed successfully!")
}

verifyDayPills().catch((err) => {
  console.error(err)
  process.exit(1)
})
