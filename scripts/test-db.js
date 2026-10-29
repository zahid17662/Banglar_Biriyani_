import { neon } from "@neondatabase/serverless"
import "dotenv/config"

const connectionString = process.env.DATABASE_URL

console.log("Connecting to Neon database...")
const sql = neon(connectionString)

async function main() {
  try {
    const result = await sql`SELECT NOW() as current_time, version() as version`
    console.log("Connection successful!")
    console.log("Server time:", result[0].current_time)
    console.log("PostgreSQL version:", result[0].version)

    // List existing tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `
    console.log("Existing public tables:", tables)
  } catch (error) {
    console.error("Error connecting to Neon database:", error)
    process.exit(1)
  }
}

main()
