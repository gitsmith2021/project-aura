I am rebuilding the Aura 1.0 landing page to Awwwards level quality.
Read AURA_ROADMAP.md for full project context first.

## Goal
Build a stunning, fully responsive, Awwwards-quality landing page for Aura 1.0
using GSAP, ScrollTrigger, Lenis smooth scroll, and Three.js (via React Three Fiber).
Animation style: Subtle & professional — Apple.com level. No gimmicks. Every 
animation must serve the message.

## Tech Stack
- Next.js 15 App Router (existing project)
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

src/app/(landing)/
├── page.tsx                          ← Main landing page (Server Component)
├── layout.tsx                        ← Landing layout with Lenis provider
└── _components/
├── SmoothScrollProvider.tsx      ← Lenis initialization
├── Navbar.tsx                    ← Sticky nav with scroll-aware styling
├── Hero/
│   ├── HeroSection.tsx           ← Hero wrapper (Client Component)
│   ├── HeroScene.tsx             ← Three.js canvas (dynamically imported)
│   └── HeroText.tsx              ← GSAP word-by-word headline reveal
├── Features/
│   ├── FeaturesSection.tsx       ← Horizontal scroll pin container
│   └── FeaturePanel.tsx          ← Individual feature card
├── Stats/
│   └── StatsSection.tsx          ← Animated number counters
├── Problem/
│   └── ProblemSection.tsx        ← Problem cards fly-in
├── Comparison/
│   └── ComparisonSection.tsx     ← Aura vs legacy ERP table
├── Pricing/
│   └── PricingSection.tsx        ← Pricing cards with stagger
├── CTA/
│   └── CTASection.tsx            ← Final call to action
└── Footer.tsx                    ← Footer

---

## 1. SmoothScrollProvider.tsx

- Initialize Lenis with: duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
- Connect Lenis to GSAP ticker: gsap.ticker.add((time) => lenis.raf(time * 1000))
- gsap.ticker.lagSmoothing(0)
- Provide lenis instance via React context
- Must be a Client Component ('use client')
- Wrap children with it

---

## 2. Landing Layout — src/app/(landing)/layout.tsx

- Import SmoothScrollProvider
- Wrap page content in SmoothScrollProvider
- Separate layout from the main app layout (no sidebar/auth nav)
- Clean, full-width layout

---

## 3. Navbar.tsx
Apple-style sticky nav:
- Transparent on mount
- On scroll past 80px: backdrop-blur-xl bg-white/80 border-b border-white/20
- Transition: smooth 300ms
- Logo: "AURA" with violet gradient text
- Nav links: Features, Accreditation, Pricing, Contact
- CTA button: "Schedule a Demo" (violet gradient pill)
- On mobile: hamburger menu with slide-down drawer
- Use GSAP for initial load animation (fade down from top, 0.8s delay)
- useGSAP hook from @gsap/react

---

## 4. HeroSection.tsx (Client Component)
Structure:
- Full viewport height (h-screen)
- Left side (60%): HeroText component
- Right side (40%): HeroScene (Three.js canvas)
- Dark background: bg-[#030712] (near black)
- Subtle violet radial gradient behind the text

HeroText animations (GSAP):
- Headline: "The Academic ERP that actually works."
  Split into words, each word animates up from y:40 opacity:0 to y:0 opacity:1
  Stagger: 0.08s between words
  Ease: "power3.out"
  Duration: 0.8s per word
- Subheadline: fade in after headline completes, y:20 → y:0
- Stat pills (1.4B+ Students, 42,000+ Colleges): scale from 0.8 → 1, stagger 0.1s
- CTA buttons: fade up last
- All triggered on mount with useGSAP

---

## 5. HeroScene.tsx — Three.js (CRITICAL SECTION)
This is the hero 3D element. Dynamically imported with ssr: false.

Concept: 3D Glassmorphism Dashboard Cards floating in space with mouse parallax.
Three floating rectangular cards at different depths (z-axis), slightly tilted,
representing real Aura dashboard panels.

Implementation with React Three Fiber:

```tsx
// Three cards representing Aura modules
// Card 1 (front, center): Shows timetable grid UI (texture/shader)
// Card 2 (mid, slightly right): Fee payments summary
// Card 3 (back, left): Attendance analytics

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

## 6. FeaturesSection.tsx — Horizontal Scroll Pin
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

Feature panels (8 total):

1) Smart Timetable — AI scheduler, conflict-free
2) Finance & Fees — Razorpay integration, live payments
3) Student Portal — Attendance rings, fee ledger
4) Staff Portal — Schedule, leave management, payslips
5) Attendance System — NFC + manual, real-time
6) NAAC Reports — One-click accreditation exports
7) AI Scheduler — Python OR-Tools engine
8) Mobile App — NFC, CCTV, push notifications (coming soon badge)

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

## 7. StatsSection.tsx

- Background: white (contrast break from dark sections)
- 4 stats in a row: 1.4B+ Students, 42,000+ Colleges, 87 Modules, ₹100Cr+ ARR
- On scroll into view (ScrollTrigger):
    - Numbers count up from 0 using GSAP to final value
    - Duration: 2s, ease: "power2.out"
    - Use GSAP.to() with onUpdate to update DOM
- Below stats: "Trusted by institutions across India" with logo placeholder row
- Section entrance: fade up from y:60

---

## 8. ProblemSection.tsx

- Headline: "Most institutions are managing academics on tools never designed for it."
- 4 problem cards in 2x2 grid
- On scroll: cards fly in from alternating sides (left cards from x:-60, right from x:60)
- Stagger: 0.15s
- Each card: dark bg, icon, problem title, 2-line description
- Bottom: "Aura replaces all of this." — emerald text, centered

---

## 9. ComparisonSection.tsx

- Table: Aura vs Legacy ERP vs Generic SaaS
- On scroll: rows animate in one by one (y:20 → 0, stagger 0.08s)
- Aura column: violet header, checkmarks in emerald
- Others: X marks in rose
- 8 comparison rows matching the pitch deck
- Mobile: horizontal scroll on table

---

## 10. PricingSection.tsx

- 3 pricing cards: Starter, Growth (highlighted), Enterprise
- On scroll: cards scale from 0.92 → 1 with stagger 0.12s
- Growth card: violet border glow (box-shadow: 0 0 40px rgba(124,58,237,0.3))
- Annual/monthly toggle (client-side, no GSAP needed)
- Each card: price, description, feature list, CTA button

---

## 11. CTASection.tsx

- Full-screen section: bg-gradient-to-br from-violet-900 to-purple-900
- On scroll into view: background animates in with clip-path
- clip-path from "circle(0% at 50% 50%)" → "circle(150% at 50% 50%)"
- Duration: 1.2s, ease: "power3.inOut"
- Large white headline: "Stop managing chaos. Start running your institution."
- Two buttons: "Schedule a Free Demo" (white), "See All Features" (outline white)
- Subtle floating particle background (CSS only, no Three.js)

---

## 12. Accessibility & Performance Rules

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

## 13. Responsive Breakpoints

Mobile (<768px):

    - Three.js hero: DISABLED (return null)
    - Hero: full width text, static gradient background
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

## 14. GSAP Registration (Important for Next.js)
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

## 15. Page Assembly — src/app/(landing)/page.tsx
```tsx
// Server Component — no 'use client'
import Navbar from './_components/Navbar'
import HeroSection from './_components/Hero/HeroSection'
import StatsSection from './_components/Stats/StatsSection'
import ProblemSection from './_components/Problem/ProblemSection'
import FeaturesSection from './_components/Features/FeaturesSection'
import ComparisonSection from './_components/Comparison/ComparisonSection'
import PricingSection from './_components/Pricing/PricingSection'
import CTASection from './_components/CTA/CTASection'
import Footer from './_components/Footer'

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <StatsSection />
      <ProblemSection />
      <FeaturesSection />
      <ComparisonSection />
      <PricingSection />
      <CTASection />
      <Footer />
    </main>
  )
}
```

---

## After Building All Files:
- Run: npm install (install all new packages)
- Run: npm run dev
- Test scroll animations in browser
- Test on mobile viewport (Chrome DevTools)
- Run: npx tsc --noEmit
- Fix any type errors
- git add -A
- git commit -m "feat: Awwwards-level landing page with GSAP + Three.js + Lenis"
- git push origin main