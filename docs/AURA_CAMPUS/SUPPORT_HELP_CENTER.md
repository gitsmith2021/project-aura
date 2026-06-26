# 🛟 AURA CAMPUS™ — Support & Help Center (Phase 9H)

> The support model for Aura Campus customers: channels, SLAs, the knowledge-base
> strategy, ticket triage, and escalation. Audience: the support team + a
> reference customers can be pointed to.
>
> **Pairs with:** [TRAINING_MATERIALS.md](TRAINING_MATERIALS.md) (self-serve answers) ·
> [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) (ops/runbook) ·
> [../DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md) (incident recovery).
> **Last updated:** 2026-06-26

---

## 1. Support channels

| Channel | Use for | Notes |
|---------|---------|-------|
| **WhatsApp** | Quick questions, demo/pilot contact | `wa.me/919884722295` (landing button) |
| **Email** | Tickets, formal requests, billing | route to a shared support inbox (Resend-backed) |
| **In-app Help** | Self-serve answers, contextual tips | seed from [TRAINING_MATERIALS.md](TRAINING_MATERIALS.md) FAQ |
| **Knowledge Base** | How-to articles, troubleshooting | **dogfood the Knowledge Hub** (see §3) |
| **Implementation contact** | Onboarding-phase customers | named implementation lead during go-live |

> **Self-serve first:** most "how do I…" questions are answered by the role
> quickstarts and cheat-sheets in [TRAINING_MATERIALS.md](TRAINING_MATERIALS.md).
> Point users there before opening a ticket.

---

## 2. Support tiers & SLA (proposed)

> Targets, not contractual guarantees. **Enterprise SLA is per contract**
> (see [PRICING_STRATEGY.md](PRICING_STRATEGY.md)); Essential/Professional use
> the standard targets below. Tune to capacity before publishing externally.

| Severity | Definition | First response | Target resolution |
|----------|-----------|----------------|-------------------|
| **S1 — Critical** | Platform down, data-loss risk, payments broken, tenant data exposure | 1 hour (business) | ASAP, continuous until mitigated |
| **S2 — High** | Major feature unusable (timetable, fees, attendance), no workaround | 4 business hours | 2 business days |
| **S3 — Normal** | Feature issue with a workaround; how-to that self-serve didn't cover | 1 business day | 5 business days |
| **S4 — Low** | Cosmetic, enhancement request, question | 2 business days | best-effort / backlog |

**Business hours:** define per region (default IST). S1 outages follow the
**incident path** (§5), not the normal ticket queue.

---

## 3. Knowledge Base strategy — dogfood the Knowledge Hub

Aura Campus ships a Knowledge Hub (Phase 7X). Use it as the customer-facing KB so
support content lives in the product it documents:

- **Structure by audience:** Getting Started · Admin · Faculty · Student/Parent · Ops/IT · Accreditation.
- **Seed content from existing docs:** role quickstarts + FAQ ([TRAINING_MATERIALS.md](TRAINING_MATERIALS.md)), import help ([ONBOARDING_TOOLKIT.md](ONBOARDING_TOOLKIT.md)), "AI Scheduler offline" & payment troubleshooting.
- **Search:** KB articles ride the Knowledge Hub full-text search (KH-2).
- **Maintain:** every resolved S2+ ticket that wasn't already covered → a new KB article (close the loop).
- **Optional (add-on):** the Knowledge Hub AI assistant (KH-5) can answer over KB content where Anthropic credit is funded — not required for core support.

---

## 4. Ticket lifecycle & triage

```
New → Triaged (severity set) → In Progress → (Needs info ⇄ customer) → Resolved → Closed
                                   │
                                   └── escalate (S1/S2 or stuck) → §5
```

**On every ticket capture:** institution (tenant) · role of reporter · affected
area (module/page) · severity · steps to reproduce · screenshot · expected vs.
actual. **Triage by area** to the right owner:

| Area | Likely cause / first check |
|------|----------------------------|
| Scheduler "offline" | Railway `/health`; `SCHEDULER_API_*` env — [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) §2 |
| Payments not reflecting | `RAZORPAY_WEBHOOK_SECRET` + live keys; webhook log |
| Import skipped rows | CSV vs. importer rules — [ONBOARDING_TOOLKIT.md](ONBOARDING_TOOLKIT.md) §4 |
| Wrong-institution data / empty page | confirm role & tenant; RLS scopes data per tenant |
| Email not sending | `RESEND_API_KEY` + verified sender domain |
| Login / access | role/tenant membership; first-login onboarding redirect |

---

## 5. Escalation & incident path

- **S1 / suspected outage or data exposure** → declare an incident; follow the recovery ladder + incident table in [../DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md). Don't sit in the normal queue.
- **Security event** (suspected leak, breach, exposed secret) → rotate per the DR incident table; preserve the audit trail (`audit_logs` is immutable, A8).
- **Billing dispute** → operator console `/admin/billing` (invoices, subscription status).
- **Engineering bug** → reproduce on the demo tenant, capture details, file with severity; **scheduler is feature-frozen** (production-issue fixes only).

**Escalation ladder:** L1 support → L2 implementation/ops → L3 engineering/on-call.

---

## 6. Support readiness checklist (before launch)

- [ ] Shared support inbox + WhatsApp number live and monitored
- [ ] In-app Help seeded with the FAQ ([TRAINING_MATERIALS.md](TRAINING_MATERIALS.md) §3)
- [ ] KB seeded in the Knowledge Hub (§3) with Getting Started + top 10 articles
- [ ] SLA targets (§2) tuned to capacity and published to customers
- [ ] Triage owners assigned per area (§4)
- [ ] Incident path rehearsed against [../DISASTER_RECOVERY.md](../DISASTER_RECOVERY.md)
- [ ] Status/monitoring (UptimeRobot) visible to support for proactive alerts

*Phase 9H · Support & Help Center — makes Aura Campus supportable. Self-serve via
Training + the Knowledge Hub KB; tickets and incidents have clear triage and
escalation paths.*
