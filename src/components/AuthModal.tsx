import { useState, useEffect, useRef, type FormEvent } from "react"
import { useAuth } from "../context/AuthContext"
import { useBodyScrollLock } from "../hooks/useBodyScrollLock"
import { useFocusTrap } from "../hooks/useFocusTrap"

export function AuthModal() {
  const { isAuthModalOpen, authModalDefaultTab, closeAuthModal, login, signup } = useAuth()
  const modalRef = useRef<HTMLDivElement>(null)

  useBodyScrollLock(isAuthModalOpen)
  useFocusTrap(modalRef, isAuthModalOpen)

  const [activeTab, setActiveTab] = useState<"login" | "signup">("login")

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [showLoginPassword, setShowLoginPassword] = useState(false)

  // Signup form state
  const [signupFullName, setSignupFullName] = useState("")
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPhone, setSignupPhone] = useState("")
  const [signupAddress, setSignupAddress] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [showSignupPassword, setShowSignupPassword] = useState(false)

  // Status & error state
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const firstInputRef = useRef<HTMLInputElement>(null)

  // Synchronize active tab with context default tab when opened
  useEffect(() => {
    if (isAuthModalOpen) {
      setActiveTab(authModalDefaultTab)
      setErrorMessage(null)
      setTimeout(() => firstInputRef.current?.focus(), 50)
    }
  }, [isAuthModalOpen, authModalDefaultTab])

  // Close on Escape key
  useEffect(() => {
    if (!isAuthModalOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeAuthModal()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isAuthModalOpen, closeAuthModal])

  if (!isAuthModalOpen) return null

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setErrorMessage(null)

    if (!loginIdentifier.trim()) {
      setErrorMessage("Please enter your email or Bangladesh mobile number")
      return
    }
    if (!loginPassword) {
      setErrorMessage("Please enter your password")
      return
    }

    setIsLoading(true)
    const result = await login(loginIdentifier.trim(), loginPassword)
    setIsLoading(false)

    if (!result.ok) {
      setErrorMessage(result.error || "Sign in failed")
    }
  }

  const handleSignupSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (isLoading) return
    setErrorMessage(null)

    if (!signupFullName.trim()) {
      setErrorMessage("Full name is required")
      return
    }
    if (!signupEmail.trim() || !signupEmail.includes("@")) {
      setErrorMessage("Valid email address is required")
      return
    }
    if (!signupPhone.trim()) {
      setErrorMessage("Bangladesh mobile number is required")
      return
    }
    if (signupPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters")
      return
    }

    setIsLoading(true)
    const result = await signup({
      fullName: signupFullName.trim(),
      email: signupEmail.trim(),
      phone: signupPhone.trim(),
      defaultAddress: signupAddress.trim() || null,
      password: signupPassword,
    })
    setIsLoading(false)

    if (!result.ok) {
      setErrorMessage(result.error || "Registration failed")
    }
  }

  const fillDemoAccount = (identifier: string, password: string) => {
    setActiveTab("login")
    setLoginIdentifier(identifier)
    setLoginPassword(password)
    setErrorMessage(null)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal/60 backdrop-blur-xs transition-opacity"
        onClick={closeAuthModal}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl transition-all"
      >
        {/* Top Header with Brand Badge and Close Button */}
        <div className="relative border-b border-line bg-gradient-to-r from-white via-[#FDF2F7]/50 to-white px-6 pb-4 pt-6">
          <button
            type="button"
            onClick={closeAuthModal}
            className="absolute right-4 top-4 grid size-9 place-items-center rounded-full text-slate transition hover:bg-slate/10 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D70F64]"
            aria-label="Close authentication modal"
          >
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-full bg-[#D70F64] text-xs font-bold text-white shadow-xs">
              BB
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[#D70F64]">
              Banglar Biriyani
            </span>
          </div>

          <h2
            id="auth-modal-title"
            className="mt-2 text-2xl font-bold tracking-tight text-charcoal"
          >
            {activeTab === "login" ? "Welcome Back" : "Create Your Account"}
          </h2>
          <p className="mt-0.5 text-xs text-slate">
            {activeTab === "login"
              ? "Sign in to manage orders, schedule meals, and checkout faster."
              : "Register to earn rewards and enjoy 1-click authentic biriyani orders."}
          </p>

          {/* Tab Selector */}
          <div className="mt-4 flex rounded-xl bg-alabaster p-1 text-sm font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveTab("login")
                setErrorMessage(null)
              }}
              className={`flex-1 rounded-lg py-1.5 transition ${
                activeTab === "login"
                  ? "bg-white text-[#D70F64] shadow-xs"
                  : "text-slate hover:text-charcoal"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("signup")
                setErrorMessage(null)
              }}
              className={`flex-1 rounded-lg py-1.5 transition ${
                activeTab === "signup"
                  ? "bg-white text-[#D70F64] shadow-xs"
                  : "text-slate hover:text-charcoal"
              }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-start gap-2 border-b border-rose-200 bg-rose-50 px-6 py-2.5 text-xs font-medium text-rose-700"
          >
            <svg
              className="mt-0.5 size-4 shrink-0 text-rose-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6">
          {activeTab === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-charcoal"
                >
                  Email or Mobile Number
                </label>
                <div className="relative mt-1">
                  <input
                    ref={firstInputRef}
                    id="login-identifier"
                    type="text"
                    autoComplete="username"
                    placeholder="e.g., 01711000003 or customer@banglarbiriyani.com"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    required
                    className="block w-full rounded-xl border border-line bg-alabaster/40 px-3.5 py-2.5 text-sm text-charcoal transition placeholder:text-slate/60 focus:border-[#D70F64] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D70F64]/20"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-charcoal"
                >
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="block w-full rounded-xl border border-line bg-alabaster/40 px-3.5 py-2.5 pr-10 text-sm text-charcoal transition placeholder:text-slate/60 focus:border-[#D70F64] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D70F64]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-charcoal"
                    aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  >
                    <svg
                      className="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      {showLoginPassword ? (
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D70F64] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#B80C55] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D70F64]/30 disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <svg className="size-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Signing In...
                  </>
                ) : (
                  "Sign In to Banglar Biriyani"
                )}
              </button>

              {/* Quick Fill Demo Section */}
              <div className="pt-2">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-line" />
                  </div>
                  <span className="relative bg-white px-2 text-[11px] font-semibold uppercase tracking-wider text-slate">
                    Quick-Fill Demo Accounts
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => fillDemoAccount("customer@banglarbiriyani.com", "Customer@1234")}
                    className="flex flex-col items-center rounded-lg border border-line bg-alabaster/60 p-2 text-center transition hover:border-[#D70F64] hover:bg-[#FDF2F7]"
                  >
                    <span className="text-xs font-bold text-charcoal">Customer</span>
                    <span className="text-[10px] text-slate">Tanvir Ahmed</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoAccount("kitchen@banglarbiriyani.com", "Staff@1234")}
                    className="flex flex-col items-center rounded-lg border border-line bg-alabaster/60 p-2 text-center transition hover:border-[#D70F64] hover:bg-[#FDF2F7]"
                  >
                    <span className="text-xs font-bold text-charcoal">Kitchen Staff</span>
                    <span className="text-[10px] text-slate">Chef Rahim</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fillDemoAccount("admin@banglarbiriyani.com", "Admin@1234")}
                    className="flex flex-col items-center rounded-lg border border-line bg-alabaster/60 p-2 text-center transition hover:border-[#D70F64] hover:bg-[#FDF2F7]"
                  >
                    <span className="text-xs font-bold text-charcoal">Admin</span>
                    <span className="text-[10px] text-slate">Owner</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignupSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="signup-fullname"
                  className="block text-xs font-semibold text-charcoal"
                >
                  Full Name
                </label>
                <input
                  ref={firstInputRef}
                  id="signup-fullname"
                  type="text"
                  placeholder="e.g., Tanvir Ahmed"
                  value={signupFullName}
                  onChange={(e) => setSignupFullName(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-xl border border-line bg-alabaster/40 px-3.5 py-2 text-sm text-charcoal transition placeholder:text-slate/60 focus:border-[#D70F64] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D70F64]/20"
                />
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-xs font-semibold text-charcoal">
                  Email Address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="name@example.com"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-xl border border-line bg-alabaster/40 px-3.5 py-2 text-sm text-charcoal transition placeholder:text-slate/60 focus:border-[#D70F64] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D70F64]/20"
                />
              </div>

              <div>
                <label htmlFor="signup-phone" className="block text-xs font-semibold text-charcoal">
                  Bangladesh Mobile Number
                </label>
                <input
                  id="signup-phone"
                  type="tel"
                  placeholder="017XXXXXXXX"
                  value={signupPhone}
                  onChange={(e) => setSignupPhone(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-xl border border-line bg-alabaster/40 px-3.5 py-2 text-sm text-charcoal transition placeholder:text-slate/60 focus:border-[#D70F64] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D70F64]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-address"
                  className="block text-xs font-semibold text-charcoal"
                >
                  Default Dhaka Delivery Address
                </label>
                <input
                  id="signup-address"
                  type="text"
                  placeholder="House, Road, Area (e.g., Dhanmondi, Dhaka)"
                  value={signupAddress}
                  onChange={(e) => setSignupAddress(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-line bg-alabaster/40 px-3.5 py-2 text-sm text-charcoal transition placeholder:text-slate/60 focus:border-[#D70F64] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D70F64]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="signup-password"
                  className="block text-xs font-semibold text-charcoal"
                >
                  Password (min 8 chars)
                </label>
                <div className="relative mt-1">
                  <input
                    id="signup-password"
                    type={showSignupPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    minLength={8}
                    className="block w-full rounded-xl border border-line bg-alabaster/40 px-3.5 py-2 pr-10 text-sm text-charcoal transition placeholder:text-slate/60 focus:border-[#D70F64] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#D70F64]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate hover:text-charcoal"
                    aria-label={showSignupPassword ? "Hide password" : "Show password"}
                  >
                    <svg
                      className="size-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      {showSignupPassword ? (
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24M1 1l22 22" />
                      ) : (
                        <>
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D70F64] py-3 text-sm font-bold text-white shadow-md transition hover:bg-[#B80C55] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D70F64]/30 disabled:opacity-70"
              >
                {isLoading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
