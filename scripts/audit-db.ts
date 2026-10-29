import { db, pool } from "../src/db/index"
import { sql } from "drizzle-orm"

async function audit() {
  console.log("--- DATABASE AUDIT ---")

  // Check counts
  const tables = [
    "categories",
    "menu_items",
    "daily_menu_schedules",
    "orders",
    "order_items",
  ]
  for (const t of tables) {
    const res = await db.execute(sql.raw(`SELECT count(*) FROM "${t}";`))
    console.log(`Table ${t}: ${res.rows[0].count} rows`)
  }

  // Check indexes
  console.log("\n--- INDEXES AUDIT ---")
  const indexRes = await db.execute(sql`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `)
  for (const row of indexRes.rows) {
    console.log(`[${row.tablename}] ${row.indexname}: ${row.indexdef}`)
  }

  // EXPLAIN query on daily schedule
  console.log("\n--- EXPLAIN QUERY PLAN (Menu for Saturday) ---")
  const explainRes = await db.execute(sql`
    EXPLAIN ANALYZE
    SELECT m.id, m.name, m.base_price_bdt, c.name as category_name
    FROM daily_menu_schedules s
    JOIN menu_items m ON s.menu_item_id = m.id
    JOIN categories c ON m.category_id = c.id
    WHERE s.day_of_week = 'SATURDAY' AND m.is_available = true;
  `)
  for (const row of explainRes.rows) {
    console.log(row["QUERY PLAN"])
  }

  await pool.end()
}

audit().catch(console.error)
