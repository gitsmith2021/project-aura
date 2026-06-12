I am rebuilding the Aura 1.0 landing page to Awwwards level quality.
Read AURA_ROADMAP.md for full project context first.

**This is a FULL REPLACEMENT of `src/components/landing/LandingPage.tsx`.**
Before writing any code, read that file in full — it is the live landing page
and contains content that must be preserved (re-themed with the new animation
system, not dropped): the "Book a Free Demo" lead-capture form, the NAAC
criterion mapping table, the Aura-vs-Legacy-ERP comparison table, the pricing
tiers, the tech stack cards, the testimonial/marquee social proof, the nav
links, and the floating WhatsApp contact button (`waPulse` animation). Each
section below maps old content → new animated treatment explicitly.

## Goal
Build a stunning, fully responsive, Awwwards-quality landing page for Aura 1.0
using GSAP, ScrollTrigger, Lenis smooth scroll, and Three.js (via React Three Fiber).
Animation style: Subtle & professional — Apple.com level. No gimmicks. Every 
animation must serve the message.

## Tech Stack
- Next.js 16.2.4 App Router (existing project) — this fork has breaking changes
  vs. what training data assumes about Next.js; read `node_modules/next/dist/docs/`
  for the relevant guide before writing code, per AGENTS.md
- TypeScript strict
- Tailwind CSS
- GSAP + @gsap/react + ScrollTrigger plugin
- Lenis (smooth scroll)
- Three.js via @react-three/fiber + @react-three/drei
- Lucide React icons
- Existing color palette: Violet (#7C3AED), Purple (#6D28D9), Emerald (#10B981)

## Install These Packages First
```bash
npm install gsap @gsap/react lenis @react-three/fiber @react-three/drei three
npm install --save-dev @types/three
```

## File Structure to Create

No new route is created — this replaces the existing component tree at
`src/components/landing/`, which `src/app/page.tsx` already imports
(`import { LandingPage } from "@/components/landing/LandingPage"`).

```
src/components/landing/
├── LandingPage.tsx                   ← Main export (Client Component — replaces existing file)
├── SmoothScrollProvider.tsx          ← Lenis initialization
├── Navbar.tsx                        ← Sticky nav with scroll-aware styling
├── Hero/
│   ├── HeroSection.tsx               ← Hero wrapper incl. lead-capture demo form
│   ├── HeroScene.tsx                 ← Three.js canvas (dynamically imported)
│   └── HeroText.tsx                  ← GSAP word-by-word headline reveal
├── Features/
│   ├── FeaturesSection.tsx           ← Horizontal scroll pin container
│   └── FeaturePanel.tsx              ← Individual feature card
├── Stats/
│   └── StatsSection.tsx              ← Animated number counters + social proof
├── Accreditation/
│   └── AccreditationSection.tsx      ← NAAC criterion → module mapping
├── Comparison/
│   └── ComparisonSection.tsx         ← Aura vs legacy ERP table
├── Pricing/
│   └── PricingSection.tsx            ← Pricing cards with stagger
├── TechStack/
│   └── TechStackSection.tsx          ← "Built with" tech strip
├── CTA/
│   └── CTASection.tsx                ← Final call to action
└── Footer.tsx                        ← Footer + WhatsApp contact button
```

---

## 1. SmoothScrollProvider.tsx

- Initialize Lenis with: duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
- Connect Lenis to GSAP ticker: gsap.ticker.add((time) => lenis.raf(time * 1000))
- gsap.ticker.lagSmoothing(0)
- Provide lenis instance via React context
- Must be a Client Component ('use client')
- Wrap the JSX returned by LandingPage.tsx with it — no separate route layout
  is created or needed

---

## 2. Navbar.tsx
Apple-style sticky nav:
- Transparent on mount
- On scroll past 80px: `backdrop-blur-xl bg-white/80 dark:bg-slate-950/90 border-b border-white/20 dark:border-slate-800/70`
- Transition: smooth 300ms
- Logo: "AURA" with violet gradient text + small "Platform" badge (carry over from current navbar)
- Nav links (smooth-scroll to section anchors, same as current page): Features, Accreditation, Why AURA, Pricing, Tech Stack, Contact
- Right side: dark/light mode toggle (Sun/Moon icon) using the same self-contained
  `isDark` state pattern as the current LandingPage — page-local, defaults to
  light, independent of the dashboard's ThemeContext
- "Login" button — links to `/login`, violet pill with ArrowRight icon (unchanged
  from current page)
- On mobile: hamburger menu with slide-down drawer, same links + Login button
- Use GSAP for initial load animation (fade down from top, 0.8s delay)
- useGSAP hook from @gsap/react

---

## 3. HeroSection.tsx (Client Component)

Full viewport height (h-screen), on a **permanently dark background**
(`bg-[#030712]`) regardless of the page's light/dark toggle — the toggle only
affects sections below the fold. Subtle violet radial gradient behind the text,
consistent with the current hero's glow.

2-column layout:
- Left column (~55%): HeroText — headline, subheadline, trust badges
- Right column (~45%): glass "Book a Free Demo" lead-capture form — carry over
  the exact fields, validation, and success state from the current Hero
  (institutionName, yourName, phone, institutionType select; on submit, swap
  the form for the green "Demo booked! We'll WhatsApp you within 2 hours."
  confirmation)
- HeroScene (Three.js canvas) renders as a full-bleed ambient background layer
  behind BOTH columns — not confined to one side

HeroText animations (GSAP):
- Headline: "The Academic ERP that actually works." (same copy as current page)
  Split into words, each word animates up from y:40 opacity:0 to y:0 opacity:1
  Stagger: 0.08s between words
  Ease: "power3.out"
  Duration: 0.8s per word
- Subheadline: fade in after headline completes, y:20 → y:0 (reuse current subheadline copy)
- Trust badges (UGC/AICTE Ready, Razorpay Built-in, DPDP 2023 Compliant, Hosted
  in India): scale from 0.8 → 1, stagger 0.1s — replaces the generic
  "1.4B+ Students / 42,000+ Colleges" stat pills, which don't reflect Aura's
  actual positioning
- Demo form panel: fade + slide in from the right (x:40 → 0), after the headline completes
- All triggered on mount with useGSAP

---

## 4. HeroScene.tsx — Three.js (CRITICAL SECTION)
This is the hero's ambient background layer. Dynamically imported with ssr: false,
rendered full-bleed behind both the HeroText and the demo form panel (lowest z-index).

Concept: 3D Glassmorphism Dashboard Cards floating in space with mouse parallax.
Three floating rectangular cards at different depths (z-axis), slightly tilted,
representing real Aura dashboard panels.

Implementation with React Three Fiber:

```tsx
// Three cards representing Aura modules
// Card 1 (front, center-left): Shows timetable grid UI (texture/shader)
// Card 2 (mid, left): Fee payments summary
// Card 3 (back, far left): Attendance analytics
// Bias all three cards toward the left/center of the viewport so they don't
// visually clash with the demo form panel on the right — the form must remain
// the clearest, most legible element in the hero

// Each card:
// - RoundedBox geometry (slightly rounded corners)
// - MeshPhysicalMaterial with:
//     transmission: 0.6 (glass effect)
//     roughness: 0.1
//     metalness: 0
//     thickness: 0.5
//     envMapIntensity: 1
//     color: #7C3AED (violet tinted)
// - Subtle violet point light behind cards

// Mouse parallax:
// - Track mouse position with useFrame
// - Smoothly rotate card group toward mouse
// - Max rotation: ±5 degrees (subtle, Apple-style)
// - lerp factor: 0.05 (very smooth)

// Floating animation:
// - Each card has slight sine wave Y position oscillation
// - Different phase offsets so they don't all move together
// - Amplitude: 0.1 units, frequency: 0.5

// On scroll: cards drift away (z: -2) and fade out
// Use ScrollTrigger scrub connected to group position

// Lighting:
// - Ambient light: 0.3 intensity, white
// - Point light: violet (#7C3AED), intensity 2, position [2, 3, 4]
// - Point light: emerald (#10B981), intensity 0.5, position [-3, -1, 2]

// Environment: use @react-three/drei Environment preset="city"
// Canvas settings: gl={{ antialias: true, alpha: true }}
// Background: transparent (canvas sits over dark hero bg)
```

Mobile handling:
- If window.innerWidth < 768: don't render canvas at all
- Return null on mobile (save performance)

Loading:
- Show a simple violet pulsing orb placeholder while Three.js loads
- Once loaded, fade canvas in with opacity transition

---

## 5. FeaturesSection.tsx — Horizontal Scroll Pin
This is the signature Awwwards section.

Implementation:

- Container: h-screen, overflow-hidden, position: sticky
- Inner track: flex row of feature panels, width: (number_of_panels × 100vw)
- GSAP ScrollTrigger:
    trigger: container
    start: "top top"
    end: () => "+=" + (panels.length - 1) * window.innerWidth
    pin: true
    scrub: 1 (smooth scrub, not instant)
    anticipatePin: 1
- As scrub progresses, translateX the inner track leftward
- Each panel clips in with opacity from 0.4 → 1 as it enters center

Feature panels (8 total) — mapped to Aura's actually-built modules. Reuse the
icons, gradient colors, and descriptions from the `FEATURES` array in the
current LandingPage.tsx wherever they overlap:

1) Smart Timetable & AI Scheduler — drag-and-drop builder + Python OR-Tools engine, conflict-free
2) Finance & Fee Management — Razorpay integration, concessions, staff payroll, live reports
3) Student Portal — attendance rings, fee ledger, results & CIA marks, syllabus tracking
4) Staff Portal — personal timetable, leave management, digital payslips
5) Attendance System — NFC + manual marking, real-time session summaries
6) CIA / Continuous Assessment — formula-driven internal assessment ledger
7) Accreditation Reports — one-click NAAC / NIRF / NBA compliance exports
8) Mobile App — NFC, CCTV, push notifications (coming soon badge — Phase 8 on the roadmap)

Each FeaturePanel:

- Full viewport width and height
- Two-column: left = text content, right = UI mockup screenshot/illustration
- Panel bg alternates: dark (#030712) and slightly lighter (#0F172A)
- Feature number: large faded background text (e.g. "01")
- Icon: Lucide icon in violet circle
- Headline: 48px, white, bold
- Description: 18px, slate-400
- 3 bullet points with emerald checkmarks
- "Learn more" link with arrow
- Right side: Tailwind-coded UI mockup of that feature (no images needed — code the UI as actual components with fake data)

---

## 6. StatsSection.tsx

- Background: white / `dark:bg-slate-950` — respects the page's light/dark
  toggle (contrast break from the permanently-dark hero)
- 4 stats in a row, using Aura's real numbers from the current stats bar —
  do NOT use generic market-size placeholders:
    - 30+ — Modules
    - NAAC 1–7 — Criteria Covered
    - ₹0 — Setup Fee
    - Same-Day — Onboarding
- On scroll into view (ScrollTrigger):
    - Numeric stats count up from 0 using GSAP to final value; "NAAC 1–7" and
      "Same-Day" fade/scale in instead of counting
    - Duration: 2s, ease: "power2.out"
    - Use GSAP.to() with onUpdate to update DOM
- Below stats: testimonial carousel + workflow marquee, carried over from the
  current "Social proof" section (`TESTIMONIALS` and `MARQUEE_ITEMS` arrays)
- Section entrance: fade up from y:60

---

## 7. AccreditationSection.tsx (NEW)
Carried over from the current "naac" section (`id="naac"`) — not present in
the original template, but required so the Navbar's "Accreditation" link still
resolves and the NAAC positioning isn't lost.

- Headline: reuse current section's framing of Aura's NAAC/accreditation alignment
- Card grid or table: NAAC criterion code → requirement label → Aura module
  that satisfies it — reuse the `ACCREDITATION` array from LandingPage.tsx
  (8 rows, e.g. "1.2 Student Projects & Internships → Internship Tracker",
  "2.6 Student Performance & Learning Outcomes → CIA + Exam + Results")
- On scroll: cards/rows animate in one by one (y:20 → 0, stagger 0.08s)
- Anchor `id="naac"`

---

## 8. ComparisonSection.tsx

- Table: Aura vs Legacy ERP — reuse the 9 rows from the current `COMPARE` array
  (Setup & Go Live, Onboarding, Accreditation-Ready, Student & Staff Portal,
  Mobile Responsive, Real-time Updates, Multi-Institution, Tech Stack, Total Cost)
- 2-column layout (Legacy ERP vs Aura), matching current content
- On scroll: rows animate in one by one (y:20 → 0, stagger 0.08s)
- Aura column: violet header, checkmarks in emerald
- Legacy column: rose-tinted text for the "old way" descriptions
- Mobile: horizontal scroll on table
- Anchor `id="why"`

---

## 9. PricingSection.tsx

- 3 pricing cards: Starter, Growth (highlighted), Enterprise — reuse the exact
  tiers, prices, billing toggle, and feature lists from the current "pricing"
  section (`id="pricing"`); do not invent new pricing
- On scroll: cards scale from 0.92 → 1 with stagger 0.12s
- Growth card: violet border glow (box-shadow: 0 0 40px rgba(124,58,237,0.3))
- Annual/monthly toggle (client-side, no GSAP needed)
- Anchor `id="pricing"`

---

## 10. TechStackSection.tsx (NEW)
Carried over from the current "tech" section (`id="tech"`) — not present in
the original template, but required so the Navbar's "Tech Stack" link still
resolves.

- Compact horizontal strip (not a full pinned scroll section) — "Built on a
  modern, open stack" framing
- Cards for each entry in the current `TECH` array (Next.js 16, Supabase,
  TypeScript, Tailwind CSS v4, PostgreSQL + RLS, Vercel Edge) — reuse badges,
  role descriptions, and light/dark color tokens as-is
- On scroll: cards fade + scale in with stagger 0.08s
- Anchor `id="tech"`

---

## 11. CTASection.tsx

- Full-screen section: bg-gradient-to-br from-violet-900 to-purple-900
- On scroll into view: background animates in with clip-path
- clip-path from "circle(0% at 50% 50%)" → "circle(150% at 50% 50%)"
- Duration: 1.2s, ease: "power3.inOut"
- Large white headline: "Stop managing chaos. Start running your institution."
- Two buttons:
    - "Book Your Free Demo" (white) — Lenis-scrolls back up to the Hero's
      lead-capture form (no separate form)
    - "View Pricing" (outline white) — Lenis-scrolls to PricingSection
- Subtle floating particle background (CSS only, no Three.js)
- Anchor `id="contact"`

---

## 12. Footer.tsx
Before implementing, read the current Footer + "contact" section
(`id="contact"`, end of LandingPage.tsx) and the floating WhatsApp button
(`waPulse` animation/`wa-pulse` class) — both must be preserved:

- Standard footer: logo, nav links, copyright
- Floating WhatsApp contact button: fixed bottom-right, pulsing ring animation
  (reuse the `waPulse` keyframes), links out using the existing
  `NEXT_PUBLIC_WHATSAPP_NUMBER` env var
- Respect `prefers-reduced-motion` for the pulse animation

---

## 13. Accessibility & Performance Rules

- All GSAP animations must check:
- if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) → skip animations
- Three.js canvas: lazy loaded, ssr:false, never blocks page render
- Images: next/image with priority on hero
- Fonts: next/font/google (Inter for body, no external font requests)
- Core Web Vitals targets: LCP < 2.5s, CLS < 0.1, FID < 100ms
- Use will-change: transform only on actively animating elements, remove after animation
- Kill all ScrollTrigger instances in useEffect cleanup
- Kill all Lenis on unmount

---

## 14. Responsive Breakpoints

Mobile (<768px):

    - Three.js hero: DISABLED (return null)
    - Hero: full width text, static gradient background, demo form stacks below HeroText
    - Horizontal scroll: DISABLED → vertical stacked panels instead
    - All GSAP animations: reduced (simpler fade-in only)
    - Navbar: hamburger menu

Tablet (768-1024px):

    - Three.js hero: simplified (1 card, lower pixel ratio)
    - Horizontal scroll: enabled but panels are wider
    - Grid: 2 columns max

Desktop (1024+):

    - Full experience
    - Three.js: full quality

---

## 15. GSAP Registration (Important for Next.js)
Create src/lib/gsap.ts:
```typescript
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP)
}

export { gsap, ScrollTrigger, useGSAP }
```

Always import GSAP from this file, never directly from 'gsap'.
This prevents SSR registration errors in Next.js.

---

## 16. Page Assembly — src/components/landing/LandingPage.tsx

`'use client'` — this whole tree is client-rendered (GSAP/Lenis/Three.js all
require it). Keep the same named export `LandingPage` that `src/app/page.tsx`
already imports — no changes needed at the import site.

```tsx
'use client'

import { SmoothScrollProvider } from './SmoothScrollProvider'
import { Navbar } from './Navbar'
import { HeroSection } from './Hero/HeroSection'
import { StatsSection } from './Stats/StatsSection'
import { FeaturesSection } from './Features/FeaturesSection'
import { AccreditationSection } from './Accreditation/AccreditationSection'
import { ComparisonSection } from './Comparison/ComparisonSection'
import { PricingSection } from './Pricing/PricingSection'
import { TechStackSection } from './TechStack/TechStackSection'
import { CTASection } from './CTA/CTASection'
import { Footer } from './Footer'

export function LandingPage() {
  return (
    <SmoothScrollProvider>
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <AccreditationSection />
      <ComparisonSection />
      <PricingSection />
      <TechStackSection />
      <CTASection />
      <Footer />
    </SmoothScrollProvider>
  )
}
```

---

## After Building All Files:
- Run: npm install (install all new packages)
- Run: npm run dev
- Test scroll animations in browser
- Test on mobile viewport (Chrome DevTools)
- Test both light and dark mode toggle — sections below the Hero must respect
  it; the Hero itself stays permanently dark
- Run: npx tsc --noEmit --skipLibCheck
- Run: npm run build
- Fix any type/build errors
- git add -A
- git commit -m "feat: Awwwards-level landing page rebuild with GSAP + Three.js + Lenis"
- git push origin main
