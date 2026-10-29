import { neon } from "@neondatabase/serverless"
import "dotenv/config"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn("⚠️ Warning: DATABASE_URL is not set in environment or .env file")
}

export const sql = connectionString ? neon(connectionString) : null

export async function checkDbConnection() {
  if (!sql) {
    return { ok: false, error: "DATABASE_URL is not configured" }
  }
  const start = Date.now()
  try {
    const res =
      await sql`SELECT NOW() as current_time, current_database() as db_name, version() as version`
    const latencyMs = Date.now() - start
    return {
      ok: true,
      serverTime: res[0].current_time,
      database: res[0].db_name,
      version: res[0].version,
      latencyMs,
      endpoint: connectionString.split("@")[1]?.split("/")[0] || "neon.tech",
    }
  } catch (err) {
    return { ok: false, error: err.message, latencyMs: Date.now() - start }
  }
}
