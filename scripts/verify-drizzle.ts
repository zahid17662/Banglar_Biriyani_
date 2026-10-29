import {
  db,
  pool,
  categories,
  menuItems,
  dailyMenuSchedules,
  orders,
  orderItems,
} from "../src/db/index"
import { eq } from "drizzle-orm"

async function verify() {
  console.log("🔍 Verifying Neon + Drizzle ORM setup...")

  const allCategories = await db.select().from(categories)
  console.log(`Categories count: ${allCategories.length}`)
  allCategories.forEach((c) =>
    console.log(`  - [${c.id}] ${c.name} (${c.slug})`),
  )

  const allItems = await db.select().from(menuItems)
  console.log(`\nMenu items count: ${allItems.length}`)

  const allSchedules = await db.select().from(dailyMenuSchedules)
  console.log(`Daily schedules count: ${allSchedules.length}`)

  // Inspect Saturday items
  const saturdayItems = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      basePrice: menuItems.basePriceBdt,
      isFeatured: dailyMenuSchedules.isFeatured,
    })
    .from(dailyMenuSchedules)
    .innerJoin(menuItems, eq(dailyMenuSchedules.menuItemId, menuItems.id))
    .where(eq(dailyMenuSchedules.dayOfWeek, "SATURDAY"))

  console.log(`\nSaturday menu items (${saturdayItems.length}):`)
  saturdayItems.forEach((i) =>
    console.log(
      `  ${i.isFeatured ? "⭐ [FEATURED]" : "•"} ${i.name} - ৳${i.basePrice}`,
    ),
  )

  // Inspect Friday items
  const fridayItems = await db
    .select({
      id: menuItems.id,
      name: menuItems.name,
      basePrice: menuItems.basePriceBdt,
      isFeatured: dailyMenuSchedules.isFeatured,
    })
    .from(dailyMenuSchedules)
    .innerJoin(menuItems, eq(dailyMenuSchedules.menuItemId, menuItems.id))
    .where(eq(dailyMenuSchedules.dayOfWeek, "FRIDAY"))

  console.log(`\nFriday menu items (${fridayItems.length}):`)
  fridayItems.forEach((i) =>
    console.log(
      `  ${i.isFeatured ? "⭐ [FEATURED]" : "•"} ${i.name} - ৳${i.basePrice}`,
    ),
  )

  // Inspect Orders & Items
  const allOrders = await db.select().from(orders)
  console.log(`\nOrders count: ${allOrders.length}`)
  if (allOrders.length > 0) {
    const o = allOrders[0]
    console.log(
      `  Order #${o.orderNumber} for ${o.customerName} (${o.scheduledDay}) - ৳${o.totalBdt} [${o.status}]`,
    )
    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, o.id))
    items.forEach((item) =>
      console.log(
        `    - ${item.quantity}x ${item.itemNameSnapshot} (৳${item.unitPriceBdt}) = ৳${item.lineTotalBdt}`,
      ),
    )
  }

  await pool.end()
  console.log("\n✨ Database verification completed successfully!")
}

verify().catch((err) => {
  console.error("Verification failed:", err)
  process.exit(1)
})
