type Props = {
  image: string
  alt: string
  badge: string
  title: string
  highlight: string
  subtitle: string
  body: string
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
  compact?: boolean
}

export function Hero({
  image,
  alt,
  badge,
  title,
  highlight,
  subtitle,
  body,
  primary,
  secondary,
  compact,
}: Props) {
  return (
    <section className="relative isolate overflow-hidden bg-charcoal">
      <img src={image} alt={alt} className="absolute inset-0 -z-10 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-charcoal via-charcoal/80 to-charcoal/10" />
      <div
        className={`mx-auto flex max-w-7xl flex-col justify-center px-4 py-14 sm:px-6 lg:px-8 ${
          compact
            ? "min-h-[340px] lg:min-h-[400px]"
            : "min-h-[420px] md:min-h-[480px] lg:min-h-[520px]"
        }`}
      >
        <span className="text-display w-fit rounded-full bg-saffron px-3 py-1.5 text-xs text-charcoal">
          {badge}
        </span>
        <h2
          className={`text-display mt-5 max-w-2xl text-white ${
            compact ? "text-4xl sm:text-5xl lg:text-6xl" : "text-5xl sm:text-6xl lg:text-7xl"
          }`}
        >
          {title} <span className="text-saffron">{highlight}</span>
        </h2>
        <p className="text-display mt-4 text-xl text-white/80 sm:text-2xl">
          <span className="text-[#D70F64]">—</span> {subtitle}
        </p>
        <p className="mt-4 max-w-md text-white/70">{body}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={primary.href}
            className="inline-flex h-12 items-center rounded-full bg-[#D70F64] px-7 text-sm font-semibold text-white transition hover:bg-[#B80C55]"
          >
            {primary.label}
          </a>
          {secondary && (
            <a
              href={secondary.href}
              className="inline-flex h-12 items-center rounded-full border border-white/30 px-7 text-sm font-semibold text-white transition hover:bg-white hover:text-charcoal"
            >
              {secondary.label}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}
