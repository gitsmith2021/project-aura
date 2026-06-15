# AURA CORE — Shared Platform Services

**Purpose.** Define the reusable platform services every Aura product consumes, so products don't re-implement identity, audit, notifications, etc.

**Scope.** Core architecture + roadmap and one document per shared service: Identity (auth/RBAC/multi-tenancy), Connect (notifications), Audit, Docs (document/storage), Flow (workflow/approvals), Insights (analytics), AI, Mobile (shared app shell), and the Vision service (CCTV/GPS intelligence offered as a service).

**Ownership.** Platform / core engineering.

**Relationship to other areas.** Consumed by all products. Today these capabilities live *inside* Aura Campus (`src/`); these docs describe how they will be extracted into shared services as the portfolio grows. Strategy comes from [AURA](../AURA/); Campus is the first consumer ([AURA_CAMPUS](../AURA_CAMPUS/)).
