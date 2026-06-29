# Company — UX Philosophy

## Purpose

The experience principles that make Aura feel coherent, calm, and trustworthy across every role and product. Derived from patterns already shipped in Aura Campus.

## Current State

A consistent, token-driven design system with role-adaptive shells (admin, staff, student, parent, alumni portals) and a deliberate visual language (glassmorphism, violet accents, light/dark rhythm).

## Implementation — principles (observed in the product)

1. **One system, many roles.** Each stakeholder gets a fenced, purpose-built shell, but they share one design language (tokens, spacing, components). The middleware routes each role to its home and keeps them in their lane.

2. **Calm, not cluttered.** Generous spacing, clear hierarchy (heavy headings, quiet body), and a restrained palette. Surfaces and borders come from semantic tokens so light/dark is automatic and consistent.

3. **Consistency is a feature.** Repeatable patterns instead of one-offs:
   - Institution pages wrap in `<DashboardLayout>` and use `w-full` (not `max-w-*`).
   - Forms and modals **slide in from the right** as drawers (`animate-in slide-in-from-right`), never centered modals.

4. **Honest, legible data.** Real numbers, clear KPIs, accessible charts (Recharts). Empty and error states explain what happened and what to do next.

5. **Resilient by default.** Degraded modes are designed, not accidental — e.g. the amber "AI Scheduler is offline" banner with manual scheduling still available.

6. **Respect attention and device.** Mobile-first responsiveness; motion (GSAP/Lenis) used purposefully and disabled under `prefers-reduced-motion`.

7. **Trust shown, not shouted.** Security/compliance and privacy (consent banner, privacy policy) are present and calm.

## Future Roadmap

- Codify the system into a shared `@aura/ui` package (tokens, components, motion, a11y) so Build/Field inherit it.
- Publish accessibility targets (WCAG AA) and verify contrast/keyboard/screen-reader coverage.

## Related Documents

- [Brand Guidelines](../branding/Brand Guidelines.md) · [Colours](../branding/Colours.md) · [Coding Standards](../developer/Coding Standards.md) · [Core Principles](Core Principles.md)

## Last Updated

2026-06-29

## Owner

Design / Brand · Founder & Leadership
