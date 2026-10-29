import { checkDbConnection, sql } from "../server/db.js"

async function testAll() {
  console.log("Testing Neon DB Integration...")

  // 1. Health
  const health = await checkDbConnection()
  console.log("1. Health Check:", health)

  // 2. Query Menu Items
  const menu = await sql`SELECT id, name, price::float FROM menu_items LIMIT 3`
  console.log("2. Sample Menu items from Neon:", menu)

  // 3. Query Meals
  const meals = await sql`SELECT id, name, price::float FROM meals LIMIT 3`
  console.log("3. Sample Meals from Neon:", meals)

  // 4. Query Orders
  const orders =
    await sql`SELECT id, customer_name, total_amount::float, status FROM orders LIMIT 3`
  console.log("4. Sample Orders from Neon:", orders)

  console.log("All Neon database queries completed successfully!")
}

testAll().catch((err) => {
  console.error("Test failed:", err)
  process.exit(1)
})
