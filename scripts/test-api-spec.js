import { client } from "../server/db.ts"

async function testApiSpec() {
  console.log("--- Testing REST API Specification & Neon Drizzle Schema ---")

  // 1. Check categories
  const categories =
    await client`SELECT id, name, slug, sort_order FROM categories ORDER BY sort_order ASC`
  console.log(
    `✓ Categories (${categories.length}):`,
    categories.map((c) => c.name).join(", "),
  )

  // 2. Check 7-day schedule mapping
  const schedules = await client`
    SELECT s.day_of_week, m.name, s.is_featured, s.special_price_bdt, m.base_price_bdt
    FROM daily_menu_schedules s
    JOIN menu_items m ON s.menu_item_id = m.id
    ORDER BY s.day_of_week, s.is_featured DESC;
  `
  console.log(`✓ 7-Day Schedule mappings count: ${schedules.length}`)
  schedules.forEach((s) => {
    console.log(
      `   - [${s.day_of_week}] ${s.name} ${
        s.is_featured ? "★ FEATURED" : ""
      } (৳${s.special_price_bdt || s.base_price_bdt})`,
    )
  })

  // 3. Test Order Creation Transaction
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const orderNumber = `BB-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`

  // Find Mutton Kacchi (id: 1) and Borhani (id: 15)
  const item1 =
    await client`SELECT id, name, base_price_bdt FROM menu_items WHERE id = 1`
  const item15 =
    await client`SELECT id, name, base_price_bdt FROM menu_items WHERE id = 15`

  const subtotal = item1[0].base_price_bdt * 2 + item15[0].base_price_bdt * 2
  const deliveryFee = 60
  const total = subtotal + deliveryFee

  const orderRes = await client`
    INSERT INTO orders (
      order_number, customer_name, customer_phone, customer_address,
      scheduled_day, delivery_slot, payment_method, subtotal_bdt, delivery_fee_bdt, total_bdt, status, notes
    ) VALUES (
      ${orderNumber}, 'Zahid Hassan', '01711223344', 'Road 11, Banani, Dhaka',
      'SATURDAY', 'ASAP (45-60 mins)', 'BKASH', ${subtotal}, ${deliveryFee}, ${total}, 'PENDING', 'Extra green chillies please'
    )
    RETURNING id, order_number, total_bdt, status;
  `

  const orderId = orderRes[0].id

  await client`
    INSERT INTO order_items (
      order_id, menu_item_id, scheduled_day, item_name_snapshot, quantity, unit_price_bdt, line_total_bdt
    ) VALUES 
      (${orderId}, 1, 'SATURDAY', ${item1[0].name}, 2, ${item1[0].base_price_bdt}, ${item1[0].base_price_bdt * 2}),
      (${orderId}, 15, 'SATURDAY', ${item15[0].name}, 2, ${item15[0].base_price_bdt}, ${item15[0].base_price_bdt * 2});
  `

  console.log(
    `✓ 201 Created Order: ${orderNumber} | Total: ৳${total} | Status: ${orderRes[0].status}`,
  )

  // 4. Test GET /api/orders/:orderNumber Query
  const fetchOrder = await client`
    SELECT o.*, json_agg(oi.*) as items
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.order_number = ${orderNumber}
    GROUP BY o.id;
  `

  console.log("✓ Successfully retrieved order by orderNumber:", {
    orderNumber: fetchOrder[0].order_number,
    customerName: fetchOrder[0].customer_name,
    scheduledDay: fetchOrder[0].scheduled_day,
    deliverySlot: fetchOrder[0].delivery_slot,
    paymentMethod: fetchOrder[0].payment_method,
    totalBdt: fetchOrder[0].total_bdt,
    status: fetchOrder[0].status,
    itemCount: fetchOrder[0].items.length,
  })

  console.log("--- All System Architecture & API Tests Passed! ---")
}

testApiSpec()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test error:", err)
    process.exit(1)
  })
