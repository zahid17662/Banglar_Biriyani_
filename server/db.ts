import { drizzle } from "drizzle-orm/neon-http"
import { neon } from "@neondatabase/serverless"
import "dotenv/config"
import * as schema from "./schema.ts"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.warn("⚠️ Warning: DATABASE_URL is not set in environment or .env file")
}

export const client = connectionString ? neon(connectionString) : null
export const db = client ? drizzle(client, { schema }) : null

export async function checkDbConnection() {
  if (!client) {
    return { ok: false, error: "DATABASE_URL is not configured" }
  }
  const start = Date.now()
  try {
    const res =
      await client`SELECT NOW() as current_time, current_database() as db_name, version() as version`
    const latencyMs = Date.now() - start
    return {
      ok: true,
      serverTime: res[0].current_time,
      database: res[0].db_name,
      version: res[0].version,
      latencyMs,
      endpoint: connectionString?.split("@")[1]?.split("/")[0] || "neon.tech",
    }
  } catch (err: any) {
    return { ok: false, error: err.message, latencyMs: Date.now() - start }
  }
}
