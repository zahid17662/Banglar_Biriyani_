import express from "express"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import "dotenv/config"
import { apiRouter } from "./server/apiRouter.js"
import { checkDbConnection } from "./server/db.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 8443

app.use(cors())
app.use(express.json())

// API Endpoints
app.use("/api", apiRouter)

// Serve static frontend build if present
const distPath = path.resolve(__dirname, "dist")
app.use(express.static(distPath))

app.get("*", (req, res, next) => {
  if (req.url.startsWith("/api")) return next()
  res.sendFile(path.join(distPath, "index.html"))
})

async function start() {
  const conn = await checkDbConnection()
  if (conn.ok) {
    console.log(`✓ Connected to Neon Database (${conn.endpoint})`)
    console.log(
      `✓ Neon Server time: ${conn.serverTime} (latency: ${conn.latencyMs}ms)`,
    )
  } else {
    console.error("⚠️ Neon connection failed:", conn.error)
  }

  app.listen(PORT, () => {
    console.log(
      `🚀 Banglar Biriyani server running at http://localhost:${PORT}`,
    )
  })
}

start()
