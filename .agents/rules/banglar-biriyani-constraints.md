---
paths:
  - "**/*"
---

# Banglar Biriyani Permanent Project Invariants

This rule file defines permanent project constraints and architectural invariants that must be strictly followed across all future turns and development tasks.

## 1. Brand Identity
- **Brand Name**: "Banglar Biriyani"
- All customer-facing references, headers, footers, meta titles, and UI text must use the official brand name "Banglar Biriyani".

## 2. Color System
- **Primary Accent Color**: `#D70F64` (Tailwind `--color-brand`)
- **Hover / Active State**: `#B80C55` (Tailwind `--color-brand-hover`)
- **Light Tint / Soft Background**: `#FDF2F7` (Tailwind `--color-brand-light`)
- Consistent use across buttons, badges, highlights, borders, and active indicators.

## 3. UI Preservation Rule
- **NEVER alter the layout, DOM hierarchy, spacing, or visual design** of the existing Figma Make components:
  - `src/App.tsx`
  - `src/components/Header.tsx`
  - `src/components/Hero.tsx`
  - `src/components/DayPillBar.tsx`
  - `src/components/ProductCard.tsx`
  - `src/components/Footer.tsx`
- Layout dimensions, grid structures, flex ordering, paddings, margins, and component hierarchies must remain intact. Only theme token updates or non-breaking text updates explicitly requested by the user are permitted.

## 4. Database Security Rule
- **NEVER expose `DATABASE_URL` in client-side `VITE_*` environment variables.**
- Database connection strings, database credentials, and secret server keys must remain strictly on the backend / server environment and must never be prefixed with `VITE_` or bundled into client code.
