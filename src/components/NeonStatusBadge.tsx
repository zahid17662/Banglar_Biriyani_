import { useEffect, useState } from "react"
import { fetchDbHealth, type DbHealth } from "../lib/api"

type Props = {
  onOpenOrders: () => void
}

export function NeonStatusBadge({ onOpenOrders }: Props) {
  const [health, setHealth] = useState<DbHealth | null>(null)
  const [loading, setLoading] = useState(true)

  const check = async () => {
    setLoading(true)
    const data = await fetchDbHealth()
    setHealth(data)
    setLoading(false)
  }

  useEffect(() => {
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  const isConnected = health?.ok === true

  return (
    <div className="border-b border-line/60 bg-gradient-to-r from-charcoal via-[#1a1b1e] to-charcoal text-white text-xs py-1.5 px-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="relative flex h-2 w-2">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? "animate-ping bg-emerald-400" : "bg-rose-400"
              }`}
            />
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
          </span>

          <span className="font-medium tracking-wide">Neon PostgreSQL:</span>

          {loading && !health ? (
            <span className="text-slate-400">Pinging database...</span>
          ) : isConnected ? (
            <span className="flex items-center gap-2 text-emerald-400">
              <span className="font-semibold">Connected</span>
              <span className="hidden sm:inline text-white/50">•</span>
              <span className="hidden sm:inline text-white/80 font-mono text-[11px]">
                {health?.endpoint}
              </span>
              {health?.latencyMs !== undefined && (
                <span className="rounded bg-emerald-950/80 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300 border border-emerald-800/60">
                  {health.latencyMs}ms
                </span>
              )}
            </span>
          ) : (
            <span className="text-rose-400 font-medium">
              Disconnected: {health?.error || "Cannot reach API"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={check}
            className="hidden sm:inline-flex items-center gap-1 text-[11px] text-white/70 hover:text-white transition"
            title="Refresh database ping"
          >
            <svg
              className={`size-3 ${loading ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span>Ping</span>
          </button>

          <button
            type="button"
            onClick={onOpenOrders}
            className="flex items-center gap-1.5 rounded-full bg-saffron/20 border border-saffron/40 px-2.5 py-0.5 text-[11px] font-semibold text-saffron transition hover:bg-saffron hover:text-charcoal"
          >
            <svg
              className="size-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            </svg>
            <span>Neon DB Orders</span>
          </button>
        </div>
      </div>
    </div>
  )
}
