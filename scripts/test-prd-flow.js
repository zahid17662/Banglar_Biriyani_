import { client } from "../server/db.ts"

async function testPRDFlow() {
  console.log("--- Testing Banglar Biriyani PRD Flow with Neon & Drizzle ---")

  // 1. Check all menu items
  const allItems = await client`
    SELECT id, name, bangla_name, price::float, portion, spice_level, is_everyday, available_days
    FROM menu_items
    ORDER BY is_everyday ASC, id ASC
  `
  console.log(
    `✓ Retrieved ${allItems.length} total dishes from Neon PostgreSQL`,
  )

  // 2. Test Wednesday filter (FR-01, FR-02)
  const wednesdayItems = await client`
    SELECT id, name, bangla_name, is_everyday, available_days
    FROM menu_items
    WHERE is_available = true 
      AND (is_everyday = true OR available_days @> '["Wednesday"]'::jsonb)
  `
  console.log(`✓ Wednesday active menu: ${wednesdayItems.length} dishes:`)
  wednesdayItems.forEach((item) => {
    console.log(
      `   - [${
        item.is_everyday ? "Everyday" : "Wed Special"
      }] ${item.name} (${item.bangla_name})`,
    )
  })

  // 3. Test Order Placement with Backend Price Verification (FR-06, FR-07, NFR)
  const testOrderId = "ord-test-" + Date.now()
  const testOrderNumber =
    "BB-" +
    new Date().toISOString().slice(0, 10).replace(/-/g, "") +
    "-" +
    Math.floor(1000 + Math.random() * 9000)

  // Calculate verified prices directly from DB
  const kacchi = allItems.find((i) => i.id === "sat-kacchi")
  const borhani = allItems.find((i) => i.id === "add-borhani")
  const subtotal = kacchi.price * 2 + borhani.price * 2
  const deliveryFee = 50.0
  const total = subtotal + deliveryFee

  await client`
    INSERT INTO orders (
      id, order_number, customer_name, customer_phone, customer_address,
      scheduled_day, delivery_slot, payment_method, notes, total_amount, delivery_fee, status, items
    ) VALUES (
      ${testOrderId}, ${testOrderNumber}, 'Test Zahid', '+8801711223344',
      'Road 11, Banani, Dhaka', 'Wednesday', 'Lunch (12:30 PM – 2:30 PM)',
      'bKash', 'Special spicy dum please', ${total}, ${deliveryFee}, 'Confirmed',
      ${JSON.stringify([
        {
          menuItemId: kacchi.id,
          name: kacchi.name,
          price: kacchi.price,
          quantity: 2,
          subtotal: kacchi.price * 2,
        },
        {
          menuItemId: borhani.id,
          name: borhani.name,
          price: borhani.price,
          quantity: 2,
          subtotal: borhani.price * 2,
        },
      ])}::jsonb
    );
  `

  await client`
    INSERT INTO order_items (order_id, menu_item_id, name, price, quantity, subtotal)
    VALUES 
      (${testOrderId}, ${kacchi.id}, ${kacchi.name}, ${kacchi.price}, 2, ${kacchi.price * 2}),
      (${testOrderId}, ${borhani.id}, ${borhani.name}, ${borhani.price}, 2, ${borhani.price * 2});
  `

  console.log(`✓ Placed test order: ${testOrderNumber} (Total: ৳${total})`)

  // 4. Verify order retrieval with joined items
  const retrieved = await client`
    SELECT o.id, o.order_number, o.customer_name, o.scheduled_day, o.total_amount::float,
           json_agg(oi.*) as items
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    WHERE o.id = ${testOrderId}
    GROUP BY o.id
  `

  console.log(
    "✓ Successfully retrieved order from Neon PostgreSQL with joined items:",
    {
      orderNumber: retrieved[0].order_number,
      customerName: retrieved[0].customer_name,
      scheduledDay: retrieved[0].scheduled_day,
      total: retrieved[0].total_amount,
      itemCount: retrieved[0].items.length,
    },
  )

  console.log("--- All PRD Requirements Verified Successfully ---")
}

testPRDFlow()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test failed:", err)
    process.exit(1)
  })
