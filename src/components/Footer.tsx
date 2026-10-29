const SOCIALS = ["Facebook", "Instagram", "YouTube"]

export function Footer() {
  return (
    <footer className="bg-charcoal text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="text-display text-2xl text-[#D70F64]">Banglar Biriyani</p>
          <p className="mt-3 max-w-xs text-sm text-white/60">
            The royal taste of Bengal, cooked fresh every day.
          </p>
        </div>
        <div>
          <p className="text-display text-sm text-saffron">Contact</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>House 12, Road 7, Dhanmondi, Dhaka</li>
            <li>
              <a href="tel:+8809612000000" className="hover:text-white">
                +880 9612-000000
              </a>
            </li>
            <li>
              <a href="mailto:hello@banglarbiriyani.com" className="hover:text-white">
                hello@banglarbiriyani.com
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-display text-sm text-saffron">Follow Us</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SOCIALS.map((s) => (
              <li key={s}>
                <a
                  href="#"
                  className="inline-flex h-10 items-center rounded-full border border-white/20 px-4 text-sm transition hover:border-[#D70F64] hover:bg-[#D70F64]"
                >
                  {s}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/50 sm:px-6 lg:px-8">
          © 2025 Banglar Biriyani. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
